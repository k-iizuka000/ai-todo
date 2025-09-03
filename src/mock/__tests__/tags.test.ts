/**
 * @jest-environment jsdom
 * 
 * Issue 040対応: src/mock/tags.ts の単体テスト
 * API統合完了後の無効化確認
 */

import { mockTags, presetColors } from '../tags';

describe('src/mock/tags.ts', () => {
  describe('API統合完了後の無効化確認', () => {
    it('mockTagsは空配列をエクスポートする（後方互換性のため）', () => {
      expect(mockTags).toBeDefined();
      expect(Array.isArray(mockTags)).toBe(true);
      expect(mockTags).toHaveLength(0);
    });

    it('presetColorsは引き続き利用可能', () => {
      expect(presetColors).toBeDefined();
      expect(Array.isArray(presetColors)).toBe(true);
      expect(presetColors.length).toBeGreaterThan(0);
      
      // 各カラーオブジェクトの構造確認
      presetColors.forEach(color => {
        expect(color).toHaveProperty('name');
        expect(color).toHaveProperty('value');
        expect(typeof color.name).toBe('string');
        expect(typeof color.value).toBe('string');
        expect(color.value).toMatch(/^#[0-9A-F]{6}$/i); // 16進数カラーコード形式
      });
    });

    it('基本的なプリセットカラーが含まれている', () => {
      const colorValues = presetColors.map(c => c.value);
      
      // よく使われる基本色が含まれていることを確認
      expect(colorValues).toContain('#3B82F6'); // Blue
      expect(colorValues).toContain('#10B981'); // Green
      expect(colorValues).toContain('#EF4444'); // Red
      expect(colorValues).toContain('#8B5CF6'); // Purple
    });
  });

  describe('ファイル構造とエクスポート確認', () => {
    it('必要なエクスポートが存在する', () => {
      expect(typeof mockTags).toBe('object');
      expect(typeof presetColors).toBe('object');
    });

    it('mockTagsの型定義が正しい', () => {
      // 空配列でも型は正しく定義されている
      expect(mockTags).toEqual([]);
    });
  });

  describe('統合テスト: コンポーネントでの利用可能性', () => {
    it('presetColorsは他のコンポーネントから参照可能', () => {
      // タグ作成フォームなどで使用される想定
      const firstColor = presetColors[0];
      expect(firstColor).toHaveProperty('name');
      expect(firstColor).toHaveProperty('value');
      
      // カラーコードとして有効な形式
      expect(firstColor.value).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('mockTagsは空配列なので既存コードでエラーにならない', () => {
      // 既存のコードでmockTagsを参照していてもエラーにならない
      expect(() => {
        const length = mockTags.length;
        const mapped = mockTags.map(tag => tag.id);
        const filtered = mockTags.filter(tag => tag.name);
      }).not.toThrow();
    });
  });
});