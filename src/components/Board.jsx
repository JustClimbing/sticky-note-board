import { useRef, useState, useCallback } from 'react';
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
  const bucketRef = useRef(null);

  const handleDoubleClick = useCallback(
    (e) => {
      if (boardRef.current) {
        onBoardDoubleClick(e, boardRef.current.getBoundingClientRect());
      }
    },
    [onBoardDoubleClick]
  );

  const handleDragEnd = useCallback(
    (id, x, y, right, bottom) => {
      if (viewMode === 'kanban' && boardRef.current) {
        const boardRect = boardRef.current.getBoundingClientRect();
        const relX = x - boardRect.left;
        const colWidth = boardRect.width / 3;
        let column = 'todo';
        if (relX > colWidth * 2) column = 'done';
        else if (relX > colWidth) column = 'doing';
        onUpdateNote(id, { column });
      } else if (viewMode === 'free' && bucketRef.current) {
        // Rect-overlap detection: any part of note overlaps bucket = hit
        const bucketRect = bucketRef.current.getBoundingClientRect();
        const noteRight = right || x + 230;
        const noteBottom = bottom || y + 200;
        const overlaps =
          x < bucketRect.right &&
          noteRight > bucketRect.left &&
          y < bucketRect.bottom &&
          noteBottom > bucketRect.top;

        if (overlaps) {
          onUpdateNote(id, { column: 'done' });
        } else {
          onUpdateNote(id, { x, y });
        }
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
          bucketRef={bucketRef}
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
  bucketRef,
}) {
  const [bucketHover, setBucketHover] = useState(false);

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

      {/* Done bucket */}
      <div
        ref={bucketRef}
        className={`done-bucket ${bucketHover ? 'done-bucket-hover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setBucketHover(true); }}
        onDragLeave={() => setBucketHover(false)}
        onDrop={(e) => { e.preventDefault(); setBucketHover(false); }}
      >
        <div className="done-bucket-icon">🗑️</div>
        <div className="done-bucket-label">拖入完成</div>
        <div className="done-bucket-hint">拖到这里 → 看板「已完成」</div>
      </div>

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
