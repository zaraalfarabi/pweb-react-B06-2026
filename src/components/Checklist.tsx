import { useState, type FormEvent } from 'react';
import type { ChecklistItem } from '../types';

interface ChecklistProps {
  items: ChecklistItem[];
  onAdd: (text: string) => void;
  onToggle: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

export default function Checklist({ items, onAdd, onToggle, onRemove }: ChecklistProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  // derived state: progress dihitung langsung dari items
  const doneCount = items.filter((item) => item.done).length;
  const percent = items.length === 0 ? 0 : (doneCount / items.length) * 100;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (text.trim() === '') {
      setError('Tugas persiapan tidak boleh kosong.');
      return;
    }
    onAdd(text.trim());
    setText('');
    setError('');
  };

  return (
    <section className="checklist">
      <div className="section-head">
        <span className="section-title">Daftar Persiapan</span>
        <span className="mono checklist-count">
          {doneCount} / {items.length} selesai
        </span>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>

      {items.length === 0 ? (
        <p className="muted">Belum ada tugas persiapan.</p>
      ) : (
        <ul className="checklist-list">
          {items.map((item) => (
            <li key={item.id} className={`checklist-item ${item.done ? 'is-done' : ''}`}>
              <label>
                <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} />
                <span>{item.text}</span>
              </label>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onRemove(item.id)}
                aria-label={`Hapus ${item.text}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          className="input grow"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tambah tugas persiapan baru..."
          aria-label="Tugas persiapan baru"
        />
        <button type="submit" className="btn btn-primary">Tambah</button>
      </form>
      {error !== '' && <p className="error-text">{error}</p>}
    </section>
  );
}