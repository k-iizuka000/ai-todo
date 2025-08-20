import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle,
  FileJson,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataStats {
  totalTasks: number;
  totalProjects: number;
  totalFiles: number;
  lastBackup: string;
  dataSize: string;
}

const DataManagement: React.FC = () => {
  const [stats] = useState<DataStats>({
    totalTasks: 147,
    totalProjects: 8,
    totalFiles: 23,
    lastBackup: '2024-01-15T10:30:00Z',
    dataSize: '2.4 MB'
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [operationResult, setOperationResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setOperationResult(null);

    try {
      // シミュレーション：実際のエクスポート処理
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // モックデータの作成とダウンロード
      const exportData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        data: {
          tasks: [
            { id: 1, title: "サンプルタスク1", completed: false },
            { id: 2, title: "サンプルタスク2", completed: true }
          ],
          projects: [
            { id: 1, name: "サンプルプロジェクト", description: "テストプロジェクト" }
          ],
          settings: {
            theme: "light",
            language: "ja"
          }
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-todo-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setOperationResult({
        type: 'success',
        message: 'データのエクスポートが完了しました'
      });
    } catch (error) {
      setOperationResult({
        type: 'error',
        message: 'エクスポート中にエラーが発生しました'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setOperationResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        // バリデーション
        if (!importData.version || !importData.data) {
          throw new Error('無効なファイル形式です');
        }

        // シミュレーション：実際のインポート処理
        await new Promise(resolve => setTimeout(resolve, 1500));

        setOperationResult({
          type: 'success',
          message: `${importData.data.tasks?.length || 0}個のタスクと${importData.data.projects?.length || 0}個のプロジェクトをインポートしました`
        });
      } catch (error) {
        setOperationResult({
          type: 'error',
          message: 'ファイルの読み込み中にエラーが発生しました'
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
    // ファイル入力をリセット
    event.target.value = '';
  };

  const handleClearData = async () => {
    setIsClearing(true);
    setOperationResult(null);

    try {
      // シミュレーション：実際のデータクリア処理
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOperationResult({
        type: 'success',
        message: '全てのデータが削除されました'
      });
    } catch (error) {
      setOperationResult({
        type: 'error',
        message: 'データ削除中にエラーが発生しました'
      });
    } finally {
      setIsClearing(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">データ管理</h2>
        <p className="text-gray-600">データのバックアップ、インポート、エクスポートを管理します。</p>
      </div>

      {/* Operation Result */}
      {operationResult && (
        <div className={`mb-6 p-4 rounded-lg border ${
          operationResult.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {operationResult.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span className="text-sm font-medium">{operationResult.message}</span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Data Statistics */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Database size={20} className="text-gray-500" />
            データ統計
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
              <div className="text-sm text-gray-600">タスク</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
              <div className="text-sm text-gray-600">プロジェクト</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.totalFiles}</div>
              <div className="text-sm text-gray-600">添付ファイル</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.dataSize}</div>
              <div className="text-sm text-gray-600">データサイズ</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              最終バックアップ: {formatDate(stats.lastBackup)}
            </p>
          </div>
        </section>

        {/* Export Data */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Download size={20} className="text-gray-500" />
            データエクスポート
          </h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start gap-4">
              <FileJson size={24} className="text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">JSON形式でエクスポート</h4>
                <p className="text-sm text-gray-600 mb-4">
                  全てのタスク、プロジェクト、設定をJSON形式でエクスポートします。
                  このファイルは他のデバイスでのインポートやバックアップとして使用できます。
                </p>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      エクスポート中...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      データをエクスポート
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Import Data */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-gray-500" />
            データインポート
          </h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start gap-4">
              <FileJson size={24} className="text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">バックアップファイルをインポート</h4>
                <p className="text-sm text-gray-600 mb-4">
                  以前にエクスポートしたJSONファイルからデータをインポートします。
                  既存のデータに追加される形でインポートされます。
                </p>
                <div className="flex items-center gap-2">
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Button
                      as="span"
                      disabled={isImporting}
                      className="flex items-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          インポート中...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          ファイルを選択
                        </>
                      )}
                    </Button>
                  </label>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                    disabled={isImporting}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sync */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw size={20} className="text-gray-500" />
            データ同期
          </h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start gap-4">
              <Shield size={24} className="text-indigo-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">自動バックアップ設定</h4>
                <p className="text-sm text-gray-600 mb-4">
                  クラウドストレージへの自動バックアップ機能は今後のアップデートで提供予定です。
                  現在は手動でのエクスポート・インポートをご利用ください。
                </p>
                <Button variant="outline" disabled>
                  <RefreshCw size={16} />
                  今後提供予定
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h3 className="text-lg font-medium text-red-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            危険な操作
          </h3>
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <div className="flex items-start gap-4">
              <Trash2 size={24} className="text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-2">全データの削除</h4>
                <p className="text-sm text-red-700 mb-4">
                  全てのタスク、プロジェクト、設定を完全に削除します。
                  この操作は取り消すことができません。実行前に必ずデータをエクスポートしてください。
                </p>
                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    全データを削除
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-red-900">
                      本当に全てのデータを削除しますか？この操作は元に戻せません。
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleClearData}
                        disabled={isClearing}
                        className="flex items-center gap-2"
                      >
                        {isClearing ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            削除中...
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} />
                            削除を実行
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isClearing}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DataManagement;