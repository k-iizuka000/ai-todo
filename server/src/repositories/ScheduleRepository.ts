import { PrismaClient } from '@prisma/client';
import { BaseRepository } from './base/BaseRepository.js';
import type {
  DailySchedule,
  ScheduleItem,
  TimeBlock,
  ScheduleItemType,
  ScheduleItemStatus,
  Priority
} from '@prisma/client';

type ScheduleItemWithRelations = ScheduleItem & {
  task?: {
    id: string;
    title: string;
    status: string;
  };
};

type DailyScheduleWithRelations = DailySchedule & {
  scheduleItems: ScheduleItemWithRelations[];
  timeBlocks: TimeBlock[];
};

interface ScheduleFilter {
  userId?: string;
  date?: {
    from?: Date;
    to?: Date;
  };
  projectId?: string;
  type?: ScheduleItemType[];
  status?: ScheduleItemStatus[];
  priority?: Priority[];
  timeRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

interface ScheduleStatistics {
  date: Date;
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  productiveHours: number;
  breakHours: number;
  utilizationRate: number;
  completionRate: number;
  overtimeHours: number;
  focusTime: number;
  meetingTime: number;
}

interface ConflictResult {
  id: string;
  type: 'overlap' | 'overbooked' | 'deadline';
  items: string[];
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Schedule Repository
 * スケジュール関連のデータアクセス層
 */
export class ScheduleRepository extends BaseRepository {
  constructor(protected readonly prisma: PrismaClient) {
    super(prisma);
  }

  // ===== Daily Schedule Operations =====

  /**
   * 指定日のスケジュールを取得（存在しない場合は作成）
   */
  async getDailySchedule(userId: string, date: Date): Promise<DailyScheduleWithRelations | null> {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    let schedule = await this.prisma.dailySchedule.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateOnly
        }
      },
      include: {
        scheduleItems: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        },
        timeBlocks: {
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    });

    // スケジュールが存在しない場合は作成
    if (!schedule) {
      schedule = await this.createDailySchedule(userId, dateOnly);
    }

