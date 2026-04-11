document.addEventListener('DOMContentLoaded', async () => {
  const enableAutoSave = document.getElementById('enableAutoSave');
  const saveLocal = document.getElementById('saveLocal');
  const saveArchive = document.getElementById('saveArchive');
  const status = document.getElementById('status');

  // 設定を読み込み
  const settings = await chrome.storage.sync.get({
    enableAutoSave: false,
    saveLocal: true,
    saveArchive: false
  });

  enableAutoSave.checked = settings.enableAutoSave;
  saveLocal.checked = settings.saveLocal;
  saveArchive.checked = settings.saveArchive;

  // 保存オプションの表示切り替え
  function updateOptionsState() {
    const disabled = !enableAutoSave.checked;
    saveLocal.disabled = disabled;
    saveArchive.disabled = disabled;
    document.querySelector('.save-options').style.opacity = disabled ? '0.5' : '1';
  }
  updateOptionsState();

  // 設定を保存
  async function saveSettings() {
    await chrome.storage.sync.set({
      enableAutoSave: enableAutoSave.checked,
      saveLocal: saveLocal.checked,
      saveArchive: saveArchive.checked
    });
    status.textContent = '保存しました';
    setTimeout(() => status.textContent = '', 2000);
  }

  enableAutoSave.addEventListener('change', () => {
    updateOptionsState();
    saveSettings();
  });
  saveLocal.addEventListener('change', saveSettings);
  saveArchive.addEventListener('change', saveSettings);
});
