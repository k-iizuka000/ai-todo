import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/project';

interface ProjectDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (projectId: string) => Promise<void>;
  project: Project;
  relatedTaskCount: number;
}

/**
 * プロジェクト削除確認モーダル
 * 関連タスク数を表示し、ユーザーに適切な警告を提供
 */
export const ProjectDeleteConfirmModal: React.FC<ProjectDeleteConfirmModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  project,
  relatedTaskCount,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isDeleting) return;
    
    // 関連タスクがある場合は削除を拒否
    if (relatedTaskCount > 0) {
      setError(`このプロジェクトには${relatedTaskCount}個の関連タスクがあります。関連タスクを削除または他のプロジェクトに移動してから、プロジェクトを削除してください。`);
      return;
    }

    setIsDeleting(true);
    setError(null);
    
    try {
      await onConfirm(project.id);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'プロジェクトの削除に失敗しました';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setError(null);
    onOpenChange(false);
  };

  const canDelete = relatedTaskCount === 0;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="プロジェクトを削除"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm} 
            disabled={isDeleting || !canDelete}
            className="flex items-center space-x-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>{isDeleting ? '削除中...' : '削除'}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 警告アイコンと基本メッセージ */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-2">
              プロジェクト「{project.name}」を削除しようとしています。
            </p>
            <p className="text-sm text-muted-foreground">
              この操作は取り消すことができません。
            </p>
          </div>
        </div>

        {/* 関連タスク情報の表示 */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-foreground">関連タスク:</span>
            <span className={`text-sm font-bold ${relatedTaskCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {relatedTaskCount}個
            </span>
          </div>
          
          {relatedTaskCount > 0 ? (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    削除できません
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    このプロジェクトには{relatedTaskCount}個の関連タスクがあります。
                    関連タスクを削除または他のプロジェクトに移動してから、プロジェクトを削除してください。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    削除可能
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    このプロジェクトに関連タスクはありません。安全に削除できます。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* プロジェクト情報の表示 */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {project.icon && (
                <span className="text-xl">{project.icon}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {project.name}
              </p>
              {project.description && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: project.color || '#3B82F6' }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};