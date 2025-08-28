# Issues-019: MockからDBへの完全移行とCRUD機能実装 - 設計書

## 🎯 設計概要
MockデータからPostgreSQLへの完全移行により、各画面のDB統合とCRUD機能実装を行う。Fullstack-Architectの専門性を活用し、2024/2025年の最新技術トレンドに基づく堅牢なアーキテクチャを構築する。

## 📊 現状分析

### 既存システム構成
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **State Management**: Zustand (persist middleware)
- **Database**: PostgreSQL 15 (Docker環境)  
- **Mock Data**: 完全実装済み（Tasks, Projects, Schedules, Notifications）
- **Testing**: Vitest + React Testing Library

### 影響範囲分析
- **4つの主要画面**: タスク管理、プロジェクト管理、スケジュール、通知機能
- **8つのZustandストア**: taskStore, projectStore, scheduleStore等
- **20+コンポーネント**: CRUD操作関連コンポーネント群
- **12テーブル相当**: 既存Mock dataから推定される必要テーブル

## 🏗️ アーキテクチャ設計

### 基本アーキテクチャパターン
2024/2025年のベストプラクティスを適用：

```typescript
// Feature-Based Architecture
src/
├── features/
│   ├── tasks/       # タスク機能
│   ├── projects/    # プロジェクト機能
│   ├── schedules/   # スケジュール機能
│   └── notifications/ # 通知機能
├── shared/
│   ├── api/         # API Client層
│   ├── database/    # Prisma Client
│   └── types/       # 共通型定義
```

### 技術スタック統合
- **ORM**: Prisma (型安全性とパフォーマンス)
- **API Pattern**: REST + tRPC(将来拡張用)
- **Validation**: Zod (Runtime + Type Safety)
- **Error Handling**: React Error Boundary + Zustand
- **Caching**: React Query + Zustand (Hybrid Pattern)

## 💾 データベース統合設計

### Prisma Schema構成
```prisma
// Database Schema Design
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  tasks     Task[]
  projects  ProjectMember[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id           String     @id @default(cuid())
  title        String
  description  String?
  status       TaskStatus @default(TODO)
  priority     Priority   @default(MEDIUM)
  projectId    String?
  assigneeId   String?
  tags         TaskTag[]
  subtasks     Subtask[]
  dueDate      DateTime?
  estimatedHours Float?
  actualHours   Float?
  // ... 追加フィールド
}
```

### データ移行戦略
1. **段階的移行**: Mock → DB（画面別実装）
2. **データ整合性**: 既存Mock dataの完全移行
3. **ロールバック対応**: Mock dataをバックアップとして保持

## 🔌 API層アーキテクチャ設計

### REST API設計パターン
```typescript
// Clean Architecture準拠のAPI設計
interface TaskRepository {
  findAll(filter?: TaskFilter): Promise<Task[]>
  findById(id: string): Promise<Task | null>
  create(data: CreateTaskInput): Promise<Task>
  update(id: string, data: UpdateTaskInput): Promise<Task>
  delete(id: string): Promise<void>
}

// Service層（Business Logic）
class TaskService {
  constructor(private taskRepo: TaskRepository) {}
  
  async createTask(input: CreateTaskInput): Promise<TaskResult> {
    // Validation + Business Logic
    const validatedInput = taskSchema.parse(input)
    return await this.taskRepo.create(validatedInput)
  }
}
```

### API Endpoints構成
```typescript
// RESTful API Design
POST   /api/v1/tasks          # タスク作成
GET    /api/v1/tasks          # タスク一覧取得（フィルター対応）
GET    /api/v1/tasks/:id      # タスク詳細取得
PUT    /api/v1/tasks/:id      # タスク更新
DELETE /api/v1/tasks/:id      # タスク削除

// 同様にProjects, Schedules, Notifications
```

## 🎛️ 状態管理最適化設計

