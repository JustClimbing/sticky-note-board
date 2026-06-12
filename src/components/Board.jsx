import { useRef, useCallback } from 'react';
import Note from './Note';

const KANBAN_COLUMNS = [
  { id: 'todo', label: '待办', emoji: '📋' },
  { id: 'doing', label: '进行中', emoji: '🔧' },
  { id: 'done', label: '已完成', emoji: '✅' },
];

export default function Board({
  notes,
  viewMode,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onBoardDoubleClick,
}) {
  const boardRef = useRef(null);

  const handleDoubleClick = useCallback(
    (e) => {
      if (boardRef.current) {
        onBoardDoubleClick(e, boardRef.current.getBoundingClientRect());
      }
    },
    [onBoardDoubleClick]
  );

  const handleDragEnd = useCallback(
    (id, x, y) => {
      if (viewMode === 'kanban' && boardRef.current) {
        const boardRect = boardRef.current.getBoundingClientRect();
        const relX = x - boardRect.left;
        const colWidth = boardRect.width / 3;
        let column = 'todo';
        if (relX > colWidth * 2) column = 'done';
        else if (relX > colWidth) column = 'doing';
        onUpdateNote(id, { column });
      } else {
        onUpdateNote(id, { x, y });
      }
    },
    [viewMode, onUpdateNote]
  );

  return (
    <div
      ref={boardRef}
      className={`board ${viewMode === 'kanban' ? 'board-kanban' : 'board-free'}`}
      onDoubleClick={handleDoubleClick}
    >
      {viewMode === 'kanban' ? (
        <KanbanView
          notes={notes}
          columns={KANBAN_COLUMNS}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <FreeView
          notes={notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
          onDragEnd={handleDragEnd}
        />
      )}
    </div>
  );
}

// ──────────── Free Layout View ────────────

function FreeView({
  notes,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onDragEnd,
}) {
  return (
    <>
      {notes.map((note) => (
        <Note
          key={note.id}
          note={note}
          isSelected={note.id === selectedNoteId}
          onSelect={onSelectNote}
          onUpdate={onUpdateNote}
          onDelete={onDeleteNote}
          onDragEnd={onDragEnd}
          mode="free"
        />
      ))}
      <div className="free-view-hint">
        <span>💡 双击空白处添加便利贴</span>
      </div>
    </>
  );
}

// ──────────── Kanban View ────────────

function KanbanView({
  notes,
  columns,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onDragEnd,
}) {
  return (
    <div className="kanban-columns">
      {columns.map((col) => {
        const colNotes = notes
          .filter((n) => n.column === col.id)
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        return (
          <div key={col.id} className="kanban-column">
            <div className="kanban-column-header">
              <span className="kanban-column-emoji">{col.emoji}</span>
              <span className="kanban-column-label">{col.label}</span>
              <span className="kanban-column-count">{colNotes.length}</span>
            </div>
            <div className="kanban-column-body">
              {colNotes.map((note, idx) => (
                <Note
                  key={note.id}
                  note={note}
                  isSelected={note.id === selectedNoteId}
                  onSelect={onSelectNote}
                  onUpdate={onUpdateNote}
                  onDelete={onDeleteNote}
                  onDragEnd={onDragEnd}
                  mode="kanban"
                  kanbanIndex={idx}
                  columnId={col.id}
                />
              ))}
              {colNotes.length === 0 && (
                <div className="kanban-empty">拖拽便利贴到这里</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
