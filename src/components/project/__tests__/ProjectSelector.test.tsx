import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectSelector } from '../ProjectSelector'
import { Project } from '@/types/project'

// mockプロジェクトのモック
vi.mock('@/mock/projects', () => ({
  mockProjects: [
    {
      id: '1',
      name: 'プロジェクト1',
      description: '説明1',
      status: 'active' as const,
      priority: 'high' as const,
      color: '#ff0000',
      icon: '🔥',
      tags: ['tag1', 'tag2'],
      isArchived: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      name: 'プロジェクト2',
      description: '説明2',
      status: 'planning' as const,
      priority: 'medium' as const,
      color: '#00ff00',
      icon: '📋',
      tags: ['tag2', 'tag3'],
      isArchived: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ]
}))

describe('ProjectSelector', () => {
  const mockProject1: Project = {
    id: '1',
    name: 'プロジェクト1',
    description: '説明1',
    status: 'active',
    priority: 'high',
    color: '#ff0000',
    icon: '🔥',
    tags: ['tag1', 'tag2'],
    isArchived: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }

  const defaultProps = {
    onProjectSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Issue 036対応: プロジェクト選択時の誤タスク作成防止', () => {
    it('プロジェクト選択時にイベントの伝播が制御される', async () => {
      const onProjectSelect = vi.fn()
      const onProjectIdSelect = vi.fn()
      
      render(
        <ProjectSelector
          onProjectSelect={onProjectSelect}
          onProjectIdSelect={onProjectIdSelect}
        />
      )

      // ドロップダウンを開く
      const button = screen.getByRole('button')
      await userEvent.click(button)

      // プロジェクトを選択
      const projectButton = screen.getByText('プロジェクト1')
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      }

      // イベント伝播制御のテスト
      fireEvent.click(projectButton, mockEvent)

      await waitFor(() => {
        expect(onProjectSelect).toHaveBeenCalledWith(mockProject1)
        expect(onProjectIdSelect).toHaveBeenCalledWith('1')
      })
    })

    it('新規プロジェクト作成ボタンクリック時にイベント伝播が制御される', async () => {
      const onCreateProject = vi.fn()
      
      render(
        <ProjectSelector
          {...defaultProps}
          onCreateProject={onCreateProject}
        />
      )

      // ドロップダウンを開く
      const button = screen.getByRole('button')
      await userEvent.click(button)

      // 新規作成ボタンをクリック
      const createButton = screen.getByText('新規プロジェクト作成')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(onCreateProject).toHaveBeenCalled()
      })
    })

    it('allowNoneオプション使用時のプロジェクトなし選択でもイベント伝播が制御される', async () => {
      const onProjectIdSelect = vi.fn()
      
      render(
        <ProjectSelector
          {...defaultProps}
          onProjectIdSelect={onProjectIdSelect}
          allowNone={true}
          noneLabel="プロジェクトを設定しない"
        />
      )

      // ドロップダウンを開く
      const button = screen.getByRole('button')
      await userEvent.click(button)

      // プロジェクトなしを選択
      const noneButton = screen.getByText('プロジェクトを設定しない')
      fireEvent.click(noneButton)

      await waitFor(() => {
        expect(onProjectIdSelect).toHaveBeenCalledWith(null)
      })
    })

    it('allowClearオプション使用時のクリアボタンでもイベント伝播が制御される', async () => {
      const onProjectSelect = vi.fn()
      
      render(
        <ProjectSelector
          selectedProject={mockProject1}
          onProjectSelect={onProjectSelect}
          allowClear={true}
        />
      )

      // ドロップダウンを開く
      const button = screen.getByRole('button')
      await userEvent.click(button)

      // プロジェクトなしボタンをクリック
      const clearButton = screen.getByText('プロジェクトなし')
      fireEvent.click(clearButton)

      await waitFor(() => {
        expect(onProjectSelect).toHaveBeenCalledWith(null)
      })
    })
  })

  describe('基本機能', () => {
    it('プロジェクトが選択されていない場合、「プロジェクトを選択」と表示される', () => {
      render(<ProjectSelector {...defaultProps} />)
      
      expect(screen.getByText('プロジェクトを選択')).toBeInTheDocument()
    })

    it('プロジェクトが選択されている場合、プロジェクト名が表示される', () => {
      render(
        <ProjectSelector
          {...defaultProps}
          selectedProject={mockProject1}
        />
      )
      
      expect(screen.getByText('プロジェクト1')).toBeInTheDocument()
      expect(screen.getByText('アクティブ')).toBeInTheDocument()
    })

    it('ドロップダウンが正常に開閉する', async () => {
      render(<ProjectSelector {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      // ドロップダウンを開く
      await userEvent.click(button)
      expect(screen.getByText('プロジェクト1')).toBeInTheDocument()
      
      // オーバーレイをクリックして閉じる
      const overlay = document.querySelector('.fixed.inset-0')
      if (overlay) {
        fireEvent.click(overlay)
      }
      
      await waitFor(() => {
        expect(screen.queryByText('プロジェクト1')).not.toBeInTheDocument()
      })
    })

    it('disabled状態では操作できない', () => {
      render(<ProjectSelector {...defaultProps} disabled={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('プロパティ検証', () => {
    it('selectedProjectとselectedProjectIdの両方が提供された場合、警告が表示される', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      render(
        <ProjectSelector
          {...defaultProps}
          selectedProject={mockProject1}
          selectedProjectId="2"
        />
      )
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'ProjectSelector: selectedProject と selectedProjectId の両方が提供されています。selectedProject が優先されます。'
      )
      
      consoleSpy.mockRestore()
    })

    it('存在しないprojectIdが指定された場合、警告が表示される', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      render(
        <ProjectSelector
          {...defaultProps}
          selectedProjectId="nonexistent"
        />
      )
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'ProjectSelector: 指定されたprojectId "nonexistent" が見つかりません。'
      )
      
      consoleSpy.mockRestore()
    })
  })
})