### Hybrid State Management Pattern
```typescript
// Server State (React Query) + Client State (Zustand)
interface TaskStore {
  // Client State (UI状態のみ)
  selectedTaskId: string | null
  filterOpen: boolean
  editMode: boolean
  
  // Server State Integration
  invalidateQueries: () => void
  optimisticUpdate: (task: Task) => void
}

// React Query統合
const useTasksQuery = () => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.tasks.findAll(filters),
    staleTime: 5 * 60 * 1000, // 5分
    cacheTime: 10 * 60 * 1000, // 10分
  })
}
```

### Optimistic Updates実装
```typescript
// 楽観的更新パターン
const useCreateTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.tasks.create,
    onMutate: async (newTask) => {
      // Optimistic Update
      const previousTasks = queryClient.getQueryData(['tasks'])
      queryClient.setQueryData(['tasks'], [...previousTasks, newTask])
      return { previousTasks }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['tasks'], context.previousTasks)
    }
  })
}
```

## ⚠️ エラーハンドリング戦略

### 階層化エラーハンドリング
```typescript
// 1. API層エラー
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) { super(message) }
}

// 2. Service層エラー
class BusinessError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

// 3. UI層エラー
const TaskErrorBoundary: React.FC = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<TaskErrorFallback />}
      onError={logError}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### リトライ戦略
- **Network Errors**: 指数バックオフ（3回まで）
- **Validation Errors**: 即座にユーザーフィードバック
- **Server Errors**: フォールバック表示

## 🛡️ セキュリティ・パフォーマンス要件

### セキュリティ対策
- **SQL Injection**: Prisma ORM自動対策
- **XSS**: React自動エスケープ + DOMPurify
- **CSRF**: SameSite Cookie + Token
- **Rate Limiting**: API層実装

### パフォーマンス最適化
```typescript
// Database Optimization
// 1. Index最適化
@@index([status, projectId])
@@index([assigneeId, dueDate])

// 2. N+1問題解決
const tasksWithDetails = await prisma.task.findMany({
  include: {
    tags: true,
    subtasks: true,
    assignee: { select: { id: true, name: true } }
  }
})

// 3. Pagination
const paginatedTasks = await prisma.task.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
})
```

## 📋 実装フェーズとタスク分割

### Phase 1: 基盤構築 [@Phase1]
**期間**: 1日目  
**担当**: database-architect, backend-architect協調

#### グループ1: DB・ORM統合基盤
- Prisma schema定義（12テーブル相当）
- Database migration設定
- Prisma Client生成・設定
- Connection pooling最適化

#### グループ2: API基盤アーキテクチャ  
- Express/Fastify サーバー構築
- Clean Architecture実装
- Zod validation schema定義
- OpenAPI仕様書作成

#### グループ3: エラーハンドリング基盤
- Error Boundary実装
- API Error handling middleware
- Logging・監視設定
- Retry mechanism実装

### Phase 2: 画面別DB統合 [@Phase1]
**期間**: 2日目  
**担当**: fullstack-architect単独実装

#### グループ4: タスク管理画面DB統合
- TaskStore → Prisma統合
- CRUD API実装（Tasks, Subtasks, Tags）
- React Query統合
- Optimistic updates実装

#### グループ5: プロジェクト管理画面DB統合
- ProjectStore → Prisma統合  
- Project Members管理
- 統計情報DB集計
- 権限管理実装

#### グループ6: スケジュール画面DB統合
- ScheduleStore → Prisma統合
- Calendar integration
- 時間集計機能
- Conflict detection

#### グループ7: 通知機能DB統合
- NotificationStore → Prisma統合
- Real-time updates検討
- 通知フィルタリング
- 既読管理

### Phase 3: 統合テスト・最適化 [@Phase1]  
**期間**: 3日目  
**担当**: fullstack-architect + QA

#### グループ8: 統合テスト・バリデーション
- End-to-End testing
- データ整合性確認
- パフォーマンステスト
- セキュリティ監査

#### グループ9: UI/UX最適化
- Loading states実装
- Error states改善  
- Accessibility確認
- Mobile responsiveness

#### グループ10: プロダクション準備
- Environment configuration
- Monitoring setup
- Backup strategy
- Deployment preparation

## 🔧 技術仕様詳細

### Prisma設定
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "metrics"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### API Client設定
```typescript
// shared/api/client.ts
class ApiClient {
  private baseURL = process.env.VITE_API_URL || 'http://localhost:3001'
  
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text())
    }
    
    return response.json()
  }
}
```

### State Management設定
```typescript
// features/tasks/store.ts
interface TaskFeatureStore {
  // UI State only
  selectedTaskId: string | null
  editDialogOpen: boolean
  filterOptions: TaskFilterOptions
  
