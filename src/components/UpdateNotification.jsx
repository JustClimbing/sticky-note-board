import { useState, useEffect, useCallback } from 'react';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null); // { version, releaseNotes }
  const [downloadProgress, setDownloadProgress] = useState(null); // { percent }
  const [downloaded, setDownloaded] = useState(null); // { version }
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setDismissed(false);
    });

    window.electronAPI.onUpdateProgress((p) => {
      setDownloadProgress(p);
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      setDownloaded(info);
      setDownloadProgress(null);
    });
  }, []);

  const handleDownload = useCallback(() => {
    window.electronAPI?.downloadUpdate();
  }, []);

  const handleInstall = useCallback(() => {
    window.electronAPI?.installUpdate();
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (dismissed || (!updateInfo && !downloaded)) return null;

  return (
    <div className="update-toast">
      {downloaded ? (
        <div className="update-toast-content">
          <div className="update-toast-icon">✅</div>
          <div className="update-toast-text">
            <div className="update-toast-title">
              v{downloaded.version} 已下载完成
            </div>
            <div className="update-toast-desc">重启应用即可完成更新</div>
          </div>
          <div className="update-toast-actions">
            <button className="update-btn update-btn-later" onClick={handleDismiss}>
              稍后
            </button>
            <button className="update-btn update-btn-primary" onClick={handleInstall}>
              立即重启
            </button>
          </div>
        </div>
      ) : downloadProgress ? (
        <div className="update-toast-content">
          <div className="update-toast-icon">⬇️</div>
          <div className="update-toast-text">
            <div className="update-toast-title">
              正在下载 v{updateInfo.version}...
            </div>
            <div className="update-progress-bar">
              <div
                className="update-progress-fill"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
            <div className="update-toast-desc">{downloadProgress.percent}%</div>
          </div>
        </div>
      ) : (
        <div className="update-toast-content">
          <div className="update-toast-icon">🎉</div>
          <div className="update-toast-text">
            <div className="update-toast-title">
              发现新版本 v{updateInfo.version}
            </div>
            <div className="update-toast-desc">点击下方按钮开始下载更新</div>
          </div>
          <div className="update-toast-actions">
            <button className="update-btn update-btn-later" onClick={handleDismiss}>
              稍后提醒
            </button>
            <button className="update-btn update-btn-primary" onClick={handleDownload}>
              立即更新
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
