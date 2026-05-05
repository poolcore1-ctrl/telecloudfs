import { Folder } from '../types';

interface Props { folders: Folder[]; currentFolderId: number | null; onMove: (targetId: number | null) => Promise<void>; onClose: () => void; }

export default function MoveModal({ folders, currentFolderId, onMove, onClose }: Props) {
  const targets = [{ id: null as number | null, name: 'Home (Saved Messages)' }, ...folders.filter(f => f.id !== currentFolderId).map(f => ({ id: f.id, name: f.name }))];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Move Files</div>
        <div className="modal-sub">Select a destination folder.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
          {targets.map(t => (
            <button key={String(t.id)} className="btn btn-ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
              onClick={() => { onMove(t.id); onClose(); }}>
              <span>📁</span> {t.name}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
