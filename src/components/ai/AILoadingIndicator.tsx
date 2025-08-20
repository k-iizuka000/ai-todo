import * as React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Brain,
  Zap, 
  Lightbulb,
  Target,
  TrendingUp,
  MessageSquare,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

// AI処理状態の型定義
export type AIProcessingStage = 
  | 'initializing'
  | 'analyzing'
  | 'processing'
  | 'generating'
  | 'optimizing'
  | 'finalizing'
  | 'completed'
  | 'error'

export interface AILoadingIndicatorProps {
  stage?: AIProcessingStage
  message?: string
  progress?: number // 0-100
  processingTime?: number // seconds
  showStageDetails?: boolean
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
  onCancel?: () => void
}

// 各段階の詳細情報
const stageInfo: Record<AIProcessingStage, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  estimatedDuration: number // seconds
}> = {
  initializing: {
    label: 'AI初期化中',
    description: 'AIモデルを起動しています...',
    icon: Brain,
    color: 'text-blue-600',
    estimatedDuration: 2
  },
  analyzing: {
    label: 'データ分析中',
    description: 'タスクデータを解析しています...',
    icon: Target,
    color: 'text-green-600',
    estimatedDuration: 5
  },
  processing: {
    label: 'AI処理中',
    description: 'パターンを認識しています...',
    icon: Zap,
    color: 'text-yellow-600',
    estimatedDuration: 8
  },
  generating: {
    label: '提案生成中',
    description: '最適な提案を生成しています...',
    icon: Lightbulb,
    color: 'text-purple-600',
    estimatedDuration: 6
  },
  optimizing: {
    label: '最適化中',
    description: '結果を最適化しています...',
    icon: TrendingUp,
    color: 'text-orange-600',
    estimatedDuration: 4
  },
  finalizing: {
    label: '最終調整中',
    description: '出力を整理しています...',
    icon: MessageSquare,
    color: 'text-indigo-600',
    estimatedDuration: 3
  },
  completed: {
    label: '完了',
    description: 'AI処理が完了しました',
    icon: CheckCircle2,
    color: 'text-green-600',
    estimatedDuration: 0
  },
  error: {
    label: 'エラー',
    description: '処理中にエラーが発生しました',
    icon: AlertCircle,
    color: 'text-red-600',
    estimatedDuration: 0
  }
}

// ローディング段階のプログレッシブメッセージ
const loadingMessages = [
  "AI がタスクを分析しています...",
  "最適な解決策を検索しています...",
  "パターンを認識中です...",
  "データを処理しています...",
  "提案を生成中です...",
  "結果を最適化しています...",
  "もう少しお待ちください...",
  "最終調整を行っています..."
]

// パルスアニメーション付きブレイン
const AnimatedBrain: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("relative", className)}>
    <Brain className="h-8 w-8 text-primary relative z-10" />
    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
    <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
  </div>
)

// ドットローディング
const AILoadingDots: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("flex space-x-1", className)}>
    {[0, 1, 2].map((index) => (
      <div
        key={index}
        className="w-2 h-2 bg-primary rounded-full animate-bounce"
        style={{
          animationDelay: `${index * 0.15}s`,
          animationDuration: '0.6s'
        }}
      />
    ))}
  </div>
)

// プログレスリング
const ProgressRing: React.FC<{ 
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
}> = ({ 
  progress, 
  size = 64, 
  strokeWidth = 4,
  className 
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

const AILoadingIndicator: React.FC<AILoadingIndicatorProps> = ({
  stage = 'processing',
  message,
  progress = 0,
  processingTime = 0,
  showStageDetails = true,
  variant = 'default',
  className,
  onCancel
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // メッセージローテーション
  useEffect(() => {
    if (!message && variant !== 'compact') {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [message, variant])

  // 経過時間カウント
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const currentStage = stageInfo[stage]
  const Icon = currentStage.icon
  const displayMessage = message || (variant === 'compact' ? currentStage.label : loadingMessages[currentMessageIndex])

  // コンパクトバリアント
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-3 p-3", className)}>
        <div className="relative">
          <Icon className={cn("h-5 w-5 animate-pulse", currentStage.color)} />
          {stage !== 'completed' && stage !== 'error' && (
            <div className="absolute -inset-1 rounded-full border border-current opacity-30 animate-ping" />
          )}
        </div>
        <span className="text-sm font-medium">{displayMessage}</span>
        {progress > 0 && (
          <Badge variant="outline" className="ml-auto">
            {Math.round(progress)}%
          </Badge>
        )}
      </div>
    )
  }

  // 詳細バリアント
  if (variant === 'detailed') {
    return (
      <Card className={cn("p-6", className)}>
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AnimatedBrain />
              <div>
                <h3 className="text-lg font-semibold">AI Processing</h3>
                <p className="text-sm text-muted-foreground">高度な分析を実行中</p>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center space-x-1">
              <RotateCcw className="h-3 w-3" />
              <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
            </Badge>
          </div>

          {/* 進行状況 */}
          <div className="flex items-center space-x-6">
            <ProgressRing progress={progress} />
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-3">
                <Icon className={cn("h-5 w-5", currentStage.color)} />
                <span className="font-medium">{currentStage.label}</span>
                {stage !== 'completed' && stage !== 'error' && <AILoadingDots />}
              </div>
              <p className="text-sm text-muted-foreground">{currentStage.description}</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 段階詳細 */}
          {showStageDetails && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">処理段階</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(stageInfo).map(([key, info]) => {
                  if (key === 'completed' || key === 'error') return null
                  const isActive = key === stage
                  const isPassed = ['initializing', 'analyzing', 'processing', 'generating', 'optimizing', 'finalizing'].indexOf(key) 
                    < ['initializing', 'analyzing', 'processing', 'generating', 'optimizing', 'finalizing'].indexOf(stage)
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-md transition-colors",
                        isActive && "bg-primary/10 border border-primary/20",
                        isPassed && "bg-green-50 border border-green-200",
                        !isActive && !isPassed && "bg-muted/30"
                      )}
                    >
                      <info.icon className={cn(
                        "h-3 w-3",
                        isActive ? info.color : isPassed ? "text-green-600" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        isActive ? "font-medium" : isPassed ? "text-green-800" : "text-muted-foreground"
                      )}>
                        {info.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {onCancel && stage !== 'completed' && stage !== 'error' && (
            <div className="flex justify-center pt-4 border-t">
              <button
                onClick={onCancel}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // デフォルトバリアント
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Icon className={cn("h-8 w-8 animate-pulse", currentStage.color)} />
          </div>
          {stage !== 'completed' && stage !== 'error' && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border border-primary/10 animate-pulse" style={{ animationDelay: '1s' }} />
            </>
          )}
          {stage !== 'completed' && stage !== 'error' && (
            <div className="absolute -bottom-2 -right-2">
              <Sparkles className="h-4 w-4 text-primary animate-bounce" />
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{currentStage.label}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {displayMessage}
          </p>
          
          {progress > 0 && (
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>進行状況</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          {processingTime > 0 && (
            <p className="text-xs text-muted-foreground">
              推定残り時間: {Math.max(0, processingTime - elapsedTime)}秒
            </p>
          )}
        </div>
        
        {onCancel && stage !== 'completed' && stage !== 'error' && (
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            処理をキャンセル
          </button>
        )}
      </div>
    </Card>
  )
}

export { AILoadingIndicator, AnimatedBrain, AILoadingDots, ProgressRing }