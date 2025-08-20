import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton, LoadingDots, ProgressBar } from "@/components/ui/loading"
import { cn } from "@/lib/utils"
import { 
  Zap,
  TrendingUp,
  Clock,
  Target,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Calendar,
  MessageSquare,
  Lightbulb,
  RefreshCw
} from "lucide-react"

// 最適化提案の型定義
interface OptimizationMetric {
  name: string
  current: number
  optimized: number
  unit: string
  improvementPercentage: number
  category: 'time' | 'efficiency' | 'quality' | 'cost'
}

interface OptimizationSuggestion {
  id: string
  title: string
  description: string
  category: 'workflow' | 'priority' | 'resource' | 'automation' | 'collaboration'
  impact: 'high' | 'medium' | 'low'
  effort: 'easy' | 'medium' | 'hard'
  metrics: OptimizationMetric[]
  reasoning: string
  actionItems: {
    id: string
    description: string
    estimatedTime: number
    priority: number
  }[]
  risks?: string[]
  benefits: string[]
}

interface ProjectOptimizationData {
  projectName: string
  totalTasks: number
  completionRate: number
  averageTaskTime: number
  upcomingDeadlines: number
  teamUtilization: number
  suggestions: OptimizationSuggestion[]
}

export interface AIOptimizationProps {
  projectData?: ProjectOptimizationData
  isLoading?: boolean
  onAcceptSuggestion?: (suggestion: OptimizationSuggestion) => void
  onRejectSuggestion?: (suggestionId: string) => void
  onRequestAnalysis?: () => void
  className?: string
}

// ダミーデータ生成関数
const generateMockOptimizationData = (): ProjectOptimizationData => ({
  projectName: "Webアプリケーション開発",
  totalTasks: 45,
  completionRate: 68,
  averageTaskTime: 4.2,
  upcomingDeadlines: 8,
  teamUtilization: 85,
  suggestions: [
    {
      id: "opt-1",
      title: "並行タスクの最適化",
      description: "現在シーケンシャルに実行されているタスクを並行実行することで、全体的な完了時間を短縮できます。",
      category: "workflow",
      impact: "high",
      effort: "medium",
      metrics: [
        {
          name: "完了予定日",
          current: 30,
          optimized: 22,
          unit: "日",
          improvementPercentage: 27,
          category: "time"
        },
        {
          name: "チーム効率",
          current: 75,
          optimized: 90,
          unit: "%",
          improvementPercentage: 20,
          category: "efficiency"
        }
      ],
      reasoning: "依存関係の分析により、3つのタスクグループが並行実行可能であることが判明しました。リソース配分を最適化することで大幅な時間短縮が見込めます。",
      actionItems: [
        {
          id: "action-1",
          description: "タスク依存関係の再評価",
          estimatedTime: 2,
          priority: 1
        },
        {
          id: "action-2", 
          description: "チームメンバーの作業割り当て調整",
          estimatedTime: 1,
          priority: 2
        },
        {
          id: "action-3",
          description: "並行実行スケジュールの作成",
          estimatedTime: 3,
          priority: 3
        }
      ],
      benefits: [
        "プロジェクト完了時間の27%短縮",
        "チーム効率の20%向上",
        "リソース使用率の最適化"
      ],
      risks: [
        "並行作業による品質リスク",
        "コミュニケーション量の増加"
      ]
    },
    {
      id: "opt-2",
      title: "高優先度タスクの集中化",
      description: "重要度の高いタスクをより早期に完了させることで、プロジェクト全体のリスクを軽減できます。",
      category: "priority",
      impact: "medium",
      effort: "easy",
      metrics: [
        {
          name: "クリティカルパス",
          current: 18,
          optimized: 14,
          unit: "日", 
          improvementPercentage: 22,
          category: "time"
        },
        {
          name: "リスクスコア",
          current: 65,
          optimized: 40,
          unit: "点",
          improvementPercentage: 38,
          category: "quality"
        }
      ],
      reasoning: "現在の優先度付けでは、高リスクタスクが後回しになっています。これらを前倒しすることで、プロジェクト全体の安定性が向上します。",
      actionItems: [
        {
          id: "action-4",
          description: "タスク優先度の再評価",
          estimatedTime: 1,
          priority: 1
        },
        {
          id: "action-5",
          description: "高優先度タスクのスケジュール前倒し",
          estimatedTime: 2,
          priority: 2
        }
      ],
      benefits: [
        "プロジェクトリスクの38%削減",
        "クリティカルパスの22%短縮",
        "早期の問題発見・解決"
      ]
    }
  ]
})

// カテゴリ別のアイコンと色
const getCategoryInfo = (category: string) => {
  switch (category) {
    case 'workflow':
      return { icon: BarChart3, label: 'ワークフロー', color: 'text-blue-600' }
    case 'priority':
      return { icon: Target, label: '優先度', color: 'text-red-600' }
    case 'resource':
      return { icon: Users, label: 'リソース', color: 'text-green-600' }
    case 'automation':
      return { icon: Zap, label: '自動化', color: 'text-purple-600' }
    case 'collaboration':
      return { icon: MessageSquare, label: 'コラボレーション', color: 'text-orange-600' }
    default:
      return { icon: Lightbulb, label: '一般', color: 'text-gray-600' }
  }
}

