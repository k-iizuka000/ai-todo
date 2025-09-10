/**
 * Seed script for initial data
 * データベースに初期データを投入するスクリプト
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ユーザー作成
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: 'dev-user-001',
      email: 'test@example.com',
      status: 'ACTIVE',
      role: 'MEMBER',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        create: {
          displayName: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          bio: 'Development test user',
          avatar: null,
        }
      }
    }
  });

  console.log('✅ Created user:', user.email);

  // プロジェクト作成
  const project = await prisma.project.create({
    data: {
      name: 'サンプルプロジェクト',
      description: 'テスト用のプロジェクトです',
      color: '#3B82F6',
      ownerId: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    }
  });

  console.log('✅ Created project:', project.name);

  // タグ作成
  const tags = await Promise.all([
    prisma.tag.create({
      data: {
        name: '重要',
        color: '#EF4444',
      }
    }),
    prisma.tag.create({
      data: {
        name: '開発',
        color: '#10B981',
      }
    }),
    prisma.tag.create({
      data: {
        name: 'バグ',
        color: '#F59E0B',
      }
    })
  ]);

  console.log('✅ Created tags:', tags.map(t => t.name).join(', '));

  // タスク作成（異なるステータスで）
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'ドラッグ&ドロップのテストタスク（TODO）',
        description: 'ドラッグ&ドロップでステータス変更をテストするタスク',
        status: 'TODO',
        priority: 'HIGH',
        projectId: project.id,
        assigneeId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
      }
    }),
    prisma.task.create({
      data: {
        title: '進行中のタスク',
        description: 'IN_PROGRESSステータスのテスト',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        projectId: project.id,
        assigneeId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
      }
    }),
    prisma.task.create({
      data: {
        title: '完了済みのタスク',
        description: 'DONEステータスのテスト',
        status: 'DONE',
        priority: 'LOW',
        projectId: project.id,
        assigneeId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
      }
    }),
    prisma.task.create({
      data: {
        title: 'タグ付きタスク',
        description: 'タグとの関連をテストするタスク',
        status: 'TODO',
        priority: 'URGENT',
        assigneeId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
      }
    })
  ]);

  console.log('✅ Created tasks:', tasks.length);

  // タスクにタグを関連付け
  await prisma.taskTag.create({
    data: {
      taskId: tasks[3].id,
      tagId: tags[0].id,
    }
  });

  await prisma.taskTag.create({
    data: {
      taskId: tasks[3].id,
      tagId: tags[1].id,
    }
  });

  console.log('✅ Associated tags with tasks');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });