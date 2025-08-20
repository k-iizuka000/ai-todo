import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Save,
  Eye,
  Brush
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'gray';

interface ThemeSettingsData {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  fontSize: 'small' | 'medium' | 'large';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  animations: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

const colorSchemes = [
  { id: 'blue', name: 'ブルー', primary: '#3B82F6', secondary: '#1E40AF' },
  { id: 'green', name: 'グリーン', primary: '#10B981', secondary: '#047857' },
  { id: 'purple', name: 'パープル', primary: '#8B5CF6', secondary: '#5B21B6' },
  { id: 'orange', name: 'オレンジ', primary: '#F59E0B', secondary: '#D97706' },
  { id: 'pink', name: 'ピンク', primary: '#EC4899', secondary: '#BE185D' },
  { id: 'gray', name: 'グレー', primary: '#6B7280', secondary: '#374151' }
];

const ThemeSettings: React.FC = () => {
  const [settings, setSettings] = useState<ThemeSettingsData>({
    mode: 'system',
    colorScheme: 'blue',
    fontSize: 'medium',
    borderRadius: 'medium',
    animations: true,
    highContrast: false,
    reducedMotion: false,
  });

  const [previewMode, setPreviewMode] = useState<ThemeMode>('light');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // システムテーマの検出
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updatePreview = () => {
      if (settings.mode === 'system') {
        setPreviewMode(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setPreviewMode(settings.mode);
      }
    };

    updatePreview();
    mediaQuery.addEventListener('change', updatePreview);
    
    return () => mediaQuery.removeEventListener('change', updatePreview);
  }, [settings.mode]);

