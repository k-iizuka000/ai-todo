# Design Document

## Overview

プロジェクト管理画面の新規作成機能をメモリ上のmockデータからDockerのPostgreSQLデータベースへの完全な永続化に改修します。既存のバックエンドAPI（ProjectController、ProjectService）を活用し、フロントエンドのProjectManagement.tsxとProjectCreateModal.tsxを修正してリアルタイムなデータ連携を実現します。

## Steering Document Alignment

### Technical Standards (tech.md)
- TypeScript strict mode活用による型安全性確保
- Prisma ORMによるタイプセーフなデータベース操作
- REST API設計原則に従ったHTTPメソッドとステータスコード使用
- エラーハンドリングとログ記録の標準化

### Project Structure (structure.md)
- フロントエンド/バックエンド/データベースの3層アーキテクチャ継承
- 既存のコントローラー・サービス・リポジトリパターンを維持
- コンポーネント単位の責任分離原則を遵守

## Code Reuse Analysis

### Existing Components to Leverage
- **ProjectController.ts**: 既存のcreateProject/getProjectsエンドポイントを完全活用
- **ProjectService.ts**: createProject/getProjectsメソッドのビジネスロジック再利用
- **ProjectRepository.ts**: Prismaを使ったデータベース操作層を活用
- **projectsAPI.ts**: フロントエンドAPIクライアント（create/getAllメソッド）を使用
- **projectRoutes.ts**: 既存のREST APIルート設定をそのまま利用

### Integration Points
- **PostgreSQL Database**: 既存のPrismaスキーマのProjectテーブル利用
- **Authentication Middleware**: requireAuth認証機能を継承
- **Validation Schemas**: CreateProjectSchemaによるリクエスト検証を活用
- **Error Handling**: asyncHandler, BaseController のエラー処理を継承

## Architecture

既存のフルスタックアーキテクチャを維持しながら、データフローをmockからDBへ変更します。

### Modular Design Principles
- **Single File Responsibility**: 各ファイルが単一の責任を持つ構造を維持
- **Component Isolation**: UIコンポーネント、APIクライアント、サービス層の分離
- **Service Layer Separation**: データアクセス（Repository）、ビジネスロジック（Service）、プレゼンテーション（Controller）の3層分離
- **Utility Modularity**: 型変換ユーティリティ（mapFromLegacyPriority等）の再利用

```mermaid
graph TD
    A[ProjectManagement.tsx] --> B[ProjectCreateModal.tsx]
    A --> C[projectsAPI.ts]
    C --> D[/api/v1/projects API]
    D --> E[ProjectController.ts]
    E --> F[ProjectService.ts]
    F --> G[ProjectRepository.ts]
    G --> H[PostgreSQL Database]
    
    I[Mock Data] -.-> J[Remove Mock Dependencies]
    
    style I fill:#ff9999
    style J fill:#ff9999
    style H fill:#99ff99
```

## Components and Interfaces

### Component 1: ProjectManagement.tsx
- **Purpose**: プロジェクト管理画面のメインコンポーネント（mockデータ依存の除去）
- **Interfaces**: 
  - `handleCreateProject`: CreateProjectInput → APIクライアント呼び出し
  - `loadProjects`: 初期データ読み込み（API経由）
- **Dependencies**: projectsAPI.create(), projectsAPI.getAll()
- **Reuses**: 既存のProjectCreateModal、ProjectCard、UI Layout構造

### Component 2: ProjectCreateModal.tsx
- **Purpose**: プロジェクト作成フォームコンポーネント（型整合性の確保）
- **Interfaces**: 
  - `onCreateProject`: CreateProjectInputを親コンポーネントに通知
  - `validateForm`: フォームバリデーション
- **Dependencies**: CreateProjectInput型定義、バリデーションユーティリティ
- **Reuses**: 既存のフォーム要素、バリデーション機能、モーダルUI

### Component 3: Enhanced API Integration
- **Purpose**: フロントエンド↔バックエンド間の型安全な通信
- **Interfaces**:
  - POST `/api/v1/projects`: CreateProjectInput → Project
  - GET `/api/v1/projects`: ProjectQueryParams → ProjectWithDetails[]
