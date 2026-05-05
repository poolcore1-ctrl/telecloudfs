import { useState } from 'react';

interface Props { onConfirm: (name: string) => Promise<void>; onClose: () => void; }

export default function CreateFolderModal({ onConfirm, onClose }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!name.trim()) { setError('Please enter a folder name'); return; }
    setLoading(true); setError('');
    try { await onConfirm(name.trim()); onClose(); }
    catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New Folder</div>
        <div className="modal-sub">Create a new Telegram channel as a storage folder.</div>
        {error && <div className="login-error">{error}</div>}
        <div className="form-group">
          <label className="label">Folder Name</label>
          <input autoFocus type="text" placeholder="My Files" value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
