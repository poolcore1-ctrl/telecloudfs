import { useRef } from 'react';

interface Props {
  folderName: string;
  viewMode: 'grid' | 'list';
  onViewChange: (v: 'grid' | 'list') => void;
  onSearch: (q: string) => void;
  searchQuery: string;
  onUpload: (files: File[]) => void;
  selectedCount: number;
  onMoveSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export default function TopBar({ folderName, viewMode, onViewChange, onSearch, searchQuery, onUpload, selectedCount, onMoveSelected, onDeleteSelected, onClearSelection }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="topbar">
      <div className="topbar-title">{folderName}</div>

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
            {/* View toggle */}
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
