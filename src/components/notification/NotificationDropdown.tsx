import React from 'react';
import { Clock, UserCheck, CheckCircle, AtSign, FolderOpen, Settings, Bell } from 'lucide-react';
import { Notification, NotificationType, NotificationPriority } from '../../types/notification';
import { mockNotifications } from '../../mock/notifications';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

// 通知タイプ別のアイコン取得
const getNotificationIcon = (type: NotificationType) => {
  const iconProps = { className: "h-4 w-4" };
  
  switch (type) {
    case 'task_deadline':
      return <Clock {...iconProps} />;
    case 'task_assigned':
      return <UserCheck {...iconProps} />;
    case 'task_completed':
      return <CheckCircle {...iconProps} />;
    case 'mention':
      return <AtSign {...iconProps} />;
    case 'project_update':
      return <FolderOpen {...iconProps} />;
    case 'system':
      return <Settings {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
};

// 優先度別の色を取得
const getPriorityColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

// 時間フォーマット
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分前`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}時間前`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}日前`;
  }
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* ドロップダウン */}
      <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">通知</h3>
          <button 
            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            onClick={() => {/* TODO: すべて既読にする処理 */}}
          >
            すべて既読にする
          </button>
        </div>

        {/* 通知一覧 */}
        <div className="overflow-y-auto max-h-80">
          {mockNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">通知はありません</p>
            </div>
          ) : (
            mockNotifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  if (notification.actionUrl) {
                    // TODO: ナビゲーション処理
                  }
                  onClose();
                }}
              >
                <div className="flex items-start space-x-3">
                  {/* アイコン */}
                  <div className={`flex-shrink-0 ${getPriorityColor(notification.priority)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className={`text-sm font-medium ${
                        !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown;