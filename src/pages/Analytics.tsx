import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button,
  Badge,
  Input
} from '@/components/ui';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Clock, 
  Target, 
  Users,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import type { AnalyticsPeriod } from '@/types/analytics';
import { 
  mockAnalyticsDashboard,
  getCompletionTrendChartData,
  getProjectCompletionChartData,
  getTimeDistributionChartData,
  getWeeklyProductivityData,
  getPriorityDistributionData,
  getMonthlyCompletionData
} from '@/mock/analyticsData';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsPeriod>('month');
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'projects' | 'productivity' | 'time'>('overview');

  // 分析データの取得
  const dashboard = mockAnalyticsDashboard;
  const completionTrendData = getCompletionTrendChartData();
  const projectCompletionData = getProjectCompletionChartData();
  const timeDistributionData = getTimeDistributionChartData();
  const weeklyProductivityData = getWeeklyProductivityData();
  const priorityDistributionData = getPriorityDistributionData();
  const monthlyCompletionData = getMonthlyCompletionData();

  // 期間選択による説明テキストの生成
  const getPeriodDescription = (period: AnalyticsPeriod) => {
    switch (period) {
      case 'day':
        return '過去24時間';
      case 'week':
        return '過去7日間';
      case 'month':
        return '過去30日間';
      case 'quarter':
        return '過去3ヶ月';
      case 'year':
        return '過去1年間';
      default:
        return '過去30日間';
    }
  };

  // チャート用のモック実装（実際にはChart.jsやRecharts等を使用）
  const MockLineChart: React.FC<{ data: any[]; title: string; dataKey: string }> = ({ data, title, dataKey }) => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="h-48 flex items-end justify-between gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div 
              className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
              style={{ height: `${(item.y / Math.max(...data.map(d => d.y))) * 160}px` }}
              title={`${item.label || item.y}`}
            />
            <span className="text-xs text-muted-foreground mt-2 truncate max-w-[60px]">
              {typeof item.x === 'object' && item.x instanceof Date 
                ? `${item.x.getMonth() + 1}/${item.x.getDate()}`
                : item.x
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const MockPieChart: React.FC<{ data: any[]; title: string }> = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.y, 0);
    
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            {/* 簡易的な円グラフの代替 */}
            <div className="w-full h-full rounded-full border-8 border-gray-200"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold">{total}</div>
                <div className="text-xs text-muted-foreground">合計</div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: item.color || '#6B7280' }}
                ></div>
                <span className="text-sm">{item.x}</span>
              </div>
              <div className="text-sm font-medium">
                {item.y} ({total > 0 ? Math.round((item.y / total) * 100) : 0}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">分析ダッシュボード</h1>
          <p className="text-muted-foreground">{getPeriodDescription(timeRange)}のデータを表示しています</p>
        </div>
        <div className="flex gap-2">
          {/* 期間選択 */}
          <div className="flex border rounded-lg p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === 'week' ? '週' : range === 'month' ? '月' : range === 'quarter' ? '四半期' : '年'}
              </Button>
            ))}
          </div>
          
          {/* メトリクス選択 */}
          <div className="flex border rounded-lg p-1">
            {(['overview', 'projects', 'productivity', 'time'] as const).map((metric) => (
              <Button
                key={metric}
                variant={selectedMetric === metric ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMetric(metric)}
              >
                {metric === 'overview' ? '概要' : 
                 metric === 'projects' ? 'プロジェクト' : 
                 metric === 'productivity' ? '生産性' : '時間'}
              </Button>
            ))}
          </div>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">作成されたタスク</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.metrics.tasksCreated}</div>
            <p className="text-xs text-muted-foreground">
              {getPeriodDescription(timeRange)}で作成
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了したタスク</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard.metrics.tasksCompleted}</div>
            <p className="text-xs text-muted-foreground">
              完了率: {Math.round((dashboard.metrics.tasksCompleted / dashboard.metrics.tasksCreated) * 100) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均完了時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboard.metrics.averageCompletionTime}日</div>
            <p className="text-xs text-muted-foreground">
              タスクの平均完了期間
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">生産性スコア</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{dashboard.metrics.productivityScore}%</div>
            <p className="text-xs text-muted-foreground">
              総合的な生産性指標
            </p>
          </CardContent>
        </Card>
      </div>

      {/* チャートエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* タスク完了トレンド */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              タスク完了トレンド
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockLineChart 
              data={completionTrendData} 
              title={`${getPeriodDescription(timeRange)}のタスク完了推移`}
              dataKey="completed"
            />
          </CardContent>
        </Card>

        {/* 優先度別分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              優先度別分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockPieChart 
              data={priorityDistributionData}
              title="タスク優先度分布"
            />
          </CardContent>
        </Card>

        {/* プロジェクト別完了率 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              プロジェクト別完了率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockLineChart 
              data={projectCompletionData}
              title="プロジェクトの完了率"
              dataKey="completionRate"
            />
          </CardContent>
        </Card>

        {/* 時間配分 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              時間配分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockPieChart 
              data={timeDistributionData}
              title="カテゴリ別時間配分"
            />
          </CardContent>
        </Card>
      </div>

      {/* その他のカード群 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 生産性分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              週次生産性
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyProductivityData.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{data.period}</span>
                    <span className={`text-sm font-bold ${
                      data.efficiency > 100 ? 'text-green-600' : 
                      data.efficiency > 90 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {data.efficiency}%
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>見積: {data.estimatedHours}h</span>
                    <span>実績: {data.actualHours}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        data.efficiency > 100 ? 'bg-green-500' :
                        data.efficiency > 90 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(data.efficiency, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* プロジェクト統計 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              プロジェクトステータス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockPieChart 
              data={[
                { x: 'アクティブ', y: dashboard.projectStats.active, color: '#3b82f6' },
                { x: '完了', y: dashboard.projectStats.completed, color: '#22c55e' },
                { x: '計画中', y: dashboard.projectStats.planning, color: '#f59e0b' },
                { x: '保留', y: dashboard.projectStats.onHold, color: '#6b7280' }
              ]}
              title="プロジェクトステータス分布"
            />
          </CardContent>
        </Card>
      </div>

      {/* 詳細統計テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>プロジェクト別詳細統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">プロジェクト名</th>
                  <th className="text-right p-2">総タスク数</th>
                  <th className="text-right p-2">完了</th>
                  <th className="text-right p-2">進行中</th>
                  <th className="text-right p-2">進捗率</th>
                  <th className="text-right p-2">見積時間</th>
                  <th className="text-right p-2">実績時間</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.projectDetails.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span>{project.icon}</span>
                        <span className="font-medium">{project.name}</span>
                      </div>
                    </td>
                    <td className="text-right p-2">{project.totalTasks}</td>
                    <td className="text-right p-2 text-green-600">{project.completedTasks}</td>
                    <td className="text-right p-2 text-blue-600">{project.inProgressTasks}</td>
                    <td className="text-right p-2">
                      <span className={`font-medium ${
                        project.progressPercentage >= 80 ? 'text-green-600' :
                        project.progressPercentage >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {project.progressPercentage}%
                      </span>
                    </td>
                    <td className="text-right p-2">{project.estimatedHours}h</td>
                    <td className="text-right p-2">{project.actualHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* インサイトカード */}
      <Card>
        <CardHeader>
          <CardTitle>分析インサイト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <h3 className="font-medium text-blue-800">生産性の傾向</h3>
              <p className="text-sm text-blue-700 mt-1">
                今週の作業効率は平均{Math.round(weeklyProductivityData.reduce((sum, d) => sum + d.efficiency, 0) / weeklyProductivityData.length)}%です。
                見積もり精度の向上が推奨されます。
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <h3 className="font-medium text-green-800">完了率の改善</h3>
              <p className="text-sm text-green-700 mt-1">
                タスク完了率は{Math.round((dashboard.metrics.tasksCompleted / dashboard.metrics.tasksCreated) * 100)}%と良好です。
                継続的な進捗管理が効果的に機能しています。
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <h3 className="font-medium text-yellow-800">優先度の調整</h3>
              <p className="text-sm text-yellow-700 mt-1">
                緊急タスクが{priorityDistributionData.find(p => p.x === '緊急')?.y || 0}件あります。
                リソース配分の見直しを検討してください。
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <h3 className="font-medium text-purple-800">プロジェクト進捗</h3>
              <p className="text-sm text-purple-700 mt-1">
                {dashboard.projectStats.active}個のアクティブプロジェクトの
                平均進捗率は良好な水準を保っています。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;