/**
 * 接続状態表示UIコンポーネント
 * ヘッダーエリアに配置され、API接続状態を常時表示
 */

import React, { useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConnectionStore, useConnectionStatus, useConnectionError, useIsHealthy } from '@/stores/connectionStore';
import { useTaskStore } from '@/stores/taskStore';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean; // ラベル表示の有無
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = "", 
  showLabel = true 
}) => {
  const connectionStatus = useConnectionStatus();
  const connectionError = useConnectionError();
  const isHealthy = useIsHealthy();
  const { setReconnecting, setConnected } = useConnectionStore();
  const { isMockMode, pendingSyncCount, handleConnectionRestore } = useTaskStore();

  // 接続復旧時の自動処理
  useEffect(() => {
    if (connectionStatus === 'connected' && isMockMode) {
      // 接続が復旧した場合の自動同期
      handleConnectionRestore();
    }
  }, [connectionStatus, isMockMode, handleConnectionRestore]);

  const handleManualReconnect = async () => {
    try {
      setReconnecting(1);
      
      // APIヘルスチェックを実行
      const response = await fetch('/api/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) 
      });
      
      if (response.ok) {
        setConnected();
        // TaskStoreの接続復旧処理をトリガー
        handleConnectionRestore();
      } else {
        throw new Error('API health check failed');
      }
    } catch (error) {
      console.error('Manual reconnect failed:', error);
      // エラー状態は自動的に維持される
    }
  };

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: isHealthy ? CheckCircle : Wifi,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: isMockMode && pendingSyncCount > 0 
            ? `接続済み (${pendingSyncCount}件同期待ち)`
            : '接続済み',
          pulse: false
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: '再接続中...',
          pulse: true
        };
      case 'offline':
      default:
        return {
          icon: isMockMode ? AlertTriangle : WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: isMockMode 
            ? `オフライン (${pendingSyncCount}件保留中)`
            : 'オフライン',
          pulse: false
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 接続状態インジケーター */}
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200
        ${statusConfig.bgColor} ${statusConfig.borderColor}
      `}>
        <StatusIcon 
          className={`
            h-4 w-4 ${statusConfig.color}
            ${statusConfig.pulse ? 'animate-spin' : ''}
          `} 
        />
        
        {showLabel && (
          <span className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* 再接続ボタン（オフライン時のみ表示） */}
      {connectionStatus === 'offline' && (
        <button
          onClick={handleManualReconnect}
          disabled={connectionStatus === 'reconnecting'}
          className="
            flex items-center gap-1 px-2 py-1 text-xs 
            bg-blue-600 text-white rounded hover:bg-blue-700
            disabled:bg-gray-400 disabled:cursor-not-allowed
            transition-colors duration-200
          "
          title="接続を再試行"
        >
          <RefreshCw className="h-3 w-3" />
          再試行
        </button>
      )}

      {/* エラー詳細表示（エラーがある場合のみ） */}
      {connectionError && connectionStatus === 'offline' && (
        <div className="relative group">
          <AlertTriangle className="h-4 w-4 text-red-500 cursor-help" />
          <div className="
            absolute right-0 top-6 w-64 p-2 
            bg-red-50 border border-red-200 rounded-lg shadow-lg
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            z-50 text-xs text-red-800
          ">
            <strong>エラー詳細:</strong>
            <br />
            {connectionError.message}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * コンパクトな接続状態インジケーター
 * アイコンのみの表示
 */
export const ConnectionStatusIcon: React.FC<{ className?: string }> = ({ 
  className = "" 
}) => {
  return <ConnectionStatus className={className} showLabel={false} />;
};

/**
 * 接続状態バナー（全幅表示）
 * 接続問題がある場合にページ上部に表示
 */
export const ConnectionStatusBanner: React.FC = () => {
  const connectionStatus = useConnectionStatus();
  const { isMockMode, pendingSyncCount } = useTaskStore();

  // 正常な接続状態では表示しない
  if (connectionStatus === 'connected' && !isMockMode) {
    return null;
  }

  const getBannerConfig = () => {
    if (connectionStatus === 'reconnecting') {
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        message: 'サーバーへの再接続を試行中です...'
      };
    }

    if (isMockMode && pendingSyncCount > 0) {
      return {
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200',
        message: `オフラインモードで動作中です。${pendingSyncCount}件のデータが同期待ちです。`
      };
    }

    return {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      message: 'サーバーとの接続に問題があります。一部の機能が制限される場合があります。'
    };
  };

  const bannerConfig = getBannerConfig();

  return (
    <div className={`
      w-full px-4 py-3 border-b
      ${bannerConfig.bgColor} ${bannerConfig.borderColor}
    `}>
      <div className="flex items-center justify-center">
        <div className={`flex items-center gap-2 ${bannerConfig.textColor}`}>
          {connectionStatus === 'reconnecting' ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {bannerConfig.message}
          </span>
        </div>
      </div>
    </div>
  );
};