import { useRef, useState, useEffect } from 'react';

interface Props {
  folderName: string;
  activeFolderId: number | null;
  viewMode: 'grid' | 'list';
  onViewChange: (v: 'grid' | 'list') => void;
  onSearch: (q: string) => void;
  searchQuery: string;
  onUpload: (files: File[]) => void;
  selectedCount: number;
  onMoveSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onRenameFolder: (id: number, newName: string) => void;
  onDeleteFolder: (id: number) => void;
}

export default function TopBar({ 
  folderName, activeFolderId, viewMode, onViewChange, onSearch, searchQuery, 
  onUpload, selectedCount, onMoveSelected, onDeleteSelected, onClearSelection,
  onRenameFolder, onDeleteFolder 
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(folderName);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { setNewName(folderName); setIsEditing(false); setDeleteConfirm(false); }, [folderName, activeFolderId]);

  const handleRename = () => {
    if (activeFolderId && newName.trim() && newName !== folderName) {
      onRenameFolder(activeFolderId, newName.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    } else if (activeFolderId) {
      onDeleteFolder(activeFolderId);
      setDeleteConfirm(false);
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-title-area">
        {isEditing ? (
          <input className="topbar-edit-input" value={newName} onChange={e => setNewName(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleRename()} onBlur={handleRename} autoFocus />
        ) : (
          <div className="topbar-title">{folderName}</div>
        )}

        {activeFolderId && (
          <div className="topbar-title-actions">
            <button className="btn-icon-sm" onClick={() => setIsEditing(true)} title="Rename folder">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2l3 3L5 14H2v-3L11 2z" />
              </svg>
            </button>
            <button className={`btn-icon-sm ${deleteConfirm ? 'danger-active' : ''}`} onClick={handleDelete} title="Delete folder">
              {deleteConfirm ? <span style={{ fontSize: 10, fontWeight: 600 }}>Sure?</span> : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h10M4 4v10a1 1 0 001 1h6a1 1 0 001-1V4M6 4V2a1 1 0 011-1h2a1 1 0 011 1v2" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="topbar-search">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
        </svg>
        <input type="text" placeholder="Search files..." value={searchQuery} onChange={e => onSearch(e.target.value)} />
      </div>

      <div className="topbar-actions">
        {selectedCount > 0 ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{selectedCount} selected</span>
            <button className="btn btn-ghost btn-sm" onClick={onMoveSelected}>Move</button>
            <button className="btn btn-danger btn-sm" onClick={onDeleteSelected}>Delete</button>
            <button className="btn-icon" onClick={onClearSelection} title="Clear selection">✕</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', padding: 2, border: '1px solid var(--border)' }}>
              {(['grid', 'list'] as const).map(v => (
                <button key={v} className="btn-icon" onClick={() => onViewChange(v)}
                  style={{ borderRadius: 6, padding: '4px 8px', background: viewMode === v ? 'var(--bg-hover)' : 'transparent', color: viewMode === v ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {v === 'grid' ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                      <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M1 4h14M1 8h14M1 12h14" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v8M5 5l3-3 3 3M2 13h12" />
              </svg>
              Upload
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => { if (e.target.files) { onUpload(Array.from(e.target.files)); e.target.value = ''; } }} />
          </>
        )}
      </div>
    </div>
  );
}
