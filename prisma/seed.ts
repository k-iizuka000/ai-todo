/**
 * Prisma Database Seed Script
 * Mockデータからの完全移行とサンプルデータの投入
 */

import { PrismaClient } from '@prisma/client'
import { 
  UserStatus, 
  UserRole, 
  AuthProvider, 
  Theme, 
  TimeFormat,
  ProjectStatus,
  ProjectPriority,
  ProjectRole,
  TaskStatus,
  Priority,
  TaskAction,
  ScheduleItemType,
  ScheduleItemStatus,
  NotificationType,
  NotificationPriority
} from '@prisma/client'

const prisma = new PrismaClient()

/**
 * サンプルユーザーデータ
 */
const sampleUsers = [
  {
    email: 'admin@ai-todo.local',
    status: UserStatus.ACTIVE,
    role: UserRole.ADMIN,
    authProvider: AuthProvider.EMAIL,
    emailVerified: true,
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Administrator',
      department: 'IT',
      position: 'System Administrator'
    },
    preferences: {
      theme: Theme.SYSTEM,
      language: 'ja',
      timezone: 'Asia/Tokyo',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: TimeFormat.TWENTYFOUR_HOUR,
      notificationEmail: true,
      notificationPush: true,
      notificationDesktop: true
    }
  },
  {
    email: 'manager@ai-todo.local',
    status: UserStatus.ACTIVE,
    role: UserRole.MANAGER,
    authProvider: AuthProvider.EMAIL,
    emailVerified: true,
    profile: {
      firstName: 'Project',
      lastName: 'Manager',
      displayName: 'プロジェクトマネージャー',
      department: 'Development',
      position: 'Project Manager'
    },
    preferences: {
      theme: Theme.LIGHT,
      language: 'ja',
      timezone: 'Asia/Tokyo',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: TimeFormat.TWENTYFOUR_HOUR,
      notificationEmail: true,
      notificationPush: true,
      notificationDesktop: false
    }
  },
  {
    email: 'member@ai-todo.local',
    status: UserStatus.ACTIVE,
    role: UserRole.MEMBER,
    authProvider: AuthProvider.EMAIL,
    emailVerified: true,
    profile: {
      firstName: 'Team',
      lastName: 'Member',
      displayName: 'チームメンバー',
      department: 'Development',
      position: 'Software Developer'
    },
    preferences: {
      theme: Theme.DARK,
      language: 'ja',
      timezone: 'Asia/Tokyo',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: TimeFormat.TWENTYFOUR_HOUR,
      notificationEmail: false,
      notificationPush: true,
      notificationDesktop: true
    }
  }
]

/**
 * サンプルタグデータ
 */
const sampleTags = [
  { name: '緊急', color: '#EF4444', usageCount: 15 },
  { name: '重要', color: '#F59E0B', usageCount: 25 },
  { name: 'バグ修正', color: '#DC2626', usageCount: 12 },
  { name: '新機能', color: '#10B981', usageCount: 18 },
  { name: 'レビュー', color: '#8B5CF6', usageCount: 8 },
  { name: 'ドキュメント', color: '#06B6D4', usageCount: 6 },
  { name: 'テスト', color: '#84CC16', usageCount: 14 },
  { name: 'リファクタリング', color: '#6B7280', usageCount: 9 },
  { name: 'UI/UX', color: '#EC4899', usageCount: 11 },
  { name: 'パフォーマンス', color: '#F97316', usageCount: 7 }
]

/**
 * プロジェクトサンプルデータ
 */
