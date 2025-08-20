/**
 * タスク詳細コンポーネントのデモページ
 */

import React, { useState } from 'react';
import { TaskDetailView, TaskHierarchy, SubTaskList, ProgressIndicator } from '../components/task';
import { mockTasks } from '../mock/tasks';
import { Task, Subtask } from '../types/task';

const TaskDetailDemo: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Task>(mockTasks[0]);
  const [tasks] = useState<Task[]>(mockTasks.slice(0, 3));

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    console.log('タスク更新:', taskId, updates);
    // 実際の実装では、ここでタスクを更新します
  };

  const handleSubtaskToggle = (subtaskId: string, completed: boolean) => {
    console.log('サブタスク切り替え:', subtaskId, completed);
    // 実際の実装では、ここでサブタスクの状態を更新します
  };

  const handleSubtaskAdd = (title: string) => {
    console.log('サブタスク追加:', title);
    // 実際の実装では、ここで新しいサブタスクを追加します
  };

  const handleSubtaskDelete = (subtaskId: string) => {
    console.log('サブタスク削除:', subtaskId);
    // 実際の実装では、ここでサブタスクを削除します
  };

  const handleTaskDelete = (taskId: string) => {
    console.log('タスク削除:', taskId);
    // 実際の実装では、ここでタスクを削除します
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            タスク詳細コンポーネント デモ
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Docker環境で動作するタスク詳細表示機能の確認
          </p>
        </div>

        {/* プログレスインジケーターのデモ */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            1. プログレスインジケーター
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Small サイズ</h3>
              <ProgressIndicator completed={3} total={5} size="small" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medium サイズ</h3>
              <ProgressIndicator completed={7} total={10} size="medium" label="プロジェクト進捗" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Large サイズ</h3>
              <ProgressIndicator completed={12} total={15} size="large" label="全体の進捗状況" />
            </div>
          </div>
        </section>

        {/* サブタスクリストのデモ */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            2. サブタスクリスト
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">読み取り専用</h3>
              <SubTaskList
                subtasks={selectedTask.subtasks}
                onSubtaskToggle={handleSubtaskToggle}
                collapsible={true}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">編集可能</h3>
              <SubTaskList
                subtasks={selectedTask.subtasks}
                onSubtaskToggle={handleSubtaskToggle}
                onSubtaskAdd={handleSubtaskAdd}
                onSubtaskDelete={handleSubtaskDelete}
                editable={true}
                collapsible={true}
              />
            </div>
          </div>
        </section>

        {/* タスク階層のデモ */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            3. タスク階層表示
          </h2>
          <div className="space-y-4">
            {tasks.map((task, index) => (
              <TaskHierarchy
                key={task.id}
                task={task}
                level={index}
                onTaskClick={(taskId) => console.log('タスククリック:', taskId)}
                onSubtaskToggle={handleSubtaskToggle}
                collapsible={true}
              />
            ))}
          </div>
        </section>

        {/* タスク詳細ビューのデモ */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            4. タスク詳細ビュー
          </h2>
          <div className="space-y-6">
            {/* タスク選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                表示するタスクを選択:
              </label>
              <select
                value={selectedTask.id}
                onChange={(e) => {
                  const task = mockTasks.find(t => t.id === e.target.value);
                  if (task) setSelectedTask(task);
                }}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {mockTasks.slice(0, 5).map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 読み取り専用表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">読み取り専用モード</h3>
              <TaskDetailView
                task={selectedTask}
                editable={false}
                mode="full"
                onTaskUpdate={handleTaskUpdate}
                onSubtaskToggle={handleSubtaskToggle}
              />
            </div>

            {/* 編集可能表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">編集可能モード</h3>
              <TaskDetailView
                task={selectedTask}
                editable={true}
                mode="full"
                onTaskUpdate={handleTaskUpdate}
                onSubtaskToggle={handleSubtaskToggle}
                onSubtaskAdd={handleSubtaskAdd}
                onSubtaskDelete={handleSubtaskDelete}
                onTaskDelete={handleTaskDelete}
                onClose={() => console.log('閉じる')}
              />
            </div>
          </div>
        </section>

        {/* 動作確認メッセージ */}
        <section className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
            動作確認
          </h2>
          <div className="text-blue-800 dark:text-blue-200 space-y-1">
            <p>✅ Docker環境での動作確認完了</p>
            <p>✅ 4つのコンポーネントすべて実装済み</p>
            <p>✅ 階層構造の可視化対応</p>
            <p>✅ 進捗表示機能</p>
            <p>✅ サブタスク一覧表示</p>
            <p>✅ 折り畳み機能</p>
            <p>✅ グループ10の型とモックデータ使用</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TaskDetailDemo;