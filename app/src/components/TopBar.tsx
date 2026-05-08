import { useRef, useState, useEffect } from 'react';
import { Search, Upload, Grid, List, CheckSquare, Trash2, Edit2, Copy, Move, X, Menu } from 'lucide-react';

interface Props {
  folderName: string;
  activeFolderId: number | null;
  viewMode: 'grid' | 'list';
  onViewChange: (v: 'grid' | 'list') => void;
  onSearch: (q: string) => void;
  searchQuery: string;
  onUpload: (files: File[]) => void;
  selectedCount: number;
  totalCount: number;
  onMoveSelected: () => void;
  onCopySelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onRenameFolder: (id: number, newName: string) => void;
  onDeleteFolder: (id: number) => void;
  stats: { totalSize: number; fileCount: number };
  onToggleSidebar?: () => void;
}

export default function TopBar({ 
  folderName, activeFolderId, viewMode, onViewChange, onSearch, searchQuery, 
  onUpload, selectedCount, totalCount, onMoveSelected, onCopySelected, onDeleteSelected, onClearSelection,
  onSelectAll, onRenameFolder, onDeleteFolder, stats, onToggleSidebar
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(folderName);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);

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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`topbar ${showSearchMobile ? 'search-active' : ''}`}>
      <div className="topbar-title-area">
        {!showSearchMobile && (
          <button className="btn-menu-mobile" onClick={onToggleSidebar}>
            <Menu size={20} />
          </button>
        )}
        
        {isEditing ? (
          <input className="topbar-edit-input" value={newName} onChange={e => setNewName(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleRename()} onBlur={handleRename} autoFocus />
        ) : (
          <div className="topbar-title">{folderName}</div>
        )}

        {activeFolderId && !showSearchMobile && (
          <div className="topbar-title-actions">
            <button className="btn-icon-sm" onClick={() => setIsEditing(true)}>
              <Edit2 size={12} />
            </button>
            <button className={`btn-icon-sm ${deleteConfirm ? 'danger-active' : ''}`} onClick={handleDelete}>
              {deleteConfirm ? <span style={{ fontSize: 10 }}>Sure?</span> : <Trash2 size={12} />}
            </button>
          </div>
        )}
      </div>

      <div className="topbar-stats">
        <span className="stats-item">{stats.fileCount} files</span>
        <span className="stats-divider">•</span>
        <span className="stats-item">{formatSize(stats.totalSize)}</span>
      </div>

      <div className={`topbar-search ${showSearchMobile ? 'mobile-visible' : ''}`}>
        <Search className="search-icon" size={16} />
        <input type="text" placeholder="Search files..." value={searchQuery} onChange={e => onSearch(e.target.value)} />
        <button className="search-close-mobile" onClick={() => setShowSearchMobile(false)}>
          <X size={16} />
        </button>
      </div>

      <div className="topbar-actions">
        {selectedCount > 0 ? (
          <>
            <span className="selected-count-label">{selectedCount} selected</span>
            <button className="btn btn-ghost btn-sm" onClick={onCopySelected} title="Copy">
              <Copy size={14} /><span className="btn-text">Copy</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onMoveSelected} title="Move">
              <Move size={14} /><span className="btn-text">Move</span>
            </button>
            <button className="btn btn-danger btn-sm" onClick={onDeleteSelected} title="Delete">
              <Trash2 size={14} /><span className="btn-text">Delete</span>
            </button>
            <button className="btn-icon" onClick={onClearSelection} title="Clear selection"><X size={16} /></button>
          </>
        ) : (
          <>
            <button className="btn-icon mobile-only" onClick={() => setShowSearchMobile(true)}>
              <Search size={20} />
            </button>
            
            <button className="btn btn-ghost btn-sm btn-select-all" onClick={onSelectAll} disabled={totalCount === 0}>
              <CheckSquare size={14} />
              <span className="btn-text">Select All</span>
            </button>
            
            <div className="view-toggle">
              {(['grid', 'list'] as const).map(v => (
                <button key={v} className="btn-icon" onClick={() => onViewChange(v)}
                  style={{ background: viewMode === v ? 'var(--bg-hover)' : 'transparent', color: viewMode === v ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {v === 'grid' ? <Grid size={16} /> : <List size={16} />}
                </button>
              ))}
            </div>

            <button className="btn btn-primary btn-sm btn-upload" onClick={() => fileRef.current?.click()}>
              <Upload size={14} />
              <span className="btn-text">Upload</span>
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => { if (e.target.files) { onUpload(Array.from(e.target.files)); e.target.value = ''; } }} />
          </>
        )}
      </div>
    </div>
  );
}
