/**
 * タグのモックデータ
 * 注意: Issue 040対応によりAPI統合完了。このモックデータは使用されません。
 * 開発・テスト時の参考データとして保持。
 */

import { Tag } from '../types/tag';

// API統合により以下のmockTagsは使用されません
// export const mockTags: Tag[] = [
//   {
//     id: 'tag-1',
//     name: 'フロントエンド',
//     color: '#3B82F6',
//     usageCount: 15,
//     createdAt: new Date('2024-01-01T09:00:00Z'),
//     updatedAt: new Date('2024-01-20T14:30:00Z')
//   },
//   {
//     id: 'tag-2',
//     name: 'バックエンド',
//     color: '#10B981',
//     usageCount: 12,
//     createdAt: new Date('2024-01-02T10:00:00Z'),
//     updatedAt: new Date('2024-01-18T16:00:00Z')
//   },
//   {
//     id: 'tag-3',
//     name: 'バグ修正',
//     color: '#EF4444',
//     usageCount: 8,
//     createdAt: new Date('2024-01-03T11:00:00Z'),
//     updatedAt: new Date('2024-01-22T09:15:00Z')
//   },
//   {
//     id: 'tag-4',
//     name: '新機能',
//     color: '#8B5CF6',
//     usageCount: 18,
//     createdAt: new Date('2024-01-04T08:30:00Z'),
//     updatedAt: new Date('2024-01-21T10:45:00Z')
//   },
//   {
//     id: 'tag-5',
//     name: 'UI/UX',
//     color: '#F59E0B',
//     usageCount: 9,
//     createdAt: new Date('2024-01-05T14:00:00Z'),
//     updatedAt: new Date('2024-01-19T13:20:00Z')
//   },
//   {
//     id: 'tag-6',
//     name: 'データベース',
//     color: '#6366F1',
//     usageCount: 6,
//     createdAt: new Date('2024-01-06T16:00:00Z'),
//     updatedAt: new Date('2024-01-20T11:10:00Z')
//   },
//   {
//     id: 'tag-7',
//     name: 'テスト',
//     color: '#84CC16',
//     usageCount: 4,
//     createdAt: new Date('2024-01-07T09:30:00Z'),
//     updatedAt: new Date('2024-01-16T15:40:00Z')
//   },
//   {
//     id: 'tag-8',
//     name: 'ドキュメント',
//     color: '#06B6D4',
//     usageCount: 3,
//     createdAt: new Date('2024-01-08T12:00:00Z'),
//     updatedAt: new Date('2024-01-18T17:25:00Z')
//   },
//   {
//     id: 'tag-9',
//     name: 'パフォーマンス',
//     color: '#EC4899',
//     usageCount: 7,
//     createdAt: new Date('2024-01-09T15:30:00Z'),
//     updatedAt: new Date('2024-01-20T08:50:00Z')
//   },
//   {
//     id: 'tag-10',
//     name: 'セキュリティ',
//     color: '#F97316',
//     usageCount: 5,
//     createdAt: new Date('2024-01-10T10:45:00Z'),
//     updatedAt: new Date('2024-01-17T14:15:00Z')
//   },
//   {
//     id: 'tag-11',
//     name: 'リファクタリング',
//     color: '#6B7280',
//     usageCount: 11,
//     createdAt: new Date('2024-01-11T13:15:00Z'),
//     updatedAt: new Date('2024-01-23T12:30:00Z')
//   },
//   {
//     id: 'tag-12',
//     name: '緊急',
//     color: '#DC2626',
//     usageCount: 2,
//     createdAt: new Date('2024-01-12T08:00:00Z'),
//     updatedAt: new Date('2024-01-22T16:45:00Z')
//   },
//   {
//     id: 'tag-13',
//     name: 'レビュー',
//     color: '#7C3AED',
//     usageCount: 6,
//     createdAt: new Date('2024-01-13T11:30:00Z'),
//     updatedAt: new Date('2024-01-21T09:20:00Z')
//   },
//   {
//     id: 'tag-14',
//     name: 'デプロイ',
//     color: '#059669',
//     usageCount: 4,
//     createdAt: new Date('2024-01-14T14:45:00Z'),
//     updatedAt: new Date('2024-01-19T18:10:00Z')
//   },
//   {
//     id: 'tag-15',
//     name: '調査',
//     color: '#0891B2',
//     usageCount: 8,
//     createdAt: new Date('2024-01-15T16:20:00Z'),
//     updatedAt: new Date('2024-01-20T10:55:00Z')
//   }
// ];

// 空の配列をエクスポート（後方互換性のため）
export const mockTags: Tag[] = [];

// 注意: この関数群もAPI統合により使用されません
// 後方互換性のためダミー関数を提供
export const getTagStats = (_tags: Tag[] = mockTags) => {
  // API統合により空のmockTagsが渡されるため、空の統計を返す
  console.warn('getTagStats: API統合により無効化されました。APIからデータを取得してください。');
  
  return {
    total: 0,
    totalUsage: 0,
    averageUsage: 0,
    mostUsedTag: null,
    leastUsedTag: null
  };
};

// 使用頻度別のタグ分類
export const getTagsByUsage = (_tags: Tag[] = mockTags) => {
  // API統合により空のmockTagsが渡されるため、空の分類を返す
  console.warn('getTagsByUsage: API統合により無効化されました。APIからデータを取得してください。');
  
  return {
    highUsage: [],
    mediumUsage: [],
    lowUsage: [],
    sortedByUsage: []
  };
};

// カラーパレット用のプリセットカラー
export const presetColors = [
  { name: 'ブルー', value: '#3B82F6' },
  { name: 'グリーン', value: '#10B981' },
  { name: 'レッド', value: '#EF4444' },
  { name: 'パープル', value: '#8B5CF6' },
  { name: 'オレンジ', value: '#F59E0B' },
  { name: 'インディゴ', value: '#6366F1' },
  { name: 'ライム', value: '#84CC16' },
  { name: 'シアン', value: '#06B6D4' },
  { name: 'ピンク', value: '#EC4899' },
  { name: 'アンバー', value: '#F97316' },
  { name: 'グレー', value: '#6B7280' },
  { name: 'ディープレッド', value: '#DC2626' },
  { name: 'バイオレット', value: '#7C3AED' },
  { name: 'エメラルド', value: '#059669' },
  { name: 'スカイ', value: '#0891B2' }
];