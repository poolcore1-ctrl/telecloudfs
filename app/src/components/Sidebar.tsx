import { Folder } from '../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  folders: Folder[];
  activeFolderId: number | null;
  loading: boolean;
  onNewFolder: () => void;
  onDeleteFolder: (id: number) => void;
}

export default function Sidebar({ folders, activeFolderId, loading, onNewFolder, onDeleteFolder }: Props) {
  const navigate = useNavigate();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path d="M4 24L10 8l5 10 4-5 9 11H4z" fill="white" fillOpacity=".9" />
          </svg>
        </div>
        <span className="sidebar-brand">TeleCloudFS</span>
      </div>

      <div className="sidebar-items">
        <div className="sidebar-section-label">Storage</div>

        <div className={`sidebar-item ${activeFolderId === null ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}>
          <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5a1 1 0 011-1h3.5L8 6h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" />
          </svg>
          All Files
        </div>

        {loading && (
          <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 14, height: 14 }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading folders...</span>
          </div>
        )}

        {folders.map(f => (
          <div key={f.id} className={`sidebar-item ${activeFolderId === f.id ? 'active' : ''}`}
            onClick={() => navigate(`/dashboard/folder/${f.id}`)}
            onContextMenu={e => {
              e.preventDefault();
              if (confirm(`Delete folder "${f.name}"? This will delete the Telegram channel permanently.`)) {
                onDeleteFolder(f.id);
              }
            }}>
            <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" />
            </svg>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-full btn-sm" onClick={onNewFolder} style={{ justifyContent: 'flex-start', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Folder
        </button>
        <div style={{ height: 6 }} />
        <button className="btn btn-ghost btn-full btn-sm" onClick={() => navigate('/settings')} style={{ justifyContent: 'flex-start', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" />
            <path d="M13.5 8a5.5 5.5 0 01-.4 2l1.4 1.2-1.5 2.6-1.7-.7a5.5 5.5 0 01-3.3 1.3V16H5.5v-1.6a5.5 5.5 0 01-3.3-1.3l-1.7.7-1.5-2.6L.4 10A5.5 5.5 0 010 8a5.5 5.5 0 01.4-2L-1 4.8 .5 2.2l1.7.7A5.5 5.5 0 015.5.6V-1h3v1.6a5.5 5.5 0 013.3 1.3l1.7-.7 1.5 2.6-1.4 1.2A5.5 5.5 0 0113.5 8z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
}
