# Requirements Document

## Introduction

プロジェクト・タグ・タスクの完全な連携機能を実装します。この機能により、ユーザーはプロジェクトとタグを作成・編集し、それらを全てのタスク画面（一覧/新規作成/編集）で利用できるようになります。最終的にPlaywright MCP（ポート5173）でE2Eテストが完全に実行できる状態を目標とします。

## Alignment with Product Vision

タスク管理アプリケーションの中核機能として、プロジェクトとタグによるタスクの整理・分類を可能にし、ユーザーの生産性向上に貢献します。

## Requirements

### Requirement 1: プロジェクト管理機能

**User Story:** As a user, I want to create and edit projects, so that I can organize my tasks by project categories

#### Acceptance Criteria

1. WHEN I access the projects screen THEN the system SHALL display existing projects
2. WHEN I click "新規作成" button THEN the system SHALL open a project creation form
3. WHEN I enter project information and save THEN the system SHALL create the project and show success feedback
4. WHEN I click on an existing project THEN the system SHALL open an edit form
5. WHEN I edit project information and save THEN the system SHALL update the project and show success feedback

### Requirement 2: タグ管理機能

**User Story:** As a user, I want to create and edit tags, so that I can label my tasks with relevant categories

#### Acceptance Criteria

1. WHEN I access the tag management screen THEN the system SHALL display existing tags
2. WHEN I click "新規作成" button THEN the system SHALL open a tag creation form
3. WHEN I enter tag information and save THEN the system SHALL create the tag and show success feedback
4. WHEN I click on an existing tag THEN the system SHALL open an edit form
5. WHEN I edit tag information and save THEN the system SHALL update the tag and show success feedback

### Requirement 3: タスク作成時のプロジェクト・タグ連携

**User Story:** As a user, I want to assign projects and tags when creating new tasks, so that I can categorize tasks from the beginning

#### Acceptance Criteria

1. WHEN I access the new task creation screen THEN the system SHALL show dropdown/selection options for projects and tags
2. Tags SHALL be multi-select via checkboxes or a multi-select component
3. WHEN I select a project from the dropdown THEN the system SHALL assign that project to the task
4. WHEN I select tags from the options THEN the system SHALL assign those tags to the task
5. WHEN I save the new task THEN the system SHALL store the task with associated project and tags
6. IF no project is selected THEN the system SHALL allow task creation without a project
7. IF no tags are selected THEN the system SHALL allow task creation without tags

### Requirement 4: タスク一覧での表示連携

**User Story:** As a user, I want to see projects and tags displayed in the task list, so that I can quickly understand task categorization

#### Acceptance Criteria

1. WHEN I view the task list THEN the system SHALL display project names for tasks that have projects assigned
2. WHEN I view the task list THEN the system SHALL display tag labels for tasks that have tags assigned
3. WHEN a task has no project THEN the system SHALL show appropriate visual indicator or leave project field empty
4. WHEN a task has no tags THEN the system SHALL show appropriate visual indicator or leave tag field empty
<!-- 検索/フィルタは本スコープ外のため削除 -->

### Requirement 5: タスク編集時のプロジェクト・タグ連携

**User Story:** As a user, I want to modify projects and tags when editing existing tasks, so that I can update task categorization as needed

#### Acceptance Criteria

1. WHEN I open a task for editing THEN the system SHALL show current project and tags assigned to the task
2. WHEN I change the project selection THEN the system SHALL update the task's project assignment
3. WHEN I add or remove tags THEN the system SHALL update the task's tag assignments
4. WHEN I save the edited task THEN the system SHALL store the updated project and tag associations
5. WHEN I remove all project/tag assignments THEN the system SHALL allow saving the task without categories

### Requirement 6: Playwright MCPによるE2Eテスト対応

**User Story:** As a developer, I want all features to be testable via Playwright MCP on port 5173, so that integration can be validated automatically

#### Preconditions

- Application runs on port `5173` (e.g., Vite) and is reachable by Playwright MCP
- Database is reset to a clean state before tests (migration + seed if applicable)

#### Acceptance Criteria

1. WHEN Playwright MCP connects to port 5173 THEN the application SHALL be fully accessible
2. WHEN automated tests create projects THEN the system SHALL persist and display them correctly
3. WHEN automated tests create tags THEN the system SHALL persist and display them correctly
4. WHEN automated tests create tasks with projects and tags THEN the system SHALL store all associations correctly
5. WHEN automated tests edit projects, tags, or task associations THEN the system SHALL update data correctly
6. WHEN automated tests navigate between screens THEN all data SHALL remain consistent
7. WHEN automated tests run the complete flow (steps 1-7) THEN all operations SHALL complete without errors

## Data Model (Minimum)

- Task: `{ id, title, projectId?: string, tagIds: string[] }`
- Project: `{ id, name }`
- Tag: `{ id, name }`

表示要件（一覧/編集）では `project.name` と `tag.name` を用いる。

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: プロジェクト、タグ、タスクの管理機能はそれぞれ独立したモジュールとして実装
- **Modular Design**: データ管理、UI コンポーネント、API呼び出しは再利用可能な形で分離
- **Dependency Management**: コンポーネント間の依存関係を最小限に抑える
- **Clear Interfaces**: プロジェクト、タグ、タスク間のデータ連携インターフェースを明確に定義

### Performance
- 望ましい目安: タスク一覧でのプロジェクト・タグ情報読み込みが体感遅延なく表示される
- 望ましい目安: プロジェクト・タグの作成・編集操作は体感ストレスなく完了する

### Security
- プロジェクト・タグ・タスクデータの適切な検証とサニタイズ
- XSS攻撃を防ぐための入力値のエスケープ処理

### Reliability
- データの整合性確保（プロジェクト削除時の関連タスクの適切な処理は本スコープ外・将来課題）
- エラー発生時の適切なフィードバック表示

### Usability
- 直感的なUI/UXでプロジェクト・タグの選択が可能
- 明確な視覚的フィードバック（成功/エラーはトーストまたはインラインで表示）
- レスポンシブデザインでモバイル端末でも利用可能
