import { useState, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import Board from './components/Board';
import UpdateNotification from './components/UpdateNotification';
import './index.css';

const STORAGE_KEY = 'sticky-note-board-data';

const defaultNotes = [
  {
    id: 'welcome-1',
    text: '欢迎使用便利签看板！\n双击空白处创建新便利贴',
    color: '#FFEAA7',
    x: 120,
    y: 120,
    width: 230,
    height: 200,
    fontSize: 16,
    column: 'todo',
    createdAt: Date.now(),
  },
  {
    id: 'welcome-2',
    text: '拖拽便利贴可以移动位置\n点击文字可以编辑内容\n右下角可以调整大小',
    color: '#FDCB6E',
    x: 420,
    y: 140,
    width: 230,
    height: 200,
    fontSize: 16,
    column: 'doing',
    createdAt: Date.now() - 1000,
  },
  {
    id: 'welcome-3',
    text: '自由模式下\n把便签拖到底部桶里\n就能标记为已完成',
    color: '#FFB8B8',
    x: 720,
    y: 160,
    width: 230,
    height: 200,
    fontSize: 16,
    column: 'done',
    createdAt: Date.now() - 2000,
  },
];

export default function App() {
  const [notes, setNotes] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [widgetMode, setWidgetMode] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load notes from Electron storage or localStorage
  useEffect(() => {
    (async () => {
      try {
        if (window.electronAPI) {
          const saved = await window.electronAPI.loadNotes();
          if (saved?.notes) {
            setNotes(saved.notes);
            setViewMode(saved.viewMode || 'kanban');
          } else {
            setNotes(defaultNotes);
          }
          const al = await window.electronAPI.getAutoLaunch();
          setAutoLaunch(al);
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setNotes(parsed.notes || []);
            setViewMode(parsed.viewMode || 'kanban');
          } else {
            setNotes(defaultNotes);
          }
        }
      } catch {
        setNotes(defaultNotes);
      }
      setLoaded(true);
    })();
  }, []);

  // Auto-save notes
  useEffect(() => {
    if (!loaded) return;
    const timeout = setTimeout(() => {
      const data = { notes, viewMode };
      if (window.electronAPI) {
        window.electronAPI.saveNotes(data);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [notes, viewMode, loaded]);

  // Deselect on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedNoteId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addNote = useCallback(
    (x = null, y = null) => {
      const colors = [
        '#FFEAA7',
        '#FFB8B8',
        '#B5EAD7',
        '#C7CEEA',
        '#FFDAC1',
        '#E2F0CB',
      ];
      const newNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: '',
        color: colors[Math.floor(Math.random() * colors.length)],
        x: x ?? 80 + Math.random() * 300,
        y: y ?? 80 + Math.random() * 200,
        width: 230,
        height: 200,
        fontSize: 16,
        column: 'todo',
        createdAt: Date.now(),
      };
      setNotes((prev) => [...prev, newNote]);
      setSelectedNoteId(newNote.id);
    },
    []
  );

  const updateNote = useCallback((id, updates) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  const deleteNote = useCallback(
    (id) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNoteId === id) setSelectedNoteId(null);
    },
    [selectedNoteId]
  );

  const handleBoardDoubleClick = useCallback(
    (e, boardRect) => {
      if (e.target.closest('.sticky-note') || e.target.closest('.kanban-column'))
        return;
      const x = e.clientX - boardRect.left;
      const y = e.clientY - boardRect.top;
      addNote(x, y);
    },
    [addNote]
  );

  const toggleAlwaysOnTop = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.toggleAlwaysOnTop();
      setAlwaysOnTop(result);
    }
  }, []);

  const toggleAutoLaunch = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.toggleAutoLaunch();
      setAutoLaunch(result);
    }
  }, []);

  const toggleWidgetMode = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.toggleWidgetMode();
      setWidgetMode(result);
    }
  }, []);

  return (
    <div className="app">
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddNote={() => addNote()}
        alwaysOnTop={alwaysOnTop}
        onToggleAlwaysOnTop={toggleAlwaysOnTop}
        autoLaunch={autoLaunch}
        onToggleAutoLaunch={toggleAutoLaunch}
        widgetMode={widgetMode}
        onToggleWidgetMode={toggleWidgetMode}
      />
      <Board
        notes={notes}
        viewMode={viewMode}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        onBoardDoubleClick={handleBoardDoubleClick}
      />
      <UpdateNotification />
    </div>
  );
}