// インパクトとエフォートのバッジ色
const getImpactVariant = (impact: string) => {
  switch (impact) {
    case 'high': return 'destructive'
    case 'medium': return 'secondary'
    case 'low': return 'outline'
    default: return 'secondary'
  }
}

const getEffortColor = (effort: string) => {
  switch (effort) {
    case 'easy': return 'text-green-600'
    case 'medium': return 'text-yellow-600'
    case 'hard': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

const AIOptimization: React.FC<AIOptimizationProps> = ({
  projectData,
  isLoading = false,
  onAcceptSuggestion,
  onRejectSuggestion,
  onRequestAnalysis,
  className
}) => {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)

  const toggleExpanded = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions)
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId)
    } else {
      newExpanded.add(suggestionId)
    }
    setExpandedSuggestions(newExpanded)
  }

  // ダミーデータを表示（実際のAI連携なし）
  const displayData = projectData || generateMockOptimizationData()

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI 最適化提案</h3>
            <LoadingDots size="sm" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </div>
          
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* ヘッダーと概要統計 */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-xl font-semibold">AI 最適化提案</h3>
              <p className="text-sm text-muted-foreground">{displayData.projectName}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRequestAnalysis}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            再分析
          </Button>
        </div>

        {/* プロジェクト概要メトリクス */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{displayData.totalTasks}</div>
            <div className="text-xs text-muted-foreground">総タスク数</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-2">完了率</div>
            <div className="text-xl font-bold mb-1">{displayData.completionRate}%</div>
            <ProgressBar value={displayData.completionRate} variant="success" />
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold">{displayData.averageTaskTime}h</div>
            <div className="text-xs text-muted-foreground">平均タスク時間</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{displayData.upcomingDeadlines}</div>
            <div className="text-xs text-muted-foreground">近日締切</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-2">チーム使用率</div>
            <div className="text-xl font-bold mb-1">{displayData.teamUtilization}%</div>
            <ProgressBar 
              value={displayData.teamUtilization} 
              variant={displayData.teamUtilization > 90 ? 'warning' : 'default'} 
            />
          </Card>
        </div>
      </Card>

      {/* 最適化提案一覧 */}
      <div className="space-y-4">
        {displayData.suggestions.map((suggestion) => {
          const categoryInfo = getCategoryInfo(suggestion.category)
          const Icon = categoryInfo.icon
          const isExpanded = expandedSuggestions.has(suggestion.id)
          
          return (
            <Card key={suggestion.id} className="p-6">
              <div className="space-y-4">
                {/* ヘッダー */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Icon className={cn("h-5 w-5", categoryInfo.color)} />
                      <h4 className="text-lg font-semibold">{suggestion.title}</h4>
                      <Badge variant={getImpactVariant(suggestion.impact)}>
                        {suggestion.impact} impact
                      </Badge>
                      <span className={cn("text-sm font-medium", getEffortColor(suggestion.effort))}>
                        {suggestion.effort} effort
                      </span>
                    </div>
                    <p className="text-muted-foreground">{suggestion.description}</p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(suggestion.id)}
                  >
                    {isExpanded ? '詳細を隠す' : '詳細を見る'}
                  </Button>
                </div>

                {/* 改善メトリクス */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {suggestion.metrics.map((metric, index) => {
                    const isImprovement = metric.improvementPercentage > 0
                    const ArrowIcon = isImprovement ? ArrowUp : ArrowDown
                    const arrowColor = isImprovement ? 'text-green-600' : 'text-red-600'
                    
                    return (
                      <Card key={index} className="p-3">
                        <div className="text-xs text-muted-foreground mb-1">{metric.name}</div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              {metric.current}{metric.unit} → <span className="font-medium">{metric.optimized}{metric.unit}</span>
                            </div>
                          </div>
                          <div className={cn("flex items-center space-x-1", arrowColor)}>
                            <ArrowIcon className="h-3 w-3" />
                            <span className="text-xs font-medium">{Math.abs(metric.improvementPercentage)}%</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>

                {isExpanded && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* 理由説明 */}
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r">
                      <h5 className="font-medium text-blue-900 mb-2">分析結果</h5>
                      <p className="text-sm text-blue-800">{suggestion.reasoning}</p>
                    </div>

                    {/* アクション項目 */}
                    <div>
                      <h5 className="font-medium mb-3">実行項目</h5>
                      <div className="space-y-2">
                        {suggestion.actionItems
                          .sort((a, b) => a.priority - b.priority)
                          .map((action, index) => (
                          <div key={action.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <Badge variant="outline" className="h-5 text-xs">
                              {index + 1}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{action.description}</p>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{action.estimatedTime}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* リスクと利益 */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-3 flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>期待される利益</span>
                        </h5>
                        <ul className="space-y-1">
                          {suggestion.benefits.map((benefit, index) => (
                            <li key={index} className="text-sm text-green-700 flex items-start space-x-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {suggestion.risks && suggestion.risks.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-3 flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span>潜在的リスク</span>
                          </h5>
                          <ul className="space-y-1">
                            {suggestion.risks.map((risk, index) => (
                              <li key={index} className="text-sm text-yellow-700 flex items-start space-x-2">
                                <span className="text-yellow-600 mt-1">•</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => onRejectSuggestion?.(suggestion.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        却下
                      </Button>
                      <Button
                        onClick={() => onAcceptSuggestion?.(suggestion)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        適用開始
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export { AIOptimization }
export type { OptimizationSuggestion, ProjectOptimizationData }