function createSampleProjects(userIds: string[]) {
  return [
    {
      name: 'AI TODO アプリケーション',
      description: 'React + TypeScript + Prismaを使用したタスク管理アプリケーション',
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.HIGH,
      color: '#3B82F6',
      icon: 'CheckSquare',
      ownerId: userIds[1], // Manager
      startDate: new Date('2024-01-01'),
      deadline: new Date('2024-12-31'),
      budget: 1000000,
      isArchived: false,
      createdBy: userIds[1],
      updatedBy: userIds[1]
    },
    {
      name: 'データベース設計',
      description: 'Prisma + PostgreSQLによるデータベース設計と実装',
      status: ProjectStatus.COMPLETED,
      priority: ProjectPriority.CRITICAL,
      color: '#10B981',
      icon: 'Database',
      ownerId: userIds[0], // Admin
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-28'),
      deadline: new Date('2024-02-28'),
      budget: 500000,
      isArchived: false,
      createdBy: userIds[0],
      updatedBy: userIds[0]
    },
    {
      name: 'UI/UX 改善プロジェクト',
      description: 'ユーザーインターフェースとユーザーエクスペリエンスの改善',
      status: ProjectStatus.PLANNING,
      priority: ProjectPriority.MEDIUM,
      color: '#EC4899',
      icon: 'Palette',
      ownerId: userIds[2], // Member
      startDate: new Date('2024-06-01'),
      deadline: new Date('2024-08-31'),
      budget: 300000,
      isArchived: false,
      createdBy: userIds[2],
      updatedBy: userIds[2]
    }
  ]
}

/**
 * タスクサンプルデータ
 */
function createSampleTasks(userIds: string[], projectIds: string[]) {
  return [
    {
      title: 'Prismaスキーマの設計と実装',
      description: '12テーブル相当のPrismaスキーマを設計し、実装する',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      projectId: projectIds[1], // データベース設計プロジェクト
      assigneeId: userIds[0], // Admin
      dueDate: new Date('2024-01-15'),
      estimatedHours: 8,
      actualHours: 10,
      createdAt: new Date('2024-01-01'),
      createdBy: userIds[1],
      updatedBy: userIds[0]
    },
    {
      title: 'マイグレーション設定',
      description: 'データベースマイグレーション設定とConnection pooling最適化',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      projectId: projectIds[1],
      assigneeId: userIds[0],
      dueDate: new Date('2024-01-20'),
      estimatedHours: 6,
      actualHours: 4,
      createdAt: new Date('2024-01-10'),
      createdBy: userIds[1],
      updatedBy: userIds[0]
    },
    {
      title: 'タスク管理画面の実装',
      description: 'React + TypeScriptによるタスク管理画面の実装',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      projectId: projectIds[0], // AI TODO アプリケーション
      assigneeId: userIds[2], // Member
      dueDate: new Date('2024-02-01'),
      estimatedHours: 12,
      createdAt: new Date('2024-01-15'),
      createdBy: userIds[1],
      updatedBy: userIds[1]
    },
    {
      title: 'API エンドポイントの設計',
      description: 'RESTful APIエンドポイントの設計と実装',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      projectId: projectIds[0],
      assigneeId: userIds[1], // Manager
      dueDate: new Date('2024-01-25'),
      estimatedHours: 10,
      createdAt: new Date('2024-01-12'),
      createdBy: userIds[0],
      updatedBy: userIds[0]
    },
    {
      title: 'UI コンポーネントライブラリの選定',
      description: 'RadixUI、Tailwind CSS等のコンポーネントライブラリ選定',
      status: TaskStatus.DONE,
      priority: Priority.LOW,
      projectId: projectIds[2], // UI/UX改善
      assigneeId: userIds[2],
      dueDate: new Date('2024-01-30'),
      estimatedHours: 4,
      actualHours: 6,
      createdAt: new Date('2024-01-05'),
      createdBy: userIds[2],
      updatedBy: userIds[2]
    }
  ]
}

/**
 * サブタスクサンプルデータ
 */
function createSampleSubtasks(taskIds: string[]) {
  return [
    {
      taskId: taskIds[0], // Prismaスキーマの設計と実装
      title: 'User テーブル設計',
      completed: true
    },
    {
      taskId: taskIds[0],
      title: 'Task テーブル設計', 
      completed: true
    },
    {
      taskId: taskIds[0],
      title: 'Project テーブル設計',
      completed: true
    },
    {
      taskId: taskIds[1], // マイグレーション設定
      title: 'migration ファイル作成',
      completed: true
    },
    {
      taskId: taskIds[1],
      title: 'Connection pool 設定',
      completed: false
    },
    {
      taskId: taskIds[2], // タスク管理画面の実装
      title: 'コンポーネント構造設計',
      completed: false
    },
    {
      taskId: taskIds[2],
      title: 'CRUD操作実装',
      completed: false
    }
  ]
}

/**
 * メイン seed 実行関数
 */
