/**
 * タグのモックデータ
 */

import { Tag } from '../types/tag';

// 拡張されたモックタグデータ（10個以上、使用回数と日時情報を追加）
export const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'フロントエンド',
    color: '#3B82F6',
    usageCount: 15,
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-20T14:30:00Z')
  },
  {
    id: 'tag-2',
    name: 'バックエンド',
    color: '#10B981',
    usageCount: 12,
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-18T16:00:00Z')
  },
  {
    id: 'tag-3',
    name: 'バグ修正',
    color: '#EF4444',
    usageCount: 8,
    createdAt: new Date('2024-01-03T11:00:00Z'),
    updatedAt: new Date('2024-01-22T09:15:00Z')
  },
  {
    id: 'tag-4',
    name: '新機能',
    color: '#8B5CF6',
    usageCount: 18,
    createdAt: new Date('2024-01-04T08:30:00Z'),
    updatedAt: new Date('2024-01-21T10:45:00Z')
  },
  {
    id: 'tag-5',
    name: 'UI/UX',
    color: '#F59E0B',
    usageCount: 9,
    createdAt: new Date('2024-01-05T14:00:00Z'),
    updatedAt: new Date('2024-01-19T13:20:00Z')
  },
  {
    id: 'tag-6',
    name: 'データベース',
    color: '#6366F1',
    usageCount: 6,
    createdAt: new Date('2024-01-06T16:00:00Z'),
    updatedAt: new Date('2024-01-20T11:10:00Z')
  },
  {
    id: 'tag-7',
    name: 'テスト',
    color: '#84CC16',
    usageCount: 4,
    createdAt: new Date('2024-01-07T09:30:00Z'),
    updatedAt: new Date('2024-01-16T15:40:00Z')
  },
  {
    id: 'tag-8',
    name: 'ドキュメント',
    color: '#06B6D4',
    usageCount: 3,
    createdAt: new Date('2024-01-08T12:00:00Z'),
    updatedAt: new Date('2024-01-18T17:25:00Z')
  },
  {
    id: 'tag-9',
    name: 'パフォーマンス',
    color: '#EC4899',
    usageCount: 7,
    createdAt: new Date('2024-01-09T15:30:00Z'),
    updatedAt: new Date('2024-01-20T08:50:00Z')
  },
  {
    id: 'tag-10',
    name: 'セキュリティ',
    color: '#F97316',
    usageCount: 5,
    createdAt: new Date('2024-01-10T10:45:00Z'),
    updatedAt: new Date('2024-01-17T14:15:00Z')
  },
  {
    id: 'tag-11',
    name: 'リファクタリング',
    color: '#6B7280',
    usageCount: 11,
    createdAt: new Date('2024-01-11T13:15:00Z'),
    updatedAt: new Date('2024-01-23T12:30:00Z')
  },
  {
    id: 'tag-12',
    name: '緊急',
    color: '#DC2626',
    usageCount: 2,
    createdAt: new Date('2024-01-12T08:00:00Z'),
    updatedAt: new Date('2024-01-22T16:45:00Z')
  },
  {
    id: 'tag-13',
    name: 'レビュー',
    color: '#7C3AED',
    usageCount: 6,
    createdAt: new Date('2024-01-13T11:30:00Z'),
    updatedAt: new Date('2024-01-21T09:20:00Z')
  },
  {
    id: 'tag-14',
    name: 'デプロイ',
    color: '#059669',
    usageCount: 4,
    createdAt: new Date('2024-01-14T14:45:00Z'),
    updatedAt: new Date('2024-01-19T18:10:00Z')
  },
  {
    id: 'tag-15',
    name: '調査',
    color: '#0891B2',
    usageCount: 8,
    createdAt: new Date('2024-01-15T16:20:00Z'),
    updatedAt: new Date('2024-01-20T10:55:00Z')
  }
];

// タグ統計の計算用ヘルパー関数
export const getTagStats = (tags: Tag[] = mockTags) => {
  const total = tags.length;
  const totalUsage = tags.reduce((sum, tag) => sum + (tag.usageCount || 0), 0);
  const mostUsedTag = tags.reduce((prev, current) => 
    (current.usageCount || 0) > (prev.usageCount || 0) ? current : prev, 
    tags[0] || null
  );
  const leastUsedTag = tags.reduce((prev, current) => 
    (current.usageCount || 0) < (prev.usageCount || 0) ? current : prev, 
    tags[0] || null
  );
  
  return {
    total,
    totalUsage,
    averageUsage: total > 0 ? Math.round(totalUsage / total) : 0,
    mostUsedTag,
    leastUsedTag
  };
};

// 使用頻度別のタグ分類
export const getTagsByUsage = (tags: Tag[] = mockTags) => {
  const sortedByUsage = [...tags].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  
  return {
    highUsage: sortedByUsage.filter(tag => (tag.usageCount || 0) >= 10),
    mediumUsage: sortedByUsage.filter(tag => (tag.usageCount || 0) >= 5 && (tag.usageCount || 0) < 10),
    lowUsage: sortedByUsage.filter(tag => (tag.usageCount || 0) < 5),
    sortedByUsage
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