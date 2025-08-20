# AI TODOプロジェクト概要

## プロジェクトの目的
React + TypeScriptベースのモダンなTODO管理アプリケーション。
レスポンシブデザインとモバイル対応を重視した実用的なタスク管理ツール。

## 技術スタック
- **フロントエンド**: React 18.2.0 + TypeScript 5.2.2
- **ルーティング**: React Router v6.20.1
- **スタイリング**: Tailwind CSS 3.3.6 + PostCSS
- **ビルドツール**: Vite 5.0.8
- **アイコン**: Lucide React 0.298.0
- **リンター**: ESLint 8.55.0 with TypeScript support
- **開発環境**: Docker Compose

## 開発環境構成
- **Docker化**: 完全にDocker化された開発環境
- **ホットリロード**: Viteを使用した高速開発サーバー
- **ポート**: 5173番でアクセス
- **環境変数**: .env.localファイル対応

## プロジェクト構造
```
src/
├── components/
│   ├── layout/          # レイアウト関連コンポーネント
│   ├── ui/              # 基本UIコンポーネント
│   └── ai/              # AI関連コンポーネント
├── pages/               # ページコンポーネント
├── router/              # ルーティング設定
├── stores/              # 状態管理
├── types/               # TypeScript型定義
├── lib/                 # ユーティリティ
├── styles/              # スタイル定義
└── mock/                # モックデータ
```

## 主要機能
- タスク管理 (CRUD操作)
- プロジェクト管理
- カレンダー機能
- 分析・レポート
- 設定管理
- レスポンシブデザイン
- モバイルナビゲーション