async function main() {
  console.log('🌱 Starting database seed...')
  
  try {
    // 既存データのクリーンアップ
    console.log('🧹 Cleaning existing data...')
    await prisma.taskHistory.deleteMany()
    await prisma.taskComment.deleteMany()
    await prisma.taskAttachment.deleteMany()
    await prisma.subtask.deleteMany()
    await prisma.taskTag.deleteMany()
    await prisma.projectTag.deleteMany()
    await prisma.task.deleteMany()
    await prisma.projectMember.deleteMany()
    await prisma.project.deleteMany()
    await prisma.tag.deleteMany()
    await prisma.scheduleItem.deleteMany()
    await prisma.timeBlock.deleteMany()
    await prisma.dailySchedule.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.session.deleteMany()
    await prisma.userPreferences.deleteMany()
    await prisma.userProfile.deleteMany()
    await prisma.user.deleteMany()

    // ユーザー作成
    console.log('👥 Creating users...')
    const users = []
    for (const userData of sampleUsers) {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          status: userData.status,
          role: userData.role,
          authProvider: userData.authProvider,
          emailVerified: userData.emailVerified,
          profile: {
            create: userData.profile
          },
          preferences: {
            create: userData.preferences
          }
        }
      })
      users.push(user)
      console.log(`  ✅ Created user: ${user.email}`)
    }

    const userIds = users.map(u => u.id)

    // タグ作成
    console.log('🏷️  Creating tags...')
    const tags = []
    for (const tagData of sampleTags) {
      const tag = await prisma.tag.create({
        data: tagData
      })
      tags.push(tag)
      console.log(`  ✅ Created tag: ${tag.name}`)
    }

    const tagIds = tags.map(t => t.id)

    // プロジェクト作成
    console.log('📋 Creating projects...')
    const projectsData = createSampleProjects(userIds)
    const projects = []
    for (const projectData of projectsData) {
      const project = await prisma.project.create({
        data: projectData
      })
      projects.push(project)
      console.log(`  ✅ Created project: ${project.name}`)

      // プロジェクトメンバー追加
      await prisma.projectMember.create({
        data: {
          userId: project.ownerId,
          projectId: project.id,
          role: ProjectRole.OWNER
        }
      })
    }

    const projectIds = projects.map(p => p.id)

    // タスク作成
    console.log('📝 Creating tasks...')
    const tasksData = createSampleTasks(userIds, projectIds)
    const tasks = []
    for (const taskData of tasksData) {
      const task = await prisma.task.create({
        data: taskData
      })
      tasks.push(task)
      console.log(`  ✅ Created task: ${task.title}`)

      // タスクにタグを追加（ランダムに1-3個）
      const randomTagCount = Math.floor(Math.random() * 3) + 1
      const shuffledTagIds = tagIds.sort(() => 0.5 - Math.random()).slice(0, randomTagCount)
      
      for (const tagId of shuffledTagIds) {
        await prisma.taskTag.create({
          data: {
            taskId: task.id,
            tagId: tagId
          }
        })
      }
    }

    const taskIds = tasks.map(t => t.id)

    // サブタスク作成
    console.log('📄 Creating subtasks...')
    const subtasksData = createSampleSubtasks(taskIds)
    for (const subtaskData of subtasksData) {
      const subtask = await prisma.subtask.create({
        data: subtaskData
      })
      console.log(`  ✅ Created subtask: ${subtask.title}`)
    }

    // サンプル通知作成
    console.log('🔔 Creating sample notifications...')
    for (let i = 0; i < userIds.length; i++) {
      await prisma.notification.create({
        data: {
          userId: userIds[i],
          type: NotificationType.TASK_ASSIGNED,
          priority: NotificationPriority.MEDIUM,
          title: 'タスクが割り当てられました',
          message: `新しいタスク「${tasks[i]?.title}」が割り当てられました`,
          isRead: false,
          metadata: {
            taskId: taskIds[i],
            projectId: projectIds[0],
            userId: userIds[i]
          }
        }
      })
    }

    console.log('✅ Database seed completed successfully!')
    console.log(`Created:
  - ${users.length} users
  - ${tags.length} tags  
  - ${projects.length} projects
  - ${tasks.length} tasks
  - ${subtasksData.length} subtasks
  - ${userIds.length} notifications`)

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Seed実行
main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })