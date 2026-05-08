import { Folder } from '../types';
import { useNavigate } from 'react-router-dom';
import { Folder as FolderIcon, Plus, Settings, Home, LayoutGrid } from 'lucide-react';

interface Props {
  folders: Folder[];
  activeFolderId: number | null;
  loading: boolean;
  onNewFolder: () => void;
  onDeleteFolder: (id: number) => void;
  className?: string;
}

export default function Sidebar({ folders, activeFolderId, loading, onNewFolder, onDeleteFolder, className = '' }: Props) {
  const navigate = useNavigate();

  return (
    <div className={`sidebar ${className}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <LayoutGrid size={18} color="white" />
        </div>
        <span className="sidebar-brand">TeleCloudFS</span>
      </div>

      <div className="sidebar-items">
        <div className="sidebar-section-label">Storage</div>

        <div className={`sidebar-item ${activeFolderId === null ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}>
          <Home className="icon" size={16} />
          <span>All Files</span>
        </div>

        {loading && (
          <div className="sidebar-loading">
            <div className="spinner" />
          </div>
        )}

        {folders.map(f => (
          <div key={f.id} className={`sidebar-item ${activeFolderId === f.id ? 'active' : ''}`}
            onClick={() => navigate(`/dashboard/folder/${f.id}`)}>
            <FolderIcon className="icon" size={16} />
            <span>{f.name}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-btn primary" onClick={onNewFolder}>
          <Plus size={20} />
          <span>New Folder</span>
        </button>
        <button className="sidebar-btn" onClick={() => navigate('/settings')}>
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
