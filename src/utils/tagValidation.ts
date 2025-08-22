/**
 * タグバリデーション関数
 * 設計書グループ3: TagCreateModal/TagEditModal用
 */

import { Tag, TagValidationResult } from '@/types/tag';

/**
 * タグ名のバリデーション
 * @param name タグ名
 * @param existingTags 既存のタグ一覧
 * @param currentTagId 編集時の現在のタグID（重複チェック除外用）
 * @returns バリデーション結果
 */
export const validateTagName = (
  name: string, 
  existingTags: Tag[], 
  currentTagId?: string
): TagValidationResult => {
  const errors: string[] = [];
  
  // 文字数制限（1-20文字）
  if (name.length < 1) {
    errors.push('タグ名を入力してください');
  } else if (name.length > 20) {
    errors.push('タグ名は20文字以内で入力してください');
  }
  
  // 重複チェック（大文字小文字を区別しない）
  const duplicateTag = existingTags.find(tag => 
    tag.name.toLowerCase() === name.toLowerCase() && 
    tag.id !== currentTagId
  );
  if (duplicateTag) {
    errors.push('このタグ名は既に使用されています');
  }
  
  // 禁止文字のチェック（XSS対策）
  const forbiddenChars = /<|>|&|"|'/;
  if (forbiddenChars.test(name)) {
    errors.push('使用できない文字が含まれています（<, >, &, ", \' は使用できません）');
  }
  
  // 先頭・末尾の空白チェック
  if (name !== name.trim()) {
    errors.push('タグ名の先頭・末尾に空白は使用できません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * カラーコードのバリデーション
 * @param color カラーコード（#RRGGBB形式）
 * @returns バリデーション結果
 */
export const validateTagColor = (color: string): TagValidationResult => {
  const errors: string[] = [];
  
  // HEXカラーコード形式のチェック
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!hexColorRegex.test(color)) {
    errors.push('カラーコードは#RRGGBBの形式で入力してください（例: #FF0000）');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * タグデータ全体のバリデーション
 * @param name タグ名
 * @param color カラーコード
 * @param existingTags 既存のタグ一覧
 * @param currentTagId 編集時の現在のタグID
 * @returns バリデーション結果
 */
export const validateTagData = (
  name: string,
  color: string,
  existingTags: Tag[],
  currentTagId?: string
): TagValidationResult => {
  const nameValidation = validateTagName(name, existingTags, currentTagId);
  const colorValidation = validateTagColor(color);
  
  const allErrors = [...nameValidation.errors, ...colorValidation.errors];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * 文字列から有効なHEXカラーコードを抽出する
 * @param input 入力文字列
 * @returns 有効なHEXカラーコードまたはnull
 */
export const extractValidHexColor = (input: string): string | null => {
  // #なしで入力された場合は自動で追加
  const withHash = input.startsWith('#') ? input : `#${input}`;
  
  // 3桁の場合は6桁に拡張（例: #FFF -> #FFFFFF）
  const hexColorRegex = /^#[0-9A-Fa-f]{3}$/;
  if (hexColorRegex.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  
  // 6桁の場合はそのまま
  const fullHexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (fullHexRegex.test(withHash)) {
    return withHash.toUpperCase();
  }
  
  return null;
};

/**
 * 色の明度を計算してテキスト色を決定する
 * @param hexColor HEXカラーコード
 * @returns 'white' | 'black'
 */
export const getTextColorForBackground = (hexColor: string): 'white' | 'black' => {
  // HEXカラーコードからRGB値を抽出
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // 明度を計算（ITU-R BT.709 係数使用）
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // 明度が0.5以上なら黒文字、未満なら白文字
  return luminance > 0.5 ? 'black' : 'white';
};

/**
 * タグ名のサニタイズ
 * @param name タグ名
 * @returns サニタイズされたタグ名
 */
export const sanitizeTagName = (name: string): string => {
  return name
    .trim()
    .replace(/[<>&"']/g, '') // 危険な文字を削除
    .replace(/\s+/g, ' '); // 連続する空白を1つにまとめる
};