import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskForm } from '../TaskForm'
import { CreateTaskInput } from '@/types/task'

// モックストア
vi.mock('@/stores/tagStore', () => ({
  useTagStore: () => ({
    tags: [
      { id: '1', name: 'テストタグ1', color: '#ff0000' },
      { id: '2', name: 'テストタグ2', color: '#00ff00' }
    ]
  })
}))

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    getProjectById: vi.fn((id: string) => ({
      id,
      name: `プロジェクト${id}`,
      description: 'テストプロジェクト',
      status: 'active' as const
    }))
  })
}))

describe('TaskForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    title: 'テストタスクフォーム'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('リアルタイムバリデーション機能', () => {
    it('タイトルが空の場合、submitボタンが無効化される', async () => {
      render(<TaskForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: '作成' })
      expect(submitButton).toBeDisabled()
    })

    it('タイトルを入力するとsubmitボタンが有効化される', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('タイトル')
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      // 初期状態では無効
      expect(submitButton).toBeDisabled()
      
      // タイトルを入力
      await user.type(titleInput, 'テストタイトル')
      
      // submitボタンが有効化される
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('バリデーションエラーがある場合、submitボタンが無効化される', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('タイトル')
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      // 101文字のタイトルを入力（文字数制限超過）
      const longTitle = 'a'.repeat(101)
      await user.type(titleInput, longTitle)
      
      // フォーム送信を試行してバリデーションを実行
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('タイトルは100文字以内で入力してください')).toBeInTheDocument()
      })
      
      // submitボタンが無効化される
      expect(submitButton).toBeDisabled()
    })

    it('エラー修正後にsubmitボタンが再度有効化される', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('タイトル')
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      // まず長いタイトルを入力
      const longTitle = 'a'.repeat(101)
      await user.type(titleInput, longTitle)
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
      
      // タイトルを修正
      await user.clear(titleInput)
      await user.type(titleInput, 'テストタイトル')
      
      // submitボタンが再度有効化される
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('バリデーション機能', () => {
    it('必須項目が未入力の場合、エラーメッセージを表示する', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      // タイトル未入力でsubmit試行
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()
      })
    })

    it('文字数制限を超過した場合、エラーメッセージを表示する', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('タイトル')
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      // 101文字のタイトルを入力
      const longTitle = 'a'.repeat(101)
      await user.type(titleInput, longTitle)
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('タイトルは100文字以内で入力してください')).toBeInTheDocument()
      })
    })

    it('見積時間に負の値を入力した場合、エラーメッセージを表示する', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('タイトル')
      const estimatedHoursInput = screen.getByLabelText('見積時間')
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      await user.type(titleInput, 'テストタイトル')
      await user.type(estimatedHoursInput, '-1')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('正の数値を入力してください')).toBeInTheDocument()
      })
    })
  })

  describe('フォーム送信', () => {
    it('有効なデータでフォーム送信が成功する', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      
      render(<TaskForm {...defaultProps} onSubmit={mockOnSubmit} />)
      
      const titleInput = screen.getByLabelText('タイトル')
      const descriptionInput = screen.getByLabelText('説明')
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      // フォームに入力
      await user.type(titleInput, 'テストタイトル')
      await user.type(descriptionInput, 'テスト説明')
      
      // submitボタンが有効化されるのを待つ
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
      
      // フォーム送信
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'テストタイトル',
          description: 'テスト説明',
          priority: 'medium',
          dueDate: undefined,
          estimatedHours: undefined,
          tags: [],
          projectId: undefined
        })
      })
    })

    it('loading状態の時はsubmitボタンが無効化される', () => {
      render(<TaskForm {...defaultProps} loading={true} />)
      
      const submitButton = screen.getByRole('button', { name: '作成' })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('フィールドエラークリア機能', () => {
    it('エラーのあるフィールドに入力するとエラーがクリアされる', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)
      
      const titleInput = screen.getByLabelText('タイトル')
      const submitButton = screen.getByRole('button', { name: '作成' })
      
      // まずエラーを発生させる
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()
      })
      
      // タイトルを入力してエラーをクリア
      await user.type(titleInput, 'テストタイトル')
      
      // エラーメッセージが消える
      await waitFor(() => {
        expect(screen.queryByText('タイトルは必須です')).not.toBeInTheDocument()
      })
    })
  })
})