import { useState, useRef, useEffect, useCallback } from 'react';

const NOTE_COLORS = [
  { name: '阳光黄', value: '#FFEAA7' },
  { name: '樱花粉', value: '#FFB8B8' },
  { name: '薄荷绿', value: '#B5EAD7' },
  { name: '天空蓝', value: '#C7CEEA' },
  { name: '蜜桃橙', value: '#FFDAC1' },
  { name: '嫩草绿', value: '#E2F0CB' },
];

export default function Note({
  note,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDragEnd,
  mode,
}) {
  const noteRef = useRef(null);
  const textRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });

  // Auto-focus new empty notes
  useEffect(() => {
    if (isSelected && !note.text && textRef.current) {
      setIsEditing(true);
      textRef.current.focus();
    }
  }, [isSelected, note.text]);

  // ──── Drag ────
  const handlePointerDown = useCallback(
    (e) => {
      if (e.target.closest('.note-actions') || e.target.tagName === 'TEXTAREA')
        return;
      e.preventDefault();
      onSelect(note.id);

      const rect = noteRef.current.getBoundingClientRect();
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        noteX: rect.left,
        noteY: rect.top,
      };
      setIsDragging(true);
      noteRef.current.setPointerCapture(e.pointerId);
    },
    [note.id, onSelect]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const newX = dragStart.current.noteX + dx;
      const newY = dragStart.current.noteY + dy;

      if (noteRef.current) {
        noteRef.current.style.left = `${newX}px`;
        noteRef.current.style.top = `${newY}px`;
        noteRef.current.style.transform = 'none';
        noteRef.current.style.zIndex = '1000';
        noteRef.current.style.transition = 'none';
      }
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!isDragging) return;
      setIsDragging(false);

      if (noteRef.current) {
        const rect = noteRef.current.getBoundingClientRect();
        noteRef.current.style.left = '';
        noteRef.current.style.top = '';
        noteRef.current.style.transform = '';
        noteRef.current.style.zIndex = '';
        noteRef.current.style.transition = '';
        onDragEnd(note.id, rect.left, rect.top);
      }
    },
    [isDragging, note.id, onDragEnd]
  );

  // ──── Edit ────
  const handleTextChange = useCallback(
    (e) => {
      onUpdate(note.id, { text: e.target.value });
    },
    [note.id, onUpdate]
  );

  const handleTextFocus = useCallback(() => {
    setIsEditing(true);
    onSelect(note.id);
  }, [note.id, onSelect]);

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleColorChange = useCallback(
    (color) => {
      onUpdate(note.id, { color });
      setShowColorPicker(false);
    },
    [note.id, onUpdate]
  );

  // ──── Determine style ────
  let style = {};
  if (mode === 'free') {
    style = {
      position: 'fixed',
      left: `${note.x}px`,
      top: `${note.y}px`,
    };
  }

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ ...style, backgroundColor: note.color }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Decorative washi tape */}
      <div className="note-tape" />

      {/* Action buttons */}
      <div className="note-actions">
        <button
          className="note-action-btn"
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="更换颜色"
        >
          🎨
        </button>
        <button
          className="note-action-btn note-delete-btn"
          onClick={() => onDelete(note.id)}
          title="删除"
        >
          ✕
        </button>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className="note-color-picker">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              className={`color-dot ${note.color === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => handleColorChange(c.value)}
              title={c.name}
            />
          ))}
        </div>
      )}

      {/* Note text */}
      <textarea
        ref={textRef}
        className="note-text"
        value={note.text}
        onChange={handleTextChange}
        onFocus={handleTextFocus}
        onBlur={handleTextBlur}
        placeholder="写点什么..."
        readOnly={!isEditing && !isSelected}
      />

      {/* Corner fold decoration */}
      <div className="note-fold" />
    </div>
  );
}
