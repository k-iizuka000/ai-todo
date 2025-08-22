import React from 'react';
import { 
  Clock, 
  UserCheck, 
  CheckCircle, 
  AtSign, 
  FolderOpen, 
  Settings, 
  Bell 
} from 'lucide-react';
import { Notification, NotificationType } from '../../types/notification';
// getPriorityColor関数をローカルで定義
const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
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

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

// アイコンコンポーネントのマッピング
const iconComponents = {
  Clock,
  UserCheck,
  CheckCircle,
  AtSign,
  FolderOpen,
  Settings,
  Bell
};

const getIconComponent = (type: NotificationType) => {
  switch (type) {
    case 'task_deadline':
      return iconComponents.Clock;
    case 'task_assigned':
      return iconComponents.UserCheck;
    case 'task_completed':
      return iconComponents.CheckCircle;
    case 'mention':
      return iconComponents.AtSign;
    case 'project_update':
      return iconComponents.FolderOpen;
    case 'system':
      return iconComponents.Settings;
    default:
      return iconComponents.Bell;
  }
};

// 簡易的な相対時間表示（date-fnsの代替）
const formatTimeAgo = (date: Date): string => {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '日時不明';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  } catch (error) {
    console.error('formatTimeAgo: 日付フォーマットエラー', error);
    return '日時不明';
  }
};

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClick 
}) => {
  // 必須プロパティの検証
  if (!notification || !notification.id || !notification.title) {
    console.warn('NotificationItem: 必須プロパティが不足しています', notification);
    return null;
  }

  const IconComponent = getIconComponent(notification.type);
  const priorityColor = getPriorityColor(notification.priority);
  
  const handleClick = () => {
    try {
      if (onClick) {
        onClick(notification);
      }
    } catch (error) {
      console.error('NotificationItem: クリックハンドラでエラーが発生しました', error);
    }
  };

  return (
    <div
      className={`
        p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors duration-200
        hover:bg-gray-50 
        ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`通知: ${notification.title}. ${notification.isRead ? '既読' : '未読'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start space-x-3">
        {/* アイコン */}
        <div className={`flex-shrink-0 p-2 rounded-full ${
          notification.priority === 'high' ? 'bg-red-100' :
          notification.priority === 'medium' ? 'bg-yellow-100' :
          'bg-gray-100'
        }`}>
          <IconComponent className={`h-4 w-4 ${priorityColor}`} />
        </div>

        {/* 通知内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium truncate ${
              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <div className="flex-shrink-0 ml-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>
          
          <p 
            className="text-sm text-gray-600 mt-1"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {notification.message}
          </p>
          
          <p className="text-xs text-gray-500 mt-2">
            {formatTimeAgo(notification.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;