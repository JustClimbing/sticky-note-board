import { useState } from 'react';

export default function Toolbar({
  viewMode,
  onViewModeChange,
  onAddNote,
  alwaysOnTop,
  onToggleAlwaysOnTop,
  autoLaunch,
  onToggleAutoLaunch,
  widgetMode,
  onToggleWidgetMode,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    if (e.target.closest('.toolbar-btn')) return;
    setIsDragging(true);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  return (
    <div
      className={`toolbar ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="toolbar-left">
        <span className="toolbar-title">📌 便利签看板</span>
        {alwaysOnTop && (
          <span className="toolbar-badge" title="窗口置顶中">
            📍 置顶中
          </span>
        )}
        {autoLaunch && (
          <span className="toolbar-badge badge-autolaunch" title="开机自启动已开启">
            🚀 自启动
          </span>
        )}
        {widgetMode && (
          <span className="toolbar-badge badge-widget" title="挂件模式已开启">
            🎈 挂件中
          </span>
        )}
      </div>

      <div className="toolbar-center">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => onViewModeChange('kanban')}
          >
            看板
          </button>
          <button
            className={`toggle-btn ${viewMode === 'free' ? 'active' : ''}`}
            onClick={() => onViewModeChange('free')}
          >
            自由
          </button>
        </div>
        <button className="toolbar-btn add-btn" onClick={onAddNote}>
          + 新便利贴
        </button>
      </div>

      <div className="toolbar-right">
        <button
          className={`toolbar-btn widget-btn ${widgetMode ? 'active' : ''}`}
          onClick={onToggleWidgetMode}
          title={widgetMode ? '关闭挂件模式' : '开启挂件模式（缩小为桌面浮标，点击弹出看板）'}
        >
          🎈
        </button>
        <button
          className={`toolbar-btn ${autoLaunch ? 'active' : ''}`}
          onClick={onToggleAutoLaunch}
          title={autoLaunch ? '关闭开机自启动' : '开启开机自启动'}
        >
          🚀
        </button>
        <button
          className={`toolbar-btn ${alwaysOnTop ? 'active' : ''}`}
          onClick={onToggleAlwaysOnTop}
          title="窗口置顶"
        >
          📍
        </button>
        <button className="toolbar-btn" onClick={handleMinimize} title="最小化">
          ─
        </button>
        <button
          className="toolbar-btn close-btn"
          onClick={handleClose}
          title="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
