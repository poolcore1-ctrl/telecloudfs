import { Folder } from '../types';
import { useNavigate } from 'react-router-dom';
import { Folder as FolderIcon, Plus, Settings, Home } from 'lucide-react';
import Logo from './Logo';

interface SidebarProps {
  folders: any[];
  activeFolderId: number | null;
  loading: boolean;
  onNewFolder: () => void;
  onDeleteFolder: (id: number) => void;
  className?: string;
}

export default function Sidebar({ folders, activeFolderId, loading, onNewFolder, onDeleteFolder, className = '' }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <div className={`sidebar ${className}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Logo size={18} />
          <span>TeleCloudFS</span>
        </div>
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
