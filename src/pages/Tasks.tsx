import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Input, 
  Badge,
  StatusBadge,
  PriorityBadge,
  Modal 
} from '@/components/ui';
import { Plus, Search, Filter, Columns, List } from 'lucide-react';
import type { Task, TaskStatus } from '@/types/task';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { mockTasks } from '@/mock/tasks';

const Tasks: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  const handleTaskMove = (_taskId: string, _newStatus: TaskStatus) => {
    console.log(`Task ${_taskId} moved to ${_newStatus}`);
    // TODO: タスクのステータス更新処理
  };

  const handleTaskClick = (_task: Task) => {
    console.log('Task clicked:', _task);
    // TODO: タスク詳細モーダル表示
  };

  const handleAddTask = (_status: TaskStatus) => {
    console.log(`Add task to ${_status}`);
    setShowCreateModal(true);
    // TODO: 指定ステータスでのタスク作成
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">タスク管理</h1>
        <div className="flex gap-2">
          {/* 表示モード切り替え */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新しいタスク
          </Button>
        </div>
      </div>

      {/* 検索とフィルター */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          フィルター
        </Button>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 min-h-0">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={mockTasks}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            className="h-[calc(100vh-12rem)]"
          />
        ) : (
          <div className="space-y-4">
            {mockTasks.map((task) => (
              <Card key={task.id} variant="interactive">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <div className="flex gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{task.description}</p>
                  <div className="flex items-center gap-2">
                    {task.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                    {task.dueDate && (
                      <span className="text-sm text-muted-foreground ml-auto">
                        期限: {task.dueDate.toLocaleDateString('ja-JP')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 新規タスク作成モーダル */}
      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="新しいタスクを作成"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">タスク名</label>
            <Input placeholder="タスク名を入力..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">説明</label>
            <Input placeholder="タスクの説明を入力..." />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">優先度</label>
              <select className="w-full p-2 border border-input rounded-md">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">緊急</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">期限</label>
              <Input type="date" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            キャンセル
          </Button>
          <Button onClick={() => setShowCreateModal(false)}>
            タスクを作成
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Tasks;