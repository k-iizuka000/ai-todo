import React, { useState } from 'react';
import { 
  Bot, 
  MessageSquare, 
  Shield, 
  Save, 
  AlertCircle,
  Settings,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AISettingsData {
  aiProvider: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  autoSuggestions: boolean;
  smartPrioritization: boolean;
  contextAwareness: boolean;
  responseStyle: string;
  safetyFilter: boolean;
  dataRetention: string;
  anonymousMode: boolean;
}

const AISettings: React.FC = () => {
  const [settings, setSettings] = useState<AISettingsData>({
    aiProvider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    autoSuggestions: true,
    smartPrioritization: true,
    contextAwareness: true,
    responseStyle: 'balanced',
    safetyFilter: true,
    dataRetention: '30days',
    anonymousMode: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleInputChange = (field: keyof AISettingsData, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    
    // シミュレーション：実際の保存処理
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testConnection = async () => {
    // テスト接続の実装（シミュレーション）
    alert('AI接続テスト機能は実装予定です');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">AI設定</h2>
        <p className="text-gray-600">AI機能とアシスタント機能の設定を管理します。</p>
      </div>

      <div className="space-y-8">
        {/* AI Provider Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Bot size={20} className="text-gray-500" />
            AIプロバイダー設定
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AIプロバイダー
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={settings.aiProvider}
                onChange={(e) => handleInputChange('aiProvider', e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="google">Google Gemini</option>
                <option value="local">ローカルモデル</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                モデル
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={settings.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
              >
                {settings.aiProvider === 'openai' && (
                  <>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </>
                )}
                {settings.aiProvider === 'anthropic' && (
                  <>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                  </>
                )}
                {settings.aiProvider === 'google' && (
                  <>
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="gemini-pro-vision">Gemini Pro Vision</option>
                  </>
                )}
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              APIキー
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  placeholder="APIキーを入力してください"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3"
              >
                {showApiKey ? '隠す' : '表示'}
              </Button>
              <Button
                variant="outline"
                onClick={testConnection}
                className="px-3"
              >
                テスト
              </Button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              APIキーは暗号化されて安全に保存されます
            </p>
          </div>
        </section>

        {/* Model Parameters Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={20} className="text-gray-500" />
            モデルパラメータ
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (創造性): {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>保守的</span>
                <span>バランス</span>
                <span>創造的</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大トークン数
              </label>
              <Input
                type="number"
                min="100"
                max="8192"
                value={settings.maxTokens}
                onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                className="w-32"
              />
              <p className="mt-1 text-sm text-gray-500">
                長い応答が必要な場合は値を大きくしてください
              </p>
            </div>
          </div>
        </section>

        {/* AI Features Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Brain size={20} className="text-gray-500" />
            AI機能設定
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoSuggestions}
                onChange={(e) => handleInputChange('autoSuggestions', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm text-gray-700 font-medium">自動提案</span>
                <p className="text-xs text-gray-500">タスク作成時にAIが関連する提案を行います</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.smartPrioritization}
                onChange={(e) => handleInputChange('smartPrioritization', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm text-gray-700 font-medium">スマート優先順位付け</span>
                <p className="text-xs text-gray-500">AIがタスクの優先順位を自動で判断します</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.contextAwareness}
                onChange={(e) => handleInputChange('contextAwareness', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm text-gray-700 font-medium">文脈認識</span>
                <p className="text-xs text-gray-500">過去の会話や作業履歴を考慮した応答を生成します</p>
              </div>
            </label>
          </div>
        </section>

        {/* Response Style Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-gray-500" />
            応答スタイル
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              応答の性格設定
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={settings.responseStyle}
              onChange={(e) => handleInputChange('responseStyle', e.target.value)}
            >
              <option value="professional">プロフェッショナル</option>
              <option value="friendly">フレンドリー</option>
              <option value="balanced">バランス</option>
              <option value="concise">簡潔</option>
              <option value="detailed">詳細</option>
            </select>
          </div>
        </section>

        {/* Privacy & Safety Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-gray-500" />
            プライバシー・安全性
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.safetyFilter}
                onChange={(e) => handleInputChange('safetyFilter', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm text-gray-700 font-medium">セーフティフィルター</span>
                <p className="text-xs text-gray-500">不適切なコンテンツの生成を防ぎます</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.anonymousMode}
                onChange={(e) => handleInputChange('anonymousMode', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm text-gray-700 font-medium">匿名モード</span>
                <p className="text-xs text-gray-500">個人情報を含まない匿名化された形でAIと対話します</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                データ保存期間
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={settings.dataRetention}
                onChange={(e) => handleInputChange('dataRetention', e.target.value)}
              >
                <option value="7days">7日間</option>
                <option value="30days">30日間</option>
                <option value="90days">90日間</option>
                <option value="1year">1年間</option>
                <option value="never">削除しない</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                AI会話履歴の自動削除期間を設定します
              </p>
            </div>
          </div>
        </section>

        {/* Warning Section */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">重要な注意事項</h4>
              <p className="text-sm text-amber-700">
                APIキーや機密情報は暗号化されて保存されますが、信頼できるプロバイダーのみを使用してください。
                また、機密性の高いタスクにはAI機能の使用を控えることを推奨します。
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? '保存中...' : 'AI設定を保存'}
          </Button>
          {saved && (
            <div className="ml-3 text-sm text-green-600 flex items-center">
              AI設定が保存されました
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISettings;