import React from 'react';
import { Calendar, Users, DollarSign, TrendingUp, Clock, MoreVertical, Settings, Archive } from 'lucide-react';
import { Project, ProjectWithStats } from '@/types/project';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project | ProjectWithStats;
  onClick?: (project: Project) => void;
  onSettingsClick?: (project: Project) => void;
  onArchiveClick?: (project: Project) => void;
  showStats?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * プロジェクトカード表示コンポーネント
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  onSettingsClick,
  onArchiveClick,
  showStats = true,
  className,
  variant = 'default',
}) => {
  const stats = 'stats' in project ? project.stats : null;

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      planning: '計画中',
      active: 'アクティブ',
      on_hold: '保留中',
      completed: '完了',
      cancelled: 'キャンセル',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      planning: 'text-blue-600 bg-blue-50 border-blue-200',
      active: 'text-green-600 bg-green-50 border-green-200',
      on_hold: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      completed: 'text-gray-600 bg-gray-50 border-gray-200',
      cancelled: 'text-red-600 bg-red-50 border-red-200',
    };
    return colorMap[status as keyof typeof colorMap] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colorMap[priority as keyof typeof colorMap] || 'bg-gray-500';
  };

  const getPriorityLabel = (priority: string) => {
    const labelMap = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '緊急',
    };
    return labelMap[priority as keyof typeof labelMap] || priority;
  };

  const formatCurrency = (amount?: number): string => {
    if (!amount) return '未設定';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      notation: 'compact',
    }).format(amount);
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '未設定';
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDaysUntilDeadline = (): { days: number; isOverdue: boolean } | null => {
    if (!project.deadline) return null;
    const today = new Date();
    const deadline = new Date(project.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days: diffDays, isOverdue: diffDays < 0 };
  };

  const deadlineInfo = getDaysUntilDeadline();

  const handleCardClick = () => {
    onClick?.(project);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSettingsClick?.(project);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchiveClick?.(project);
  };

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md border-l-4',
          className
        )}
        style={{ borderLeftColor: project.color }}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                {project.icon && (
                  <span className="text-xl">{project.icon}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{project.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getStatusColor(project.status))}
                  >
                    {getStatusDisplay(project.status)}
                  </Badge>
                  <div className={cn('w-2 h-2 rounded-full', getPriorityColor(project.priority))} />
                </div>
              </div>
            </div>
            {stats && (
              <div className="text-right text-sm text-muted-foreground">
                <div>{stats.completedTasks}/{stats.totalTasks}</div>
                <div>{stats.progressPercentage}%</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg hover:translate-y-[-1px] border-l-4',
        project.isArchived && 'opacity-60',
        className
      )}
      style={{ borderLeftColor: project.color }}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            {project.icon && (
              <span className="text-2xl flex-shrink-0">{project.icon}</span>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            {onSettingsClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSettingsClick}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {onArchiveClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchiveClick}
                className="h-8 w-8 p-0"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-3">
          <Badge
            variant="outline"
            className={cn('text-xs', getStatusColor(project.status))}
          >
            {getStatusDisplay(project.status)}
          </Badge>
          
          <div className="flex items-center space-x-1">
            <div className={cn('w-2 h-2 rounded-full', getPriorityColor(project.priority))} />
            <span className="text-xs text-muted-foreground">
              {getPriorityLabel(project.priority)}
            </span>
          </div>

          {deadlineInfo && (
            <Badge
              variant={deadlineInfo.isOverdue ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              {deadlineInfo.isOverdue 
                ? `${Math.abs(deadlineInfo.days)}日超過`
                : `${deadlineInfo.days}日後`
              }
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* プロジェクト統計 */}
        {showStats && stats && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">進捗</span>
              <span className="font-medium">{stats.progressPercentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.progressPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="font-medium text-foreground">{stats.totalTasks}</div>
                <div>総タスク</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{stats.completedTasks}</div>
                <div>完了</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{stats.inProgressTasks}</div>
                <div>進行中</div>
              </div>
            </div>
          </div>
        )}

        {/* プロジェクト情報 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>メンバー</span>
            </div>
            <span className="font-medium">{project.members.length}名</span>
          </div>

          {project.budget && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>予算</span>
              </div>
              <span className="font-medium">{formatCurrency(project.budget)}</span>
            </div>
          )}

          {project.deadline && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>締切</span>
              </div>
              <span className={cn(
                'font-medium',
                deadlineInfo?.isOverdue && 'text-red-600'
              )}>
                {formatDate(project.deadline)}
              </span>
            </div>
          )}

          {showStats && stats && stats.estimatedHours > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>予定工数</span>
              </div>
              <span className="font-medium">{stats.estimatedHours}h</span>
            </div>
          )}
        </div>

        {/* タグ */}
        {project.tags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-0.5"
                >
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0.5"
                >
                  +{project.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};