  // Actions
  selectTask: (id: string) => void
  openEditDialog: () => void
  setFilters: (filters: TaskFilterOptions) => void
}
```

## 📏 品質・成功指標

### 機能指標
- [ ] 全4画面でDB CRUD操作: 100%動作
- [ ] データ移行完了率: 100%
- [ ] API応答時間: 500ms以内
- [ ] 画面表示時間: 2秒以内

### 非機能指標
- [ ] テストカバレッジ: 80%以上
- [ ] TypeScript型安全性: 100%
- [ ] アクセシビリティ: WCAG 2.1 AA準拠
- [ ] SEO Performance: Lighthouse 90+

### セキュリティ指標
- [ ] SQL Injection対策: 100%
- [ ] XSS対策: 100%
- [ ] 認証・認可: JWT実装
- [ ] データ暗号化: 保存時・転送時

## 🤝 協調パターン: Sequential実装

### database-architect協調項目
1. **Database Schema最適化**
   - Index戦略策定
   - Query performance tuning
   - Migration strategy

2. **データ整合性保証**
   - Constraint設計
   - Foreign key relationships
   - Data validation rules

### backend-architect協調項目
1. **API Architecture Review**
   - REST endpoint設計レビュー
   - Error handling strategy
   - Rate limiting implementation

2. **Performance Optimization**
   - Caching strategy
   - Connection pooling
   - Load balancing考慮

## 📋 受け入れ条件チェックリスト

### 機能要件
- [ ] タスク一覧画面でDBからのデータ取得・表示
- [ ] タスク作成・編集・削除がDBに反映
- [ ] プロジェクト管理画面でDB操作
- [ ] スケジュール画面でDB連携
- [ ] 通知機能でDBを使用
- [ ] 既存のMock機能と同等の動作を維持
- [ ] エラーハンドリングが適切に実装

### 非機能要件  
- [ ] パフォーマンス: 画面表示時間2秒以内
- [ ] セキュリティ: DB接続情報の適切な管理
- [ ] 可用性: DB接続エラー時のフォールバック機能
- [ ] データ整合性: CRUD操作の確実な実行

## ⚠️ リスク管理

### 技術リスク
- **高**: Prisma Schema複雑化 → 段階的実装で軽減
- **中**: State Management競合 → Clear separation定義
- **低**: Performance劣化 → 事前ベンチマーク実施

### スケジュールリスク
- **中**: DB Migration時間 → 事前テスト環境検証
- **低**: Integration複雑化 → Phase分割で対応

### 品質リスク
- **中**: Data整合性問題 → 充実したテストカバレッジ
- **低**: UI/UX劣化 → 既存コンポーネント最大活用

## 📈 今後の拡張性考慮

### Scalability Path
1. **Phase 4**: Real-time機能（WebSocket統合）
2. **Phase 5**: Mobile App対応（React Native）
3. **Phase 6**: Microservices分割検討
4. **Phase 7**: GraphQL migration検討

### Technology Evolution
- **tRPC導入**: Type-safe API alternative
- **Next.js migration**: Server Components活用
- **Edge computing**: Global distribution

---

**設計責任者**: Fullstack-Architect  
**協調エージェント**: Database-Architect, Backend-Architect  
**設計パターン**: Sequential Implementation  
**更新日時**: 2025-08-28  
**バージョン**: v1.0  
**想定工数**: 2-3日 (L: Large)