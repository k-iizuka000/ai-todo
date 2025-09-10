import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton, LoadingDots } from "@/components/ui/loading"
import { cn } from "@/lib/utils"
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Lightbulb,
  Clock,
  Target,
  Zap,
  Plus
} from "lucide-react"

// AI提案用の型定義
interface SubtaskSuggestion {
  id: string
  title: string
  description?: string
  estimatedHours?: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  order: number
}

interface TaskBreakdownSuggestion {
  id: string
  originalTask: string
  suggestedSubtasks: SubtaskSuggestion[]
  reasoning: string
  totalEstimatedHours: number
  confidence: number // 0-100
}

export interface AITaskBreakdownProps {
  taskTitle: string
  taskDescription?: string
  isLoading?: boolean
  suggestions?: TaskBreakdownSuggestion[]
  onAcceptSuggestion?: (suggestion: TaskBreakdownSuggestion) => void
  onAcceptSubtask?: (subtask: SubtaskSuggestion) => void
  onRejectSuggestion?: (suggestionId: string) => void
  onRequestNewSuggestion?: () => void
  className?: string
}

// ダミーデータ生成関数
const generateMockSuggestion = (taskTitle: string): TaskBreakdownSuggestion => ({
  id: `suggestion-${Date.now()}`,
  originalTask: taskTitle,
  suggestedSubtasks: [
    {
      id: "subtask-1",
      title: "要件整理と設計",
      description: "必要な機能を明確化し、技術的な設計を行う",
      estimatedHours: 2,
      priority: "HIGH",
      order: 1
    },
    {
      id: "subtask-2", 
      title: "コア機能の実装",
      description: "主要な機能を実装する",
      estimatedHours: 4,
      priority: "HIGH",
      order: 2
    },
    {
      id: "subtask-3",
      title: "テストコード作成",
      description: "単体テストと統合テストを作成",
      estimatedHours: 2,
      priority: "MEDIUM",
      order: 3
    },
    {
      id: "subtask-4",
      title: "ドキュメント作成",
      description: "使用方法とAPIドキュメントを作成",
      estimatedHours: 1,
      priority: "LOW",
      order: 4
    }
  ],
  reasoning: "このタスクは複数のフェーズに分かれる複雑な作業です。まず要件を明確にし、段階的に実装を進めることで効率的な開発が可能になります。",
  totalEstimatedHours: 9,
  confidence: 85
})

const AITaskBreakdown: React.FC<AITaskBreakdownProps> = ({
  taskTitle,
  taskDescription,
  isLoading = false,
  suggestions = [],
  onAcceptSuggestion,
  onAcceptSubtask,
  onRejectSuggestion,
  onRequestNewSuggestion,
  className
}) => {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<string>>(new Set())

  // 展開/折りたたみトグル
  const toggleExpanded = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions)
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId)
    } else {
      newExpanded.add(suggestionId)
    }
    setExpandedSuggestions(newExpanded)
  }

  // サブタスク選択トグル
  const toggleSubtaskSelection = (subtaskId: string) => {
    const newSelected = new Set(selectedSubtasks)
    if (newSelected.has(subtaskId)) {
      newSelected.delete(subtaskId)
    } else {
      newSelected.add(subtaskId)
    }
    setSelectedSubtasks(newSelected)
  }

  // 優先度バッジのスタイル
  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  // ダミーデータを表示（実際のAI連携なし）
  const displaySuggestions = suggestions.length > 0 ? suggestions : [generateMockSuggestion(taskTitle)]

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI タスク分解提案</h3>
            <LoadingDots size="sm" />
          </div>
          
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI タスク分解提案</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRequestNewSuggestion}
          >
            <Zap className="h-4 w-4 mr-2" />
            新しい提案
          </Button>
        </div>

        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">対象タスク</p>
          <p className="font-medium">{taskTitle}</p>
          {taskDescription && (
            <p className="text-sm text-muted-foreground mt-1">{taskDescription}</p>
          )}
        </div>

        <div className="space-y-4">
          {displaySuggestions.map((suggestion) => {
            const isExpanded = expandedSuggestions.has(suggestion.id)
            
            return (
              <div key={suggestion.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleExpanded(suggestion.id)}
                    className="flex items-center space-x-2 text-left hover:text-primary transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      提案 ({suggestion.suggestedSubtasks.length}個のサブタスク)
                    </span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{suggestion.totalEstimatedHours}時間</span>
                    </div>
                    <Badge variant={suggestion.confidence >= 80 ? 'default' : 'secondary'}>
                      信頼度 {suggestion.confidence}%
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {suggestion.reasoning}
                </p>

                {isExpanded && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {suggestion.suggestedSubtasks
                        .sort((a, b) => a.order - b.order)
                        .map((subtask, index) => (
                          <div 
                            key={subtask.id}
                            className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <button
                              onClick={() => toggleSubtaskSelection(subtask.id)}
                              className="mt-0.5"
                            >
                              {selectedSubtasks.has(subtask.id) ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {index + 1}.
                                </span>
                                <h4 className="font-medium">{subtask.title}</h4>
                                <Badge variant={getPriorityBadgeVariant(subtask.priority)}>
                                  {subtask.priority}
                                </Badge>
                              </div>
                              
                              {subtask.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {subtask.description}
                                </p>
                              )}
                              
                              {subtask.estimatedHours && (
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <Target className="h-3 w-3" />
                                  <span>見積: {subtask.estimatedHours}時間</span>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAcceptSubtask?.(subtask)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              追加
                            </Button>
                          </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        選択中: {selectedSubtasks.size}/{suggestion.suggestedSubtasks.length}個
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => onRejectSuggestion?.(suggestion.id)}
                        >
                          却下
                        </Button>
                        <Button
                          onClick={() => onAcceptSuggestion?.(suggestion)}
                          disabled={selectedSubtasks.size === 0}
                        >
                          選択した項目を追加 ({selectedSubtasks.size})
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export { AITaskBreakdown }
export type { TaskBreakdownSuggestion, SubtaskSuggestion }