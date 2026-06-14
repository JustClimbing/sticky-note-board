import { useState, useRef, useEffect, useCallback } from 'react';

const NOTE_COLORS = [
  { name: '阳光黄', value: '#FFEAA7' },
  { name: '樱花粉', value: '#FFB8B8' },
  { name: '薄荷绿', value: '#B5EAD7' },
  { name: '天空蓝', value: '#C7CEEA' },
  { name: '蜜桃橙', value: '#FFDAC1' },
  { name: '嫩草绿', value: '#E2F0CB' },
];

const MIN_WIDTH = 140;
const MIN_HEIGHT = 120;
const MIN_FONT = 10;
const MAX_FONT = 28;

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
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

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
      if (
        e.target.closest('.note-actions') ||
        e.target.closest('.note-resize-handle') ||
        e.target.closest('.note-color-picker') ||
        e.target.tagName === 'TEXTAREA'
      )
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

  // ──── Resize ────
  const handleResizeDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(note.id);

      const rect = noteRef.current.getBoundingClientRect();
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: rect.width,
        h: rect.height,
      };
      setIsResizing(true);
      noteRef.current.setPointerCapture(e.pointerId);
    },
    [note.id, onSelect]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (isResizing) {
        const dw = e.clientX - resizeStart.current.x;
        const dh = e.clientY - resizeStart.current.y;
        const newW = Math.max(MIN_WIDTH, resizeStart.current.w + dw);
        const newH = Math.max(MIN_HEIGHT, resizeStart.current.h + dh);
        if (noteRef.current) {
          noteRef.current.style.width = `${newW}px`;
          noteRef.current.style.minHeight = `${newH}px`;
          noteRef.current.style.transition = 'none';
        }
        return;
      }

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
    [isDragging, isResizing]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (isResizing) {
        setIsResizing(false);
        if (noteRef.current) {
          const rect = noteRef.current.getBoundingClientRect();
          noteRef.current.style.width = '';
          noteRef.current.style.minHeight = '';
          noteRef.current.style.transition = '';
          onUpdate(note.id, { width: Math.round(rect.width), height: Math.round(rect.height) });
        }
        return;
      }

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
    [isDragging, isResizing, note.id, onDragEnd, onUpdate]
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

  // ──── Font Size ────
  const handleFontIncrease = useCallback(() => {
    const current = note.fontSize || 15;
    onUpdate(note.id, { fontSize: Math.min(MAX_FONT, current + 2) });
  }, [note.id, note.fontSize, onUpdate]);

  const handleFontDecrease = useCallback(() => {
    const current = note.fontSize || 15;
    onUpdate(note.id, { fontSize: Math.max(MIN_FONT, current - 2) });
  }, [note.id, note.fontSize, onUpdate]);

  // ──── Determine style ────
  let style = {};
  if (mode === 'free') {
    style = {
      position: 'fixed',
      left: `${note.x}px`,
      top: `${note.y}px`,
    };
  }

  // Apply saved size
  if (note.width) style.width = `${note.width}px`;
  if (note.height) style.minHeight = `${note.height}px`;

  const textStyle = note.fontSize ? { fontSize: `${note.fontSize}px` } : {};

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{ ...style, backgroundColor: note.color }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Decorative washi tape */}
      <div className="note-tape" />

      {/* Action buttons */}
      <div className="note-actions">
        <button className="note-action-btn" onClick={handleFontDecrease} title="缩小字体">
          A-
        </button>
        <button className="note-action-btn" onClick={handleFontIncrease} title="放大字体">
          A+
        </button>
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
        style={textStyle}
      />

      {/* Corner fold decoration */}
      <div className="note-fold" />

      {/* Resize handle */}
      <div
        className="note-resize-handle"
        onPointerDown={handleResizeDown}
      />
    </div>
  );
}