- **Dependencies**: 既存のprojectsAPI、型定義ファイル
- **Reuses**: APIクライアント、エラーハンドリング、リトライ機能

### Component 4: Data Type Harmonization
- **Purpose**: フロントエンド/バックエンド間の型不整合解消
- **Interfaces**:
  - Legacy mapping functions: mapFromLegacyPriority, mapFromLegacyStatus
  - Type conversion utilities
- **Dependencies**: project.ts型定義ファイル
- **Reuses**: 既存のマッピング関数、型変換ユーティリティ

## Data Models

### Model 1: Enhanced CreateProjectInput
```typescript
interface CreateProjectInput {
  name: string;                    // 必須フィールド
  description?: string;           // オプション
  priority?: ProjectPriority;     // enum: LOW|MEDIUM|HIGH|CRITICAL
  color?: string;                 // デフォルト: #3B82F6
  icon?: string;                  // デフォルト: 📋
  startDate?: Date;              // ISO string形式
  endDate?: Date;                // ISO string形式  
  budget?: number;               // 数値型
  tags?: string[];               // タグ配列（将来対応）
}
```

### Model 2: API Response Structure
```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// プロジェクト作成レスポンス
interface CreateProjectResponse extends ApiResponse<Project> {
  data: {
    id: string;                  // UUID (cuid)
    name: string;
    description: string | null;
    status: ProjectStatus;       // enum
    priority: ProjectPriority;   // enum
    color: string;
    icon: string | null;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    // ... その他のフィールド
  }
}
```

## Error Handling

### Error Scenarios
1. **Network Connection Failure**
   - **Handling**: APIクライアントのリトライ機能（最大3回）
   - **User Impact**: "接続エラーが発生しました。しばらく後に再試行してください。"

2. **Validation Error (400 Bad Request)**
   - **Handling**: サーバーからのvalidationエラーをフォームフィールドにマッピング
   - **User Impact**: フィールド別の具体的なエラーメッセージ表示

3. **Authentication Error (401 Unauthorized)**
   - **Handling**: ログイン画面へのリダイレクト
   - **User Impact**: "認証が必要です。ログインしてください。"

4. **Database Connection Error (500 Internal Server Error)**
   - **Handling**: サーバーサイドでのエラーログ記録、フロントエンドで汎用エラー表示
   - **User Impact**: "サーバーエラーが発生しました。管理者にお問い合わせください。"

5. **Form Validation Error**
   - **Handling**: クライアントサイドでのリアルタイム検証
   - **User Impact**: 入力中の即座なフィードバック

## Testing Strategy

### Unit Testing
- **ProjectManagement.tsx**: Jest + React Testing Libraryでのコンポーネントテスト
- **ProjectCreateModal.tsx**: フォーム送信、バリデーション、エラーハンドリング
- **API Integration**: MSW (Mock Service Worker) でのAPI呼び出しテスト
- **Type Mapping**: 型変換関数の入出力テスト

### Integration Testing
- **API Endpoint Testing**: Supertest でのプロジェクト作成/取得フロー
- **Database Integration**: TestContainers使用のPostgreSQL結合テスト
- **Authentication Flow**: 認証付きAPIアクセスのテスト

### End-to-End Testing
- **PlaywrightMCP**: ブラウザ自動化によるユーザージャーニーテスト
  - プロジェクト作成フォーム入力 → 送信 → 一覧画面更新 → ページリロード → データ永続化確認
- **Database State Verification**: 作成されたプロジェクトがDBに正しく保存されているかの確認
- **Cross-browser Testing**: Chrome、Firefox、Safariでの動作検証

## Implementation Priority

### Phase 1: Core Functionality
1. ProjectManagement.tsx のmock依存除去
2. API統合とエラーハンドリング
3. 型不整合修正

### Phase 2: Enhanced Features  
1. リアルタイム一覧更新
2. 楽観的UI更新
3. オフライン対応準備

### Phase 3: Validation & Testing
1. E2Eテスト実装
2. パフォーマンス最適化
3. PlaywrightMCP検証