  const handleSettingChange = <K extends keyof ThemeSettingsData>(
    key: K, 
    value: ThemeSettingsData[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    
    try {
      // シミュレーション：実際の保存処理
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // テーマの適用
      applyTheme(settings);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('テーマ設定の保存に失敗しました:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const applyTheme = (themeSettings: ThemeSettingsData) => {
    const root = document.documentElement;
    const selectedColorScheme = colorSchemes.find(c => c.id === themeSettings.colorScheme);
    
    if (selectedColorScheme) {
      root.style.setProperty('--color-primary-500', selectedColorScheme.primary);
      root.style.setProperty('--color-primary-600', selectedColorScheme.secondary);
    }

    // フォントサイズの設定
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.setProperty('--base-font-size', fontSizeMap[themeSettings.fontSize]);

    // 角丸の設定
    const borderRadiusMap = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '12px'
    };
    root.style.setProperty('--border-radius', borderRadiusMap[themeSettings.borderRadius]);

    // アニメーション設定
    root.style.setProperty(
      '--animation-duration', 
      themeSettings.animations && !themeSettings.reducedMotion ? '0.2s' : '0s'
    );

    // ハイコントラスト設定
    if (themeSettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  };

  const resetToDefaults = () => {
    setSettings({
      mode: 'system',
      colorScheme: 'blue',
      fontSize: 'medium',
      borderRadius: 'medium',
      animations: true,
      highContrast: false,
      reducedMotion: false,
    });
  };

  const selectedColorScheme = colorSchemes.find(c => c.id === settings.colorScheme);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">テーマ設定</h2>
        <p className="text-gray-600">アプリケーションの外観とテーマをカスタマイズします。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-8">
          {/* Theme Mode */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Palette size={20} className="text-gray-500" />
              テーマモード
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleSettingChange('mode', 'light')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.mode === 'light'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Sun size={24} className="mx-auto mb-2 text-yellow-500" />
                <div className="text-sm font-medium">ライトモード</div>
              </button>
              
              <button
                onClick={() => handleSettingChange('mode', 'dark')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.mode === 'dark'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Moon size={24} className="mx-auto mb-2 text-blue-600" />
                <div className="text-sm font-medium">ダークモード</div>
              </button>
              
              <button
                onClick={() => handleSettingChange('mode', 'system')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.mode === 'system'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Monitor size={24} className="mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium">システム設定</div>
              </button>
            </div>
          </section>

          {/* Color Scheme */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Brush size={20} className="text-gray-500" />
              カラーテーマ
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => handleSettingChange('colorScheme', scheme.id as ColorScheme)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.colorScheme === scheme.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: scheme.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: scheme.secondary }}
                    />
                  </div>
                  <div className="text-sm font-medium">{scheme.name}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">文字サイズ</h3>
            <div className="space-y-2">
              {[
                { id: 'small', label: '小', size: '14px' },
                { id: 'medium', label: '標準', size: '16px' },
                { id: 'large', label: '大', size: '18px' }
              ].map((option) => (
                <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="fontSize"
                    value={option.id}
                    checked={settings.fontSize === option.id}
                    onChange={() => handleSettingChange('fontSize', option.id as any)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="text-sm" style={{ fontSize: option.size }}>
                    {option.label} ({option.size})
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Border Radius */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">角丸設定</h3>
            <div className="space-y-2">
              {[
                { id: 'none', label: 'なし', radius: '0px' },
                { id: 'small', label: '小', radius: '4px' },
                { id: 'medium', label: '標準', radius: '8px' },
                { id: 'large', label: '大', radius: '12px' }
              ].map((option) => (
                <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="borderRadius"
                    value={option.id}
                    checked={settings.borderRadius === option.id}
                    onChange={() => handleSettingChange('borderRadius', option.id as any)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div 
                    className="w-6 h-6 bg-primary-500 mr-2"
                    style={{ borderRadius: option.radius }}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Accessibility */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Eye size={20} className="text-gray-500" />
              アクセシビリティ
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={(e) => handleSettingChange('animations', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm text-gray-700 font-medium">アニメーション</span>
                  <p className="text-xs text-gray-500">トランジションとアニメーション効果を有効にします</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm text-gray-700 font-medium">ハイコントラスト</span>
                  <p className="text-xs text-gray-500">視認性を向上させるため、色のコントラストを強くします</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm text-gray-700 font-medium">モーション軽減</span>
                  <p className="text-xs text-gray-500">動きに敏感な方のためにアニメーションを軽減します</p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">プレビュー</h3>
            <div className={`rounded-lg border-2 border-gray-200 p-4 ${
              previewMode === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="space-y-4">
                {/* Header Preview */}
                <div className={`p-3 rounded-lg ${
                  previewMode === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedColorScheme?.primary }}
                    />
                    <div className={`text-sm font-medium ${
                      previewMode === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      ヘッダー
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="space-y-2">
                  <div className={`text-sm font-medium ${
                    previewMode === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    サンプルタスク
                  </div>
                  <div className={`text-xs ${
                    previewMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    これはプレビュー用のテキストです。
                  </div>
                </div>

                {/* Button Preview */}
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1 text-xs rounded text-white"
                    style={{ backgroundColor: selectedColorScheme?.primary }}
                  >
                    プライマリ
                  </button>
                  <button className={`px-3 py-1 text-xs rounded border ${
                    previewMode === 'dark' 
                      ? 'border-gray-600 text-gray-300 bg-gray-800' 
                      : 'border-gray-300 text-gray-700 bg-white'
                  }`}>
                    セカンダリ
                  </button>
                </div>

                {/* Card Preview */}
                <div className={`p-3 rounded-lg border ${
                  previewMode === 'dark' 
                    ? 'border-gray-700 bg-gray-800' 
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className={`text-xs ${
                    previewMode === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    カードコンテンツの例
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={resetToDefaults}
                className="w-full text-sm"
              >
                デフォルトに戻す
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save size={16} />
          {isSaving ? '保存中...' : 'テーマを適用'}
        </Button>
        {saved && (
          <div className="ml-3 text-sm text-green-600 flex items-center">
            テーマが適用されました
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeSettings;