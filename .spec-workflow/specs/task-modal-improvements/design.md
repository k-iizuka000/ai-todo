# タスクモーダル改善設計書

## 1. アーキテクチャ概要

### 1.1 対象コンポーネント
- `TaskCreateModal` - タスク追加モーダル
- `TaskDetailModal` - タスク編集モーダル  
- `TaskForm` - 共通フォームコンポーネント
- `TagSelector` / `TagDropdown` - タグ選択コンポーネント
- `ProjectSelector` - プロジェクト選択コンポーネント

### 1.2 設計方針
- 両モーダル間でUIと動作を統一
- リアルタイムデータ更新の実装
- 適切な余白とデザインの改善
- ユーザビリティの向上

## 2. タスク追加モーダル改善設計

### 2.1 タグ選択機能の修正

#### 現状の問題分析
```typescript
// 現在のTagSelectorの問題点:
// 1. ドロップダウンモードでタグが表示されない
// 2. 新規タグが作成可能になっている
// 3. タグ選択が即座に反映される
```

#### 改善実装
```typescript
// TaskForm.tsx の修正
interface TaskFormProps {
  // ... existing props
  onTagSelect?: (tags: Tag[]) => void; // タグ選択時のコールバック（追加）
}

// タグ選択部分の実装
<TagSelector
  selectedTags={formData.tags}
  onTagsChange={(tags) => {
    handleFieldChange('tags', tags);
    // タグ選択時に即座に送信しないようにする
  }}
  editing={true}
  mode="dropdown"
  allowCreate={false} // 新規作成を無効化
  maxTags={10}
  placeholder="タグを選択..."
/>
```

### 2.2 TagDropdownコンポーネントの修正

```typescript
// TagDropdown.tsx の改善
export const TagDropdown: React.FC<TagDropdownProps> = ({
  selectedTags,
  onTagsChange,
  allowCreate = false, // デフォルトで新規作成無効
  ...props
}) => {
  const { tags } = useTagStore(); // ストアから登録済みタグを取得
  
  // 選択可能なタグのフィルタリング
  const availableTags = useMemo(() => {
    return tags.filter(tag => 
      !selectedTags.some(selected => selected.id === tag.id)
    );
  }, [tags, selectedTags]);
  
  // タグ選択処理
  const handleTagSelect = (tag: Tag) => {
    // 複数選択を可能にする
    const newTags = [...selectedTags, tag];
    onTagsChange(newTags);
    // ドロップダウンを閉じない
  };
  
  return (
    <Popover>
      <PopoverTrigger>
        {/* 選択済みタグの表示 */}
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <TagBadge key={tag.id} tag={tag} onRemove={handleRemove} />
          ))}
          <Button variant="ghost" size="sm">
            タグを追加
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent>
        {/* 登録済みタグのリスト */}
        {availableTags.map(tag => (
          <div key={tag.id} onClick={() => handleTagSelect(tag)}>
            {tag.name}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};
```

## 3. タスク編集モーダル改善設計

### 3.1 サブタスク即時反映

#### 現状の問題分析
```typescript
// 現在の問題:
// サブタスク追加後、TaskDetailModalが再レンダリングされない
// タスクストアの更新がUIに反映されない
```

#### 改善実装
```typescript
// TaskDetailModal.tsx の修正
const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onSubtaskAdd,
  ...props
}) => {
  // ローカル状態でサブタスクを管理
  const [localSubtasks, setLocalSubtasks] = useState(task?.subtasks || []);
  
  // サブタスク追加時の処理
  const handleSubtaskAdd = async (title: string) => {
    const newSubtask = {
      id: `temp-${Date.now()}`,
      title,
      completed: false,
      createdAt: new Date(),
    };
    
    // 即座にUIを更新
    setLocalSubtasks(prev => [...prev, newSubtask]);
    
    // バックエンドに送信
    if (onSubtaskAdd) {
      await onSubtaskAdd(title);
    }
  };
  
  // タスクが更新されたら、ローカル状態も更新
  useEffect(() => {
    if (task?.subtasks) {
      setLocalSubtasks(task.subtasks);
    }
  }, [task?.subtasks]);
};
```

### 3.2 デザイン統一

#### CSSクラスの追加
```css
/* モーダル共通スタイル */
.task-modal-content {
  padding: 24px;
  space-y: 16px;
}

.task-modal-section {
  padding: 16px;
  border-radius: 8px;
  background: var(--section-bg);
  margin-bottom: 16px;
}

.task-modal-field {
  margin-bottom: 20px;
}

.task-modal-label {
  font-weight: 500;
  margin-bottom: 8px;
  display: block;
}

/* フォーム要素の余白調整 */
.task-form-input {
  padding: 12px;
  margin-bottom: 4px;
}

.task-form-textarea {
  padding: 12px;
  min-height: 100px;
}
```

### 3.3 更新ボタンの追加

```typescript
// TaskDetailView.tsx の修正
const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  onTaskUpdate,
  ...props
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState(task);
  
  // フォームデータ変更検知
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(task);
    setHasChanges(changed);
  }, [formData, task]);
  
  // 更新処理
  const handleUpdate = async () => {
    if (onTaskUpdate && hasChanges) {
      await onTaskUpdate(task.id, formData);
      setIsEditing(false);
      setHasChanges(false);
    }
  };
  
  return (
    <div className="task-detail-view">
      {/* フォーム内容 */}
      
      {/* 更新ボタン */}
      {isEditing && (
        <div className="flex justify-end gap-4 mt-6">
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(false)}
          >
            キャンセル
          </Button>
          <Button 
            variant="primary"
            onClick={handleUpdate}
            disabled={!hasChanges}
          >
            更新
          </Button>
        </div>
      )}
    </div>
  );
};
```

### 3.4 タグ・プロジェクト選択動作の統一

```typescript
// 共通のセレクター設定
const commonSelectorProps = {
  editing: true,
  mode: 'dropdown' as const,
  allowCreate: false,
  variant: 'full' as const,
};

// TaskForm内での使用
<TagSelector
  {...commonSelectorProps}
  selectedTags={formData.tags}
  onTagsChange={handleTagsChange}
/>

<ProjectSelector
  {...commonSelectorProps}
  selectedProject={formData.projectId}
  onProjectChange={handleProjectChange}
/>
```

## 4. 共通改善事項

### 4.1 エラーハンドリング
- タグ・プロジェクト選択時のエラー表示
- サブタスク追加失敗時のリトライ機能
- ネットワークエラー時の適切なフィードバック

### 4.2 パフォーマンス最適化
- React.memo による不要な再レンダリング防止
- useCallback/useMemo の適切な使用
- デバウンス処理の実装

### 4.3 アクセシビリティ
- キーボード操作のサポート強化
- スクリーンリーダー対応
- フォーカス管理の改善

## 5. テスト戦略

### 5.1 ユニットテスト
- タグ選択機能のテスト
- サブタスク追加・更新のテスト
- フォームバリデーションのテスト

### 5.2 統合テスト
- モーダル間の動作統一性確認
- データ永続化の確認
- エラー処理フローの確認

### 5.3 E2Eテスト（Playwright）
- タスク作成フロー全体
- タスク編集フロー全体
- エラー発生時の復旧フロー