/**
 * カラーピッカーコンポーネント
 * 設計書グループ3: タグ作成・編集用カラー選択機能
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input, Label, FormField } from '@/components/ui/input';
import { TAG_PRESET_COLORS } from '@/types/tag';
import { validateTagColor, extractValidHexColor, getTextColorForBackground } from '@/utils/tagValidation';

interface ColorPickerProps {
  /** 現在選択されているカラー */
  value: string;
  /** カラー変更時のコールバック */
  onChange: (color: string) => void;
  /** エラーメッセージ */
  error?: string;
  /** ラベル */
  label?: string;
  /** 必須フィールドかどうか */
  required?: boolean;
  /** 無効化フラグ */
  disabled?: boolean;
  /** クラス名 */
  className?: string;
}

/**
 * プリセットカラーボタンコンポーネント
 */
const PresetColorButton = React.memo<{
  color: string;
  isSelected: boolean;
  onClick: (color: string) => void;
  disabled?: boolean;
}>(({ color, isSelected, onClick, disabled }) => {
  const textColor = getTextColorForBackground(color);
  
  return (
    <button
      type="button"
      className={cn(
        "w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isSelected 
          ? "border-ring shadow-lg" 
          : "border-border hover:border-ring/50",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
      style={{ 
        backgroundColor: color,
        color: textColor === 'white' ? '#ffffff' : '#000000'
      }}
      onClick={() => !disabled && onClick(color)}
      disabled={disabled}
      aria-label={`カラー ${color} を選択`}
      title={color}
    >
      {isSelected && (
        <svg
          className="w-4 h-4 mx-auto"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
});

PresetColorButton.displayName = 'PresetColorButton';

/**
 * カラーピッカーコンポーネント
 */
export const ColorPicker = React.memo<ColorPickerProps>(({
  value,
  onChange,
  error,
  label = "カラー",
  required = false,
  disabled = false,
  className
}) => {
  const [hexInput, setHexInput] = useState(value);
  
  // プリセットカラーのクリックハンドラー
  const handlePresetColorClick = useCallback((color: string) => {
    setHexInput(color);
    onChange(color);
  }, [onChange]);
  
  // HEX入力のハンドラー
  const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setHexInput(inputValue);
    
    // リアルタイムで有効な色をチェック
    const validColor = extractValidHexColor(inputValue);
    if (validColor) {
      onChange(validColor);
    }
  }, [onChange]);
  
  // HEX入力のblurハンドラー
  const handleHexInputBlur = useCallback(() => {
    const validColor = extractValidHexColor(hexInput);
    if (validColor) {
      setHexInput(validColor);
      onChange(validColor);
    } else {
      // 無効な場合は現在の値に戻す
      setHexInput(value);
    }
  }, [hexInput, value, onChange]);
  
  // 現在の色から背景色とテキスト色を計算
  const currentColorStyle = useMemo(() => {
    const validColor = extractValidHexColor(value);
    if (!validColor) return {};
    
    const textColor = getTextColorForBackground(validColor);
    return {
      backgroundColor: validColor,
      color: textColor === 'white' ? '#ffffff' : '#000000'
    };
  }, [value]);
  
  // HEX入力のバリデーション
  const hexValidation = useMemo(() => {
    if (!hexInput) return { isValid: true, errors: [] };
    return validateTagColor(extractValidHexColor(hexInput) || hexInput);
  }, [hexInput]);
  
  return (
    <div className={cn("space-y-4", className)}>
      <FormField
        label={label}
        required={required}
        error={error}
      >
        <div className="space-y-3">
          {/* プリセットカラーパレット */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              プリセットカラー
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {TAG_PRESET_COLORS.map((color) => (
                <PresetColorButton
                  key={color}
                  color={color}
                  isSelected={value === color}
                  onClick={handlePresetColorClick}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
          
          {/* カスタムカラー入力 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              カスタムカラー
            </Label>
            <div className="flex items-center space-x-3">
              {/* カラープレビュー */}
              <div
                className={cn(
                  "w-10 h-10 rounded-md border-2 border-border flex items-center justify-center text-xs font-mono",
                  !extractValidHexColor(value) && "bg-gray-100 text-gray-400"
                )}
                style={currentColorStyle}
                title={`現在の色: ${value}`}
              >
                {extractValidHexColor(value) ? '色' : '?'}
              </div>
              
              {/* HEX入力フィールド */}
              <div className="flex-1">
                <Input
                  type="text"
                  value={hexInput}
                  onChange={handleHexInputChange}
                  onBlur={handleHexInputBlur}
                  placeholder="#FF0000"
                  disabled={disabled}
                  variant={hexValidation.isValid ? "default" : "error"}
                  className="font-mono uppercase"
                  maxLength={7}
                />
                {!hexValidation.isValid && hexValidation.errors.length > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {hexValidation.errors[0]}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              #RRGGBB形式で入力してください（例: #FF0000）
            </p>
          </div>
        </div>
      </FormField>
    </div>
  );
});

ColorPicker.displayName = 'ColorPicker';