import { PrismaClient } from '@prisma/client';
import { ScheduleRepository } from '../repositories/ScheduleRepository.js';
import type {
  CreateDailyScheduleInput,
  UpdateDailyScheduleInput,
  CreateScheduleItemInput,
  UpdateScheduleItemInput,
  ScheduleFilterInput,
  ScheduleAnalyticsFilterInput
} from '../schemas/scheduleSchemas.js';
import type { ScheduleItemType, ScheduleItemStatus, Priority } from '@prisma/client';

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  availability: 'free' | 'busy' | 'tentative';
}

interface ScheduleSuggestion {
  id: string;
  taskId: string;
  suggestedSlots: TimeSlot[];
  reason: string;
  confidence: number;
  factors: string[];
}

interface ConflictResolution {
  type: 'move' | 'resize' | 'split' | 'cancel';
  targetItemId: string;
  newTimeSlot?: TimeSlot;
  description: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Schedule Service
 * スケジュール関連のビジネスロジック層
 */
export class ScheduleService {
  private scheduleRepository: ScheduleRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.scheduleRepository = new ScheduleRepository(prisma);
  }

  // ===== Daily Schedule Operations =====

  /**
   * 指定日のスケジュールを取得
   */
  async getDailySchedule(userId: string, date: Date) {
    const schedule = await this.scheduleRepository.getDailySchedule(userId, date);
    
    if (!schedule) {
      // スケジュールが存在しない場合は作成
      return await this.scheduleRepository.createDailySchedule(userId, date);
    }

    return schedule;
  }

  /**
   * スケジュール期間取得
   */
  async getScheduleRange(userId: string, startDate: Date, endDate: Date) {
    // 最大31日間の制限
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 31) {
      throw new Error('スケジュール期間は最大31日間までです');
    }

    const schedules = await this.scheduleRepository.getScheduleRange(userId, startDate, endDate);
    
    // 期間内の全ての日付でスケジュールを作成
    const existingDates = new Set(
      schedules.map(s => s.date.toISOString().split('T')[0])
    );

