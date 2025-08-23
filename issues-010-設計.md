# Issue 010: モーダルスクロール問題の修正設計書

## 問題の概要
新規プロジェクト作成モーダルでマウススクロールができず、画面サイズによっては操作不能になる問題。

## 現状分析

### 影響箇所
1. **src/components/ui/modal.tsx**
   - DialogContentコンポーネントに高さ制限とオーバーフロー設定が不足
   - `size="lg"`時は`max-w-2xl`のみ設定され、高さ制限なし
   - スクロール可能領域が未定義

2. **src/components/project/ProjectCreateModal.tsx**
   - `size="lg"`を使用
   - 多数の入力フィールド（基本情報、優先度、カラー、アイコン、日程、予算、タグ）
   - コンテンツが画面高さを超える可能性が高い

### 根本原因
```typescript
// 現在のdialogContentVariants設定
const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] ...",
  {
    variants: {
      size: {
        // ...
        lg: "max-w-2xl", // 幅のみ設定、高さ制限なし
        // ...
      }
    }
  }
)
```

## ベストプラクティス調査結果

### Radix UI公式推奨
1. オーバーレイレベルでのスクロール管理
2. DialogContentに`max-height`設定
3. 内部コンテンツの`overflow-y-auto`

### Tailwind CSS推奨パターン
- `max-h-[90vh]` - ビューポート高さの90%を最大高に
- `overflow-y-auto` - 縦方向の自動スクロール
- `flex flex-col` - フレックスボックスでレイアウト管理

## 実装方針

### アプローチ1: DialogContent自体をスクロール可能に（推奨）
DialogContent全体をスクロール可能にし、シンプルな実装を維持

### アプローチ2: 内部構造の分離
ヘッダー・ボディ・フッターを分離し、ボディのみスクロール可能に

### 選定理由
アプローチ1を選択：
- 既存コードへの影響が最小限
- Radix UIの推奨パターンに準拠
- 実装がシンプルで保守性が高い

---

## グループ1: Modalコンポーネントの改修 [@Phase1]

### 修正対象
`src/components/ui/modal.tsx`

### 修正内容
1. **dialogContentVariantsの更新**
   ```typescript
   const dialogContentVariants = cva(
     "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 ...",
     {
       variants: {
         size: {
           default: "max-w-lg max-h-[90vh]",
           sm: "max-w-sm max-h-[85vh]",
           md: "max-w-md max-h-[90vh]",
           lg: "max-w-2xl max-h-[90vh]",
           xl: "max-w-4xl max-h-[95vh]",
           full: "max-w-[95vw] max-h-[95vh]",
         },
       },
     }
   )
   ```

2. **DialogContentにスクロール設定追加**
   ```typescript
   <DialogPrimitive.Content
     ref={ref}
     className={cn(
       dialogContentVariants({ size, className }),
       "overflow-y-auto overflow-x-hidden"
     )}
     {...props}
   >
   ```

3. **スクロールバークリック誤動作防止**
   ```typescript
   onPointerDownOutside={(event) => {
     const originalEvent = event.detail.originalEvent;
     const target = originalEvent.target as HTMLElement;
     // スクロールバーのクリックは無視
     if (originalEvent.offsetX > target.clientWidth || 
         originalEvent.offsetY > target.clientHeight) {
       event.preventDefault();
     }
   }}
   ```

---

## グループ2: Modal構造の最適化 [@Phase1]

### 修正対象
`src/components/ui/modal.tsx` - Modalコンポーネント

