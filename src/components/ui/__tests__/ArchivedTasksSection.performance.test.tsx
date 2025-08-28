/**
 * ArchivedTasksSection パフォーマンステスト
 * Issue 015: Archived Tasks Toggle Functionality - グループ6
 * 
 * 200ms応答性保証のテスト実装
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArchivedTasksSection } from '../ArchivedTasksSection'
import { PerformanceTestUtils } from '../PerformanceMonitor'
import type { Task } from '@/types/task'

// ========================================
// Test Data Generation
// ========================================

/**
 * テスト用のアーカイブタスクデータ生成
 */
const generateArchivedTasks = (count: number): Task[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `archived-task-${index}`,
    title: `アーカイブタスク ${index + 1}`,
    description: `テスト用のアーカイブされたタスク ${index + 1}`,
    status: 'archived' as const,
    priority: ['low', 'medium', 'high', 'urgent'][index % 4] as Task['priority'],
    dueDate: new Date(Date.now() + index * 86400000), // 1日ずつ後の日付
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

// ========================================
// Performance Tests
// ========================================

describe('ArchivedTasksSection Performance Tests', () => {
  beforeEach(() => {
    // パフォーマンステスト用の設定
    jest.clearAllTimers()
    console.log = jest.fn() // ログを抑制
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('レンダリングパフォーマンス - 200ms以内', () => {
    test('少数タスク（10件）のレンダリングが200ms以内', async () => {
      const tasks = generateArchivedTasks(10)
      
      const { duration, isWithinThreshold } = await PerformanceTestUtils.testRenderingPerformance(
        () => {
          render(
            <ArchivedTasksSection
              tasks={tasks}
              storageKey="test-10-tasks"
              onTaskClick={() => {}}
            />
          )
        },
        200,
        'ArchivedTasksSection (10 tasks)'
      )

      expect(isWithinThreshold).toBe(true)
      expect(duration).toBeLessThan(200)
    })

    test('中量タスク（100件）のレンダリングが200ms以内', async () => {
      const tasks = generateArchivedTasks(100)
      
      const { duration, isWithinThreshold } = await PerformanceTestUtils.testRenderingPerformance(
        () => {
          render(
            <ArchivedTasksSection
              tasks={tasks}
              storageKey="test-100-tasks"
              onTaskClick={() => {}}
            />
          )
        },
        200,
        'ArchivedTasksSection (100 tasks)'
      )

      expect(isWithinThreshold).toBe(true)
      expect(duration).toBeLessThan(200)
    })

    test('大量タスク（1000件）のレンダリングが200ms以内（Virtual Scrolling）', async () => {
      const tasks = generateArchivedTasks(1000)
      
      const { duration, isWithinThreshold } = await PerformanceTestUtils.testRenderingPerformance(
        () => {
          render(
            <ArchivedTasksSection
              tasks={tasks}
              storageKey="test-1000-tasks"
              virtualScrollingThreshold={100}
              onTaskClick={() => {}}
            />
          )
        },
        200,
        'ArchivedTasksSection (1000 tasks with virtual scrolling)'
      )

      expect(isWithinThreshold).toBe(true)
      expect(duration).toBeLessThan(200)
    })
  })

  describe('インタラクションパフォーマンス - 200ms以内', () => {
    test('アコーディオン開閉が200ms以内', async () => {
      const tasks = generateArchivedTasks(50)
      const user = userEvent.setup()
      
      render(
        <ArchivedTasksSection
          tasks={tasks}
          storageKey="test-accordion"
          onTaskClick={() => {}}
        />
      )

      const trigger = screen.getByRole('button', { name: /アーカイブ済みタスク/i })

      const { duration, isWithinThreshold } = await PerformanceTestUtils.testInteractionPerformance(
        async () => {
          await user.click(trigger)
          await waitFor(() => {
            expect(screen.getByText(/アーカイブタスク 1/)).toBeInTheDocument()
          })
        },
        200,
        'Accordion expand interaction'
      )

      expect(isWithinThreshold).toBe(true)
      expect(duration).toBeLessThan(200)
    })

    test('タスククリックが200ms以内', async () => {
      const tasks = generateArchivedTasks(20)
      const mockTaskClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <ArchivedTasksSection
          tasks={tasks}
          storageKey="test-task-click"
          onTaskClick={mockTaskClick}
        />
      )

      // アコーディオンを開く
      const trigger = screen.getByRole('button', { name: /アーカイブ済みタスク/i })
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText(/アーカイブタスク 1/)).toBeInTheDocument()
      })

      const taskButton = screen.getByLabelText(/タスク「アーカイブタスク 1」を詳細表示/)

      const { duration, isWithinThreshold } = await PerformanceTestUtils.testInteractionPerformance(
        async () => {
          await user.click(taskButton)
        },
        200,
        'Task click interaction'
      )

      expect(mockTaskClick).toHaveBeenCalledWith(tasks[0])
      expect(isWithinThreshold).toBe(true)
      expect(duration).toBeLessThan(200)
    })

    test('Virtual Scrolling のキーボードナビゲーションが200ms以内', async () => {
      const tasks = generateArchivedTasks(200)
      const user = userEvent.setup()
      
      render(
        <ArchivedTasksSection
          tasks={tasks}
          storageKey="test-keyboard-nav"
          virtualScrollingThreshold={100}
          onTaskClick={() => {}}
        />
      )

      // アコーディオンを開く
      const trigger = screen.getByRole('button', { name: /アーカイブ済みタスク/i })
      await user.click(trigger)
      
      await waitFor(() => {
        const listbox = screen.getByRole('listbox')
        expect(listbox).toBeInTheDocument()
      })

      const virtualContainer = screen.getByRole('listbox')

      const { duration, isWithinThreshold } = await PerformanceTestUtils.testInteractionPerformance(
        async () => {
          // Arrow key navigation
          fireEvent.keyDown(virtualContainer, { key: 'ArrowDown' })
          fireEvent.keyDown(virtualContainer, { key: 'ArrowDown' })
          fireEvent.keyDown(virtualContainer, { key: 'ArrowDown' })
          fireEvent.keyDown(virtualContainer, { key: 'End' })
          fireEvent.keyDown(virtualContainer, { key: 'Home' })
        },
        200,
        'Virtual scrolling keyboard navigation'
      )

      expect(isWithinThreshold).toBe(true)
      expect(duration).toBeLessThan(200)
    })
  })

  describe('平均パフォーマンステスト', () => {
    test('複数回のレンダリング平均が200ms以内', async () => {
      const tasks = generateArchivedTasks(50)
      
      const { averageDuration, isWithinThreshold } = await PerformanceTestUtils.testAveragePerformance(
        () => {
          const { unmount } = render(
            <ArchivedTasksSection
              tasks={tasks}
              storageKey={`test-avg-${Math.random()}`}
              onTaskClick={() => {}}
            />
          )
          unmount() // メモリリーク防止
        },
        5,
        200,
        'ArchivedTasksSection average rendering'
      )

      expect(isWithinThreshold).toBe(true)
      expect(averageDuration).toBeLessThan(200)
    })

    test('複数回のアコーディオン操作平均が200ms以内', async () => {
      const tasks = generateArchivedTasks(30)
      
      const { averageDuration, isWithinThreshold } = await PerformanceTestUtils.testAveragePerformance(
        async () => {
          const { unmount } = render(
            <ArchivedTasksSection
              tasks={tasks}
              storageKey={`test-accordion-avg-${Math.random()}`}
              onTaskClick={() => {}}
            />
          )
          
          const trigger = screen.getByRole('button', { name: /アーカイブ済みタスク/i })
          const user = userEvent.setup()
          
          // 開いて閉じる操作
          await user.click(trigger)
          await waitFor(() => {
            expect(screen.getByText(/アーカイブタスク 1/)).toBeInTheDocument()
          })
          await user.click(trigger)
          
          unmount()
        },
        3,
        200,
        'Accordion toggle average performance'
      )

      expect(isWithinThreshold).toBe(true)
      expect(averageDuration).toBeLessThan(200)
    })
  })

  describe('メモリ効率テスト', () => {
    test('大量タスクでもメモリリークしない', async () => {
      const tasks = generateArchivedTasks(500)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <ArchivedTasksSection
            tasks={tasks}
            storageKey={`test-memory-${i}`}
            onTaskClick={() => {}}
          />
        )
        unmount()
      }
      
      // ガベージコレクション実行を試行
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryGrowth = finalMemory - initialMemory
      
      // メモリ成長が10MB以下なら合格（緩い基準）
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('リグレッションテスト', () => {
    test('パフォーマンス最適化後も基本機能が動作する', async () => {
      const tasks = generateArchivedTasks(10)
      const mockTaskClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <ArchivedTasksSection
          tasks={tasks}
          storageKey="test-regression"
          onTaskClick={mockTaskClick}
        />
      )

      // 基本機能のテスト
      const trigger = screen.getByRole('button', { name: /アーカイブ済みタスク/i })
      await user.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText(/アーカイブタスク 1/)).toBeInTheDocument()
      })

      const taskButton = screen.getByLabelText(/タスク「アーカイブタスク 1」を詳細表示/)
      await user.click(taskButton)
      
      expect(mockTaskClick).toHaveBeenCalledWith(tasks[0])
    })
  })
})

// ========================================
// Test Utilities Export
// ========================================

export { generateArchivedTasks }