    const missingSchedules = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!existingDates.has(dateStr)) {
        const newSchedule = await this.scheduleRepository.createDailySchedule(userId, new Date(currentDate));
        missingSchedules.push(newSchedule);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return [...schedules, ...missingSchedules].sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
  }

  /**
   * 日次スケジュール更新
   */
  async updateDailySchedule(userId: string, date: Date, updates: UpdateDailyScheduleInput) {
    // 稼働時間の妥当性チェック
    if (updates.workingHoursStart && updates.workingHoursEnd) {
      const startMinutes = this.timeToMinutes(updates.workingHoursStart);
      const endMinutes = this.timeToMinutes(updates.workingHoursEnd);
      
      if (startMinutes >= endMinutes) {
        throw new Error('開始時間は終了時間より前である必要があります');
      }

      // 最低4時間、最大16時間の制限
      const workingMinutes = endMinutes - startMinutes;
      if (workingMinutes < 240 || workingMinutes > 960) {
        throw new Error('稼働時間は4時間以上16時間以下で設定してください');
      }
    }

    return await this.scheduleRepository.updateDailySchedule(userId, date, updates);
  }

  // ===== Schedule Item Operations =====

  /**
   * スケジュールアイテム作成
   */
  async createScheduleItem(userId: string, input: CreateScheduleItemInput) {
    // 日次スケジュールの存在確認
    const dailySchedule = await this.prisma.dailySchedule.findUnique({
      where: { id: input.dailyScheduleId }
    });

    if (!dailySchedule) {
      throw new Error('指定された日次スケジュールが見つかりません');
    }

    if (dailySchedule.userId !== userId) {
      throw new Error('他のユーザーのスケジュールにはアイテムを追加できません');
    }

    // 時間の妥当性チェック
    const duration = this.calculateDuration(input.startTime, input.endTime);
    if (duration <= 0) {
      throw new Error('開始時間は終了時間より前である必要があります');
    }

    // タスクとの関連チェック
    if (input.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: input.taskId }
      });

      if (!task) {
        throw new Error('指定されたタスクが見つかりません');
      }
    }

    // 重複チェック
    const conflicts = await this.checkScheduleConflicts(
      input.dailyScheduleId, 
      input.startTime, 
      input.endTime
    );

    if (conflicts.length > 0) {
      throw new Error(`時間が重複するスケジュールアイテムがあります: ${conflicts.join(', ')}`);
    }

    return await this.scheduleRepository.createScheduleItem({
      ...input,
      createdBy: userId
    });
  }

  /**
   * スケジュールアイテム更新
   */
  async updateScheduleItem(userId: string, itemId: string, updates: UpdateScheduleItemInput) {
    // アイテムの存在確認と権限チェック
    const existingItem = await this.prisma.scheduleItem.findUnique({
      where: { id: itemId },
      include: {
        dailySchedule: true
      }
    });

    if (!existingItem) {
      throw new Error('スケジュールアイテムが見つかりません');
    }

    if (existingItem.dailySchedule.userId !== userId) {
      throw new Error('他のユーザーのスケジュールアイテムは更新できません');
    }

    // ロックされたアイテムの時間変更チェック
    if (existingItem.isLocked && (updates.startTime || updates.endTime)) {
      throw new Error('ロックされたアイテムの時間は変更できません');
    }

    // 時間更新の場合の重複チェック
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime || existingItem.startTime;
      const endTime = updates.endTime || existingItem.endTime;
      
      const conflicts = await this.checkScheduleConflicts(
        existingItem.dailyScheduleId,
        startTime,
        endTime,
        itemId // 自分自身は除外
      );

      if (conflicts.length > 0) {
        throw new Error(`時間が重複するスケジュールアイテムがあります: ${conflicts.join(', ')}`);
      }
    }

    // タスク関連の更新チェック
    if (updates.taskId !== undefined) {
      if (updates.taskId && updates.taskId !== existingItem.taskId) {
        const task = await this.prisma.task.findUnique({
          where: { id: updates.taskId }
        });

        if (!task) {
          throw new Error('指定されたタスクが見つかりません');
        }
      }
    }

    return await this.scheduleRepository.updateScheduleItem(itemId, updates);
  }

  /**
   * スケジュールアイテム削除
   */
  async deleteScheduleItem(userId: string, itemId: string) {
    // アイテムの存在確認と権限チェック
    const existingItem = await this.prisma.scheduleItem.findUnique({
      where: { id: itemId },
      include: {
        dailySchedule: true
      }
    });

    if (!existingItem) {
      throw new Error('スケジュールアイテムが見つかりません');
    }

    if (existingItem.dailySchedule.userId !== userId) {
      throw new Error('他のユーザーのスケジュールアイテムは削除できません');
    }

    // ロックされたアイテムの削除チェック
    if (existingItem.isLocked) {
      throw new Error('ロックされたアイテムは削除できません');
    }

    await this.scheduleRepository.deleteScheduleItem(itemId);
  }

  /**
   * スケジュールアイテムのバルク更新
   */
  async bulkUpdateScheduleItems(
    userId: string, 
    itemIds: string[], 
    updates: { status?: ScheduleItemStatus; priority?: Priority; completionRate?: number }
  ) {
    // 全てのアイテムの権限確認
    const items = await this.prisma.scheduleItem.findMany({
      where: { id: { in: itemIds } },
      include: { dailySchedule: true }
    });

    if (items.length !== itemIds.length) {
      throw new Error('一部のスケジュールアイテムが見つかりません');
    }

    const unauthorizedItems = items.filter(item => item.dailySchedule.userId !== userId);
    if (unauthorizedItems.length > 0) {
      throw new Error('他のユーザーのスケジュールアイテムは更新できません');
    }

    return await this.scheduleRepository.bulkUpdateScheduleItems(itemIds, updates);
  }

  // ===== Advanced Features =====

  /**
   * スケジュール統計取得
   */
  async getScheduleStatistics(userId: string, date: Date) {
    return await this.scheduleRepository.calculateScheduleStatistics(userId, date);
  }

  /**
   * コンフリクト検知
   */
  async detectConflicts(userId: string, date: Date) {
    return await this.scheduleRepository.detectScheduleConflicts(userId, date);
  }

  /**
   * タスクからスケジュール作成
   */
  async createScheduleFromTask(
    userId: string, 
    taskId: string, 
    date: Date, 
    startTime: string, 
    endTime: string
  ) {
    // タスク存在確認
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('指定されたタスクが見つかりません');
    }

    // 日次スケジュールを取得または作成
    const dailySchedule = await this.getDailySchedule(userId, date);

    // スケジュールアイテムを作成
    const scheduleItem = await this.createScheduleItem(userId, {
      dailyScheduleId: dailySchedule.id,
      taskId,
      type: task.parentId ? 'SUBTASK' : 'TASK',
      title: task.title,
      description: task.description || undefined,
      startTime,
      endTime,
      color: '#3B82F6',
      priority: task.priority,
      estimatedTime: task.estimatedHours ? Math.round(task.estimatedHours * 60) : undefined
    });

    return scheduleItem;
  }

  /**
   * AI提案生成（モック実装）
   */
  async generateScheduleSuggestions(userId: string, taskId: string): Promise<ScheduleSuggestion[]> {
    // 実際の実装ではAIサービスを呼び出す
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('指定されたタスクが見つかりません');
    }

    // モックデータを返す
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
      {
        id: `suggestion-${taskId}-1`,
        taskId,
        suggestedSlots: [
          {
            date: today,
            startTime: '10:00',
            endTime: '12:00',
            availability: 'free'
          },
          {
            date: tomorrow,
            startTime: '14:00',
            endTime: '16:00',
            availability: 'free'
          }
        ],
        reason: 'あなたの集中力が最も高い時間帯で、他のタスクとの関連性も考慮しました',
        confidence: 0.85,
        factors: ['集中力ピーク時間', 'タスク優先度', 'スケジュール空き時間', '過去の完了パターン']
      }
    ];
  }

  /**
   * カレンダー統合（外部カレンダーとの同期）
   */
  async syncWithExternalCalendar(userId: string, date: Date) {
    // 実際の実装では外部カレンダーAPIを呼び出す
    console.log(`Syncing calendar for user ${userId} on ${date.toISOString()}`);
    
    // 現在は何もしない（将来的にGoogle Calendar, Outlook等と統合）
    return {
      success: true,
      message: 'Calendar sync completed',
      syncedItems: 0
    };
  }

  // ===== Helper Methods =====

  /**
   * スケジュール重複チェック
   */
  private async checkScheduleConflicts(
    dailyScheduleId: string, 
    startTime: string, 
    endTime: string, 
    excludeItemId?: string
  ): Promise<string[]> {
    const items = await this.prisma.scheduleItem.findMany({
      where: {
        dailyScheduleId,
        id: excludeItemId ? { not: excludeItemId } : undefined
      }
    });

    const conflicts = [];
    for (const item of items) {
      if (this.checkTimeOverlap(startTime, endTime, item.startTime, item.endTime)) {
        conflicts.push(item.title);
      }
    }

    return conflicts;
  }

  /**
   * 時間重複チェック
   */
  private checkTimeOverlap(
    start1: string, end1: string,
    start2: string, end2: string
  ): boolean {
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = this.timeToMinutes(end1);
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = this.timeToMinutes(end2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  }

  /**
   * 時間文字列を分に変換
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * 時間差計算（分単位）
   */
  private calculateDuration(startTime: string, endTime: string): number {
    return this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
  }
}