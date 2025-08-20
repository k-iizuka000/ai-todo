import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton, LoadingDots } from "@/components/ui/loading"
import { cn } from "@/lib/utils"
import { 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Target,
  Calendar,
  User,
  Tag
} from "lucide-react"

// 具体性改善提案の型定義
interface ConcretenessSuggestion {
  id: string
  originalText: string
  improvedText: string
  improvements: {
    category: 'clarity' | 'specificity' | 'measurability' | 'timeline' | 'ownership'
    description: string
    impact: 'high' | 'medium' | 'low'
  }[]
  confidenceScore: number // 0-100
  reasoning: string
  examples?: {
    before: string
    after: string
  }[]
}

export interface ConcretenessSuggestionProps {
  originalText: string
  type?: 'task' | 'description' | 'goal'
  isLoading?: boolean
  suggestions?: ConcretenessSuggestion[]
  onAcceptSuggestion?: (suggestion: ConcretenessSuggestion) => void
  onRejectSuggestion?: (suggestionId: string) => void
  onRequestNewSuggestion?: () => void
  onProvideFeedback?: (suggestionId: string, feedback: 'positive' | 'negative', comment?: string) => void
  className?: string
}

// ダミーデータ生成関数
const generateMockSuggestion = (originalText: string): ConcretenessSuggestion => ({
  id: `concreteness-${Date.now()}`,
  originalText,
  improvedText: `${originalText}を2024年12月末までに完了する。成果物としてReactコンポーネント3つとテストコード、ドキュメントを作成し、田中さんがレビューを担当する。`,
  improvements: [
    {
      category: 'timeline',
      description: '具体的な期限を追加',
      impact: 'high'
    },
    {
      category: 'measurability', 
      description: '成果物を明確化',
      impact: 'high'
    },
    {
      category: 'ownership',
      description: '担当者とレビュアーを明記',
      impact: 'medium'
    },
    {
      category: 'specificity',
      description: '技術仕様を具体化',
      impact: 'medium'
    }
  ],
  confidenceScore: 88,
  reasoning: "元のタスクは抽象的で、いつまでに何を完成させるべきかが不明確でした。期限、成果物、担当者を明確にすることで、より実行可能なタスクになります。",
  examples: [
    {
      before: "システムを改善する",
      after: "ユーザー登録処理のレスポンス時間を500ms以下に改善する"
    },
    {
      before: "ドキュメントを作成する", 
      after: "API仕様書をOpenAPI形式で作成し、開発チームに共有する"
    }
  ]
})

// 改善カテゴリのアイコンとラベル
const getCategoryInfo = (category: string) => {
  switch (category) {
    case 'clarity':
      return { icon: MessageSquare, label: '明確性', color: 'text-blue-600' }
    case 'specificity':
      return { icon: Target, label: '具体性', color: 'text-green-600' }
    case 'measurability':
      return { icon: CheckCircle2, label: '測定可能性', color: 'text-purple-600' }
    case 'timeline':
      return { icon: Calendar, label: 'タイムライン', color: 'text-orange-600' }
    case 'ownership':
      return { icon: User, label: '責任者', color: 'text-indigo-600' }
    default:
      return { icon: Tag, label: '一般', color: 'text-gray-600' }
  }
}

// 影響度のバッジ色
const getImpactVariant = (impact: string) => {
  switch (impact) {
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

const ConcretenessSuggestion: React.FC<ConcretenessSuggestionProps> = ({
  originalText,
  type = 'task',
  isLoading = false,
  suggestions = [],
  onAcceptSuggestion,
  onRejectSuggestion,
  onRequestNewSuggestion,
  onProvideFeedback,
  className
}) => {
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null)
  const [showExamples, setShowExamples] = useState<Set<string>>(new Set())

  const toggleExamples = (suggestionId: string) => {
    const newShowExamples = new Set(showExamples)
    if (newShowExamples.has(suggestionId)) {
      newShowExamples.delete(suggestionId)
    } else {
      newShowExamples.add(suggestionId)
    }
    setShowExamples(newShowExamples)
  }

  // ダミーデータを表示（実際のAI連携なし）
  const displaySuggestions = suggestions.length > 0 ? suggestions : [generateMockSuggestion(originalText)]

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">具体性の改善提案</h3>
            <LoadingDots size="sm" />
          </div>
          
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-20" />
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
            <h3 className="text-lg font-semibold">具体性の改善提案</h3>
            <Badge variant="outline">{type}</Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRequestNewSuggestion}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            再生成
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">元のテキスト</p>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">{originalText}</p>
          </div>
        </div>

        <div className="space-y-6">
          {displaySuggestions.map((suggestion) => (
            <div key={suggestion.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">改善案</h4>
                  <Badge 
                    variant={suggestion.confidenceScore >= 80 ? 'default' : 'secondary'}
                  >
                    信頼度 {suggestion.confidenceScore}%
                  </Badge>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProvideFeedback?.(suggestion.id, 'positive')}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProvideFeedback?.(suggestion.id, 'negative')}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Before/After比較 */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">変更前</p>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{suggestion.originalText}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">変更後</p>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">{suggestion.improvedText}</p>
                  </div>
                </div>
              </div>

              {/* 改善点一覧 */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-3">改善点</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {suggestion.improvements.map((improvement, index) => {
                    const categoryInfo = getCategoryInfo(improvement.category)
                    const Icon = categoryInfo.icon
                    
                    return (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                        <Icon className={cn("h-4 w-4 mt-0.5", categoryInfo.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium">{categoryInfo.label}</span>
                            <Badge variant={getImpactVariant(improvement.impact)} className="h-4 text-xs">
                              {improvement.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{improvement.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 理由説明 */}
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">{suggestion.reasoning}</p>
              </div>

              {/* 例示セクション */}
              {suggestion.examples && suggestion.examples.length > 0 && (
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExamples(suggestion.id)}
                    className="mb-3"
                  >
                    {showExamples.has(suggestion.id) ? '例を隠す' : '改善例を見る'}
                  </Button>
                  
                  {showExamples.has(suggestion.id) && (
                    <div className="space-y-3">
                      {suggestion.examples.map((example, index) => (
                        <div key={index} className="border-l-2 border-muted pl-4">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">変更前</p>
                              <p className="text-sm text-red-700 bg-red-50 p-2 rounded">
                                {example.before}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">変更後</p>
                              <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                {example.after}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  <span>この提案は参考用です</span>
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
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    適用
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export { ConcretenessSuggestion }
export type { ConcretenessSuggestion as ConcretenessSuggestionType }