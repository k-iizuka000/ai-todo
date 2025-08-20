import React, { useState } from 'react';
import { User, Mail, Globe, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GeneralSettingsData {
  displayName: string;
  email: string;
  language: string;
  timezone: string;
  dateFormat: string;
  weekStartsOn: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
  };
}

const GeneralSettings: React.FC = () => {
  const [settings, setSettings] = useState<GeneralSettingsData>({
    displayName: 'ユーザー名',
    email: 'user@example.com',
    language: 'ja',
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY/MM/DD',
    weekStartsOn: 'monday',
    notifications: {
      email: true,
      push: false,
      desktop: true,
    },
    privacy: {
      profileVisible: true,
      activityVisible: false,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof GeneralSettingsData] as any,
        [field]: value
      }
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">一般設定</h2>
        <p className="text-gray-600">アカウント情報と基本的な設定を管理します。</p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <User size={20} className="text-gray-500" />
            プロフィール情報
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表示名
              </label>
              <Input
                type="text"
                value={settings.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="表示名を入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="メールアドレスを入力"
              />
            </div>
          </div>
        </section>

        {/* Localization Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Globe size={20} className="text-gray-500" />
            地域化設定
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                言語
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={settings.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイムゾーン
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={settings.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
              >
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>
        </section>

        {/* Date & Time Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-gray-500" />
            日付・時刻設定
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日付形式
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={settings.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
              >
                <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                週の開始日
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={settings.weekStartsOn}
                onChange={(e) => handleInputChange('weekStartsOn', e.target.value)}
              >
                <option value="sunday">日曜日</option>
                <option value="monday">月曜日</option>
              </select>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Mail size={20} className="text-gray-500" />
            通知設定
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => handleNestedChange('notifications', 'email', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">メール通知を受け取る</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => handleNestedChange('notifications', 'push', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">プッシュ通知を受け取る</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.desktop}
                onChange={(e) => handleNestedChange('notifications', 'desktop', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">デスクトップ通知を受け取る</span>
            </label>
          </div>
        </section>

        {/* Privacy Section */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">プライバシー設定</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.privacy.profileVisible}
                onChange={(e) => handleNestedChange('privacy', 'profileVisible', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">プロフィールを他のユーザーに公開する</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.privacy.activityVisible}
                onChange={(e) => handleNestedChange('privacy', 'activityVisible', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">アクティビティを他のユーザーに表示する</span>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
          {saved && (
            <div className="ml-3 text-sm text-green-600 flex items-center">
              設定が保存されました
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;