    return schedule;
  }

  /**
   * 日次スケジュール作成
   */
  async createDailySchedule(userId: string, date: Date, projectId?: string): Promise<DailyScheduleWithRelations> {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    return await this.prisma.dailySchedule.create({
      data: {
        date: dateOnly,
        userId,
        projectId,
        workingHoursStart: '09:00',
        workingHoursEnd: '18:00',
        totalEstimated: 0,
        totalActual: 0,
        utilization: 0.0,
        timeBlocks: {
          create: this.generateTimeBlocks(dateOnly)
        }
      },
      include: {
        scheduleItems: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        },
        timeBlocks: {
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    });
  }

  /**
   * 日次スケジュール更新
   */
  async updateDailySchedule(
    userId: string, 
    date: Date, 
    updates: Partial<Pick<DailySchedule, 'projectId' | 'workingHoursStart' | 'workingHoursEnd' | 'totalEstimated' | 'totalActual' | 'utilization'>>
  ): Promise<DailyScheduleWithRelations> {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    return await this.prisma.dailySchedule.update({
      where: {
        userId_date: {
          userId,
          date: dateOnly
        }
      },
      data: updates,
      include: {
        scheduleItems: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        },
        timeBlocks: {
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    });
  }

  /**
   * 指定期間のスケジュールを取得
   */
  async getScheduleRange(userId: string, startDate: Date, endDate: Date): Promise<DailyScheduleWithRelations[]> {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    return await this.prisma.dailySchedule.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        scheduleItems: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        },
        timeBlocks: {
          orderBy: {
            startTime: 'asc'
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  // ===== Schedule Item Operations =====

  /**
   * スケジュールアイテム作成
   */
  async createScheduleItem(data: {
    dailyScheduleId: string;
    taskId?: string;
    type: ScheduleItemType;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    color?: string;
    priority?: Priority;
    estimatedTime?: number;
    isLocked?: boolean;
    isRecurring?: boolean;
    createdBy: string;
  }): Promise<ScheduleItemWithRelations> {
    const duration = this.calculateDuration(data.startTime, data.endTime);
    
    // 適切なTimeBlockを見つけるか作成
    const timeBlock = await this.findOrCreateTimeBlock(data.dailyScheduleId, data.startTime, data.endTime);
    
    const scheduleItem = await this.prisma.scheduleItem.create({
      data: {
        ...data,
        timeBlockId: timeBlock.id,
        duration,
        color: data.color || '#3B82F6',
        priority: data.priority || 'MEDIUM',
        estimatedTime: data.estimatedTime || duration,
        isLocked: data.isLocked || false,
        isRecurring: data.isRecurring || false,
        status: 'PLANNED',
        actualTime: null,
        completionRate: 0.0
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    // 統計を更新
    await this.updateScheduleStatistics(data.dailyScheduleId);
    
    return scheduleItem;
  }

  /**
   * スケジュールアイテム更新
   */
  async updateScheduleItem(
    id: string, 
    updates: Partial<Pick<ScheduleItem, 
      'taskId' | 'type' | 'title' | 'description' | 'startTime' | 'endTime' | 'color' | 
      'status' | 'priority' | 'estimatedTime' | 'actualTime' | 'completionRate' | 'isLocked' | 'isRecurring'
    >>
  ): Promise<ScheduleItemWithRelations> {
    const current = await this.prisma.scheduleItem.findUniqueOrThrow({
      where: { id }
    });

    // 時間が変更された場合、継続時間を再計算
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime || current.startTime;
      const endTime = updates.endTime || current.endTime;
      updates.duration = this.calculateDuration(startTime, endTime);
      
      // TimeBlockも更新が必要な場合は処理
      if (updates.startTime !== current.startTime || updates.endTime !== current.endTime) {
        const timeBlock = await this.findOrCreateTimeBlock(current.dailyScheduleId, startTime, endTime);
        updates.timeBlockId = timeBlock.id;
      }
    }

    const updatedItem = await this.prisma.scheduleItem.update({
      where: { id },
      data: updates,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    // 統計を更新
    await this.updateScheduleStatistics(current.dailyScheduleId);
    
    return updatedItem;
  }

  /**
   * スケジュールアイテム削除
   */
  async deleteScheduleItem(id: string): Promise<void> {
    const current = await this.prisma.scheduleItem.findUniqueOrThrow({
      where: { id }
    });

    await this.prisma.scheduleItem.delete({
      where: { id }
    });

    // 統計を更新
    await this.updateScheduleStatistics(current.dailyScheduleId);
  }

  /**
   * バルクスケジュールアイテム更新
   */
  async bulkUpdateScheduleItems(
    itemIds: string[], 
    updates: Partial<Pick<ScheduleItem, 'status' | 'priority' | 'completionRate'>>
  ): Promise<number> {
    const result = await this.prisma.scheduleItem.updateMany({
      where: {
        id: { in: itemIds }
      },
      data: updates
    });

    // 関連する全てのスケジュールの統計を更新
    const scheduleIds = await this.prisma.scheduleItem.findMany({
      where: { id: { in: itemIds } },
      select: { dailyScheduleId: true },
      distinct: ['dailyScheduleId']
    });

    await Promise.all(
      scheduleIds.map(({ dailyScheduleId }) => this.updateScheduleStatistics(dailyScheduleId))
    );

    return result.count;
  }

  // ===== Analytics & Statistics =====

  /**
   * スケジュール統計計算
   */
  async calculateScheduleStatistics(userId: string, date: Date): Promise<ScheduleStatistics> {
    const schedule = await this.getDailySchedule(userId, date);
    if (!schedule) {
      return this.getEmptyStatistics(date);
    }

    const items = schedule.scheduleItems;
    
    const totalTasks = items.filter(item => 
      item.type === 'TASK' || item.type === 'SUBTASK'
    ).length;
    
    const completedTasks = items.filter(item => 
      (item.type === 'TASK' || item.type === 'SUBTASK') && item.status === 'COMPLETED'
    ).length;
    
    const totalMinutes = items.reduce((sum, item) => sum + item.duration, 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    
    const breakMinutes = items
      .filter(item => item.type === 'BREAK')
      .reduce((sum, item) => sum + item.duration, 0);
    const breakHours = Math.round(breakMinutes / 60 * 10) / 10;
    
    const meetingMinutes = items
      .filter(item => item.type === 'MEETING')
      .reduce((sum, item) => sum + item.duration, 0);
    const meetingTime = Math.round(meetingMinutes / 60 * 10) / 10;
    
    const focusMinutes = items
      .filter(item => item.type === 'FOCUS' || item.type === 'TASK')
      .reduce((sum, item) => sum + item.duration, 0);
    const focusTime = Math.round(focusMinutes / 60 * 10) / 10;
    
    const productiveMinutes = totalMinutes - breakMinutes;
    const productiveHours = Math.round(productiveMinutes / 60 * 10) / 10;
    
    // 稼働時間から利用率を計算
    const workingMinutes = this.calculateWorkingMinutes(schedule.workingHoursStart, schedule.workingHoursEnd);
    const utilizationRate = Math.round((productiveMinutes / workingMinutes) * 100);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      date,
      totalTasks,
      completedTasks,
      totalHours,
      productiveHours,
      breakHours,
      utilizationRate,
      completionRate,
      overtimeHours: Math.max(0, totalHours - (workingMinutes / 60)), 
      focusTime,
      meetingTime
    };
  }

  /**
   * コンフリクト検知
   */
  async detectScheduleConflicts(userId: string, date: Date): Promise<ConflictResult[]> {
    const schedule = await this.getDailySchedule(userId, date);
    if (!schedule) return [];

    const conflicts: ConflictResult[] = [];
    const items = schedule.scheduleItems;

    // 時間重複チェック
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i];
        const item2 = items[j];

        const overlap = this.checkTimeOverlap(
          item1.startTime, item1.endTime,
          item2.startTime, item2.endTime
        );

        if (overlap) {
          conflicts.push({
            id: `conflict-${item1.id}-${item2.id}`,
            type: 'overlap',
            items: [item1.id, item2.id],
            message: `「${item1.title}」と「${item2.title}」の時間が重複しています`,
            severity: 'medium'
          });
        }
      }
    }

    // 締切との競合チェック
    for (const item of items) {
      if (item.task && item.task.dueDate) {
        const dueDate = new Date(item.task.dueDate);
        if (dueDate < date && item.status !== 'COMPLETED') {
          conflicts.push({
            id: `deadline-${item.id}`,
            type: 'deadline',
            items: [item.id],
            message: `「${item.title}」の締切が過ぎています`,
            severity: 'high'
          });
        }
      }
    }

    return conflicts;
  }

  // ===== Helper Methods =====

  /**
   * 時間ブロック生成（6:00-22:00の1時間刻み）
   */
  private generateTimeBlocks(date: Date): Array<Omit<TimeBlock, 'id' | 'dailyScheduleId'>> {
    const blocks = [];
    const startHour = 6;
    const endHour = 22;

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

      blocks.push({
        startTime,
        endTime,
        duration: 60
      });
    }

    return blocks;
  }

  /**
   * 適切なTimeBlockを見つけるか作成
   */
  private async findOrCreateTimeBlock(dailyScheduleId: string, startTime: string, endTime: string): Promise<TimeBlock> {
    // 既存のTimeBlockから最も適切なものを探す
    const existingBlock = await this.prisma.timeBlock.findFirst({
      where: {
        dailyScheduleId,
        startTime: { lte: startTime },
        endTime: { gte: endTime }
      }
    });

    if (existingBlock) {
      return existingBlock;
    }

    // 適切なブロックがない場合は新規作成
    const duration = this.calculateDuration(startTime, endTime);
    return await this.prisma.timeBlock.create({
      data: {
        dailyScheduleId,
        startTime,
        endTime,
        duration
      }
    });
  }

  /**
   * 時間差計算（分単位）
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    return endMinutes - startMinutes;
  }

  /**
   * 稼働時間計算
   */
  private calculateWorkingMinutes(startTime: string, endTime: string): number {
    return this.calculateDuration(startTime, endTime);
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
   * 空の統計データ
   */
  private getEmptyStatistics(date: Date): ScheduleStatistics {
    return {
      date,
      totalTasks: 0,
      completedTasks: 0,
      totalHours: 0,
      productiveHours: 0,
      breakHours: 0,
      utilizationRate: 0,
      completionRate: 0,
      overtimeHours: 0,
      focusTime: 0,
      meetingTime: 0
    };
  }

  /**
   * スケジュール統計の更新
   */
  private async updateScheduleStatistics(dailyScheduleId: string): Promise<void> {
    const schedule = await this.prisma.dailySchedule.findUniqueOrThrow({
      where: { id: dailyScheduleId },
      include: { scheduleItems: true }
    });

    const totalEstimated = schedule.scheduleItems.reduce((sum, item) => 
      sum + (item.estimatedTime || 0), 0
    );
    
    const totalActual = schedule.scheduleItems.reduce((sum, item) => 
      sum + (item.actualTime || 0), 0
    );

    const workingMinutes = this.calculateWorkingMinutes(
      schedule.workingHoursStart, 
      schedule.workingHoursEnd
    );

    const utilization = workingMinutes > 0 ? totalEstimated / workingMinutes : 0;

    await this.prisma.dailySchedule.update({
      where: { id: dailyScheduleId },
      data: {
        totalEstimated,
        totalActual,
        utilization
      }
    });
  }
}