### 修正内容
1. **内部レイアウトの改善**
   ```typescript
   const Modal: React.FC<ModalProps> = ({ ... }) => {
     return (
       <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent size={size} className={cn("flex flex-col", className)}>
           {/* 固定ヘッダー */}
           {(title || description) && (
             <DialogHeader className="flex-shrink-0">
               {title && <DialogTitle>{title}</DialogTitle>}
               {description && <DialogDescription>{description}</DialogDescription>}
             </DialogHeader>
           )}
           
           {/* スクロール可能なボディ */}
           <div className="flex-1 overflow-y-auto py-4">
             {children}
           </div>
           
           {/* 固定フッター */}
           {footer && (
             <DialogFooter className="flex-shrink-0">
               {footer}
             </DialogFooter>
           )}
         </DialogContent>
       </Dialog>
     )
   }
   ```

---

## グループ3: ProjectCreateModalの調整 [@Phase1]

### 修正対象
`src/components/project/ProjectCreateModal.tsx`

### 修正内容
1. **フッターボタンの分離**
   - 現在childrenに含まれているフッターボタンをfooter propに移動
   
2. **コンテンツ構造の最適化**
   ```typescript
   <Modal
     open={open}
     onOpenChange={onOpenChange}
     title="新規プロジェクト作成"
     description="新しいプロジェクトの詳細を入力してください"
     size="lg"
     footer={
       <div className="flex justify-end space-x-2">
         <Button variant="outline" onClick={handleClose}>
           キャンセル
         </Button>
         <Button onClick={handleSubmit} className="flex items-center space-x-2">
           <Save className="h-4 w-4" />
           <span>作成</span>
         </Button>
       </div>
     }
   >
     {/* モーダル本文（フォーム要素） */}
   </Modal>
   ```

---

## グループ4: レスポンシブ対応

### 修正内容
1. **モバイル対応の高さ調整**
   ```typescript
   size: {
     lg: "max-w-2xl max-h-[90vh] sm:max-h-[85vh]",
   }
   ```

2. **タッチデバイス対応**
   - `-webkit-overflow-scrolling: touch`の追加（iOS Safari対応）

---

## グループ5: テスト項目の定義

### 単体テスト
1. 各サイズでの高さ制限確認
2. スクロール機能の動作確認
3. スクロールバークリック時の挙動

### 統合テスト
1. ProjectCreateModalでの実際のスクロール動作
2. 異なる画面サイズでの表示確認
3. キーボード操作（Tab、Escape）の確認

### 手動テスト
1. **デスクトップ**
   - Chrome、Firefox、Safari、Edge
   - 画面サイズ: 1920x1080、1366x768、1280x720
   
2. **モバイル**
   - iOS Safari
   - Android Chrome
   - 画面サイズ: 375x667、414x896

---

## 実装順序

### Phase 1（即時対応）
1. グループ1: Modalコンポーネントの改修
2. グループ2: Modal構造の最適化
3. グループ3: ProjectCreateModalの調整

### Phase 2（品質向上）
4. グループ4: レスポンシブ対応
5. グループ5: テスト項目の定義と実施

---

## リスクと対策

### リスク1: 既存モーダルへの影響
**対策**: 全サイズに高さ制限を追加するため、他のモーダルも確認必要

### リスク2: スクロール性能
**対策**: CSS最適化とwill-changeプロパティの活用

### リスク3: アクセシビリティ
**対策**: キーボードナビゲーション、スクリーンリーダー対応の確認

---

## 期待される成果

1. **即座の効果**
   - 新規プロジェクト作成モーダルでスクロール可能
   - 全画面サイズで操作可能
   
2. **長期的効果**
   - 他のモーダルコンポーネントも同様の恩恵
   - 保守性の向上
   - ユーザビリティの向上

---

## 参考資料

- [Radix UI Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Tailwind CSS Overflow Documentation](https://tailwindcss.com/docs/overflow)
- [Web.dev Modal Best Practices](https://web.dev/articles/building-a-modal-component)

---

## 完了条件チェックリスト

- [ ] 新規プロジェクト作成モーダルでマウススクロールが可能
- [ ] 画面サイズに関係なく全ての要素にアクセス可能
- [ ] モーダル内のコンテンツが適切にスクロール
- [ ] ユーザビリティが向上し、操作が止まることがない