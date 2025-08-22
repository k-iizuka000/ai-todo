/**
 * localStorageバックアップスクリプト
 * ブラウザのコンソールで実行してスケジュール関連データをバックアップする
 */

function backupLocalStorage() {
  const backup = {
    timestamp: new Date().toISOString(),
    data: {}
  };

  // スケジュール関連のキーを収集
  const scheduleKeys = [
    'schedule-storage',  // scheduleStoreのpersistキー
    'task-storage',      // taskStoreのpersistキー
    'ui-settings'        // UI設定
  ];

  // localStorageからデータを取得
  for (const key of scheduleKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        backup.data[key] = JSON.parse(value);
      } catch (e) {
        backup.data[key] = value; // パースできない場合は文字列として保存
      }
    }
  }

  // その他のai-todo関連キーも含める
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('todo') || key.includes('schedule'))) {
      if (!scheduleKeys.includes(key)) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          try {
            backup.data[key] = JSON.parse(value);
          } catch (e) {
            backup.data[key] = value;
          }
        }
      }
    }
  }

  return backup;
}

function downloadBackup() {
  const backup = backupLocalStorage();
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
}

// バックアップを実行
console.log('localStorage バックアップを実行します...');
const backup = backupLocalStorage();
console.log('バックアップデータ:', backup);

// ダウンロード用リンクを表示
console.log('ダウンロード用にdownloadBackup()を実行してください');

// グローバルに関数を公開
window.backupLocalStorage = backupLocalStorage;
window.downloadBackup = downloadBackup;