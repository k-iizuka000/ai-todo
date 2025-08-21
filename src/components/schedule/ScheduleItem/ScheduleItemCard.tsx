import React from 'react';
import { ScheduleItem, ScheduleItemStatus } from '@/types/schedule';
import { Clock, User, Tag, AlertCircle, CheckCircle, PlayCircle, PauseCircle, XCircle } from 'lucide-react';
import { Badge, Button } from '@/components/ui';

interface ScheduleItemCardProps {
  item: ScheduleItem;
  view: 'full' | 'compact' | 'mini';
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: ScheduleItemStatus) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isSelected?: boolean;
  showProgress?: boolean;
  showActions?: boolean;
  className?: string;
}

const ScheduleItemCard: React.FC<ScheduleItemCardProps> = ({
  item,
  view,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragEnd,
  isDragging = false,
  isSelected = false,
  showProgress = true,
  showActions = true,
  className = ''
}) => {
  // ステータスアイコンを取得
  const getStatusIcon = (status: ScheduleItemStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'postponed':
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // ステータスラベルを取得
  const getStatusLabel = (status: ScheduleItemStatus) => {
    switch (status) {
      case 'planned':
        return '予定';
      case 'in_progress':
        return '進行中';
      case 'completed':
        return '完了';
      case 'postponed':
        return '延期';
      case 'cancelled':
        return 'キャンセル';
      default:
        return status;
    }
  };

  // 優先度の色を取得
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'urgent':
        return 'bg-orange-500';
      case 'high':
        return 'bg-yellow-500';
      case 'medium':
        return 'bg-green-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // タイプのラベルを取得
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task':
        return 'タスク';
      case 'subtask':
        return 'サブタスク';
      case 'meeting':
        return '会議';
      case 'break':
        return '休憩';
      case 'personal':
        return '個人';
      case 'blocked':
        return 'ブロック';
      case 'focus':
        return '集中';
      case 'review':
        return 'レビュー';
      default:
        return type;
    }
  };

  // カードのスタイルを取得
  const getCardStyle = () => {
    let baseStyle = 'border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md';
    
    if (isDragging) {
      baseStyle += ' opacity-50 scale-95';
    }
    
    if (isSelected) {
      baseStyle += ' ring-2 ring-blue-500 ring-opacity-50';
    }
    
    if (item.status === 'completed') {
      baseStyle += ' opacity-75';
    }
    
    return baseStyle;
  };

  // ミニビューの場合
  if (view === 'mini') {
    return (
      <div
        className={`${getCardStyle()} ${className}`}
        style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {getStatusIcon(item.status)}
            <span className="font-medium text-sm truncate">{item.title}</span>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {item.startTime}
          </span>
        </div>
      </div>
    );
  }

  // コンパクトビューの場合
  if (view === 'compact') {
    return (
      <div
        className={`${getCardStyle()} ${className}`}
        style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {getStatusIcon(item.status)}
              <span className="font-medium truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} />
              <span className="text-sm text-gray-500">
                {item.startTime} - {item.endTime}
              </span>
            </div>
          </div>
          
          {showProgress && item.completionRate !== undefined && item.completionRate > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${item.completionRate}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // フルビューの場合
  return (
    <div
      className={`${getCardStyle()} ${className}`}
      style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-3">
        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            {getStatusIcon(item.status)}
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {item.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" size="sm">
              {getTypeLabel(item.type)}
            </Badge>
            <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
          </div>
        </div>
        
        {/* 時間情報 */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{item.startTime} - {item.endTime}</span>
            <span className="text-gray-400">({item.duration}分)</span>
          </div>
          
          {item.estimatedTime && (
            <div className="flex items-center gap-1">
              <span>見積: {item.estimatedTime}分</span>
            </div>
          )}
          
          {item.actualTime && (
            <div className="flex items-center gap-1">
              <span>実績: {item.actualTime}分</span>
            </div>
          )}
        </div>
        
        {/* プログレスバー */}
        {showProgress && item.completionRate !== undefined && item.completionRate > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">進捗</span>
              <span className="text-gray-600 dark:text-gray-400">{item.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${item.completionRate}%` }}
              />
            </div>
          </div>
        )}
        
        {/* タグ */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="h-4 w-4 text-gray-500" />
            {item.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* アクション */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Badge 
                variant={item.status === 'completed' ? 'default' : 'outline'}
                className="text-xs"
              >
                {getStatusLabel(item.status)}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              {onStatusChange && item.status !== 'completed' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(item.status === 'in_progress' ? 'completed' : 'in_progress');
                  }}
                >
                  {item.status === 'in_progress' ? '完了' : '開始'}
                </Button>
              )}
              
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  編集
                </Button>
              )}
              
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  削除
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleItemCard;