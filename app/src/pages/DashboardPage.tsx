import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import { FileItem, Folder } from '../types';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import FileCard from '../components/FileCard';
import ContextMenu from '../components/ContextMenu';
import Modal from '../components/Modal';

export default function DashboardPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const activeFolderId = folderId ? parseInt(folderId) : null;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMove, setShowMove] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; fileId: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCount = useRef(0);

  // Modal state for deletions
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; fileIds: number[] }>({ isOpen: false, fileIds: [] });

  // Load folders
  useEffect(() => {
    (async () => {
      try {
        const list = await telegramService.scanFolders();
        setFolders(list);
      } catch (e: any) { toast(e.message, 'error'); }
      finally { setFoldersLoading(false); }
    })();
  }, [toast]);

  // Load files
  useEffect(() => {
    (async () => {
      setFilesLoading(true);
      setSelected(new Set());
      try {
        const list = await telegramService.getFiles(activeFolderId);
        setFiles(list);
      } catch (e: any) { toast(e.message, 'error'); }
      finally { setFilesLoading(false); }
    })();
  }, [activeFolderId, toast]);

  // Derived stats
  const stats = useMemo(() => {
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    return { totalSize, fileCount: files.length };
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const folderName = useMemo(() => {
    if (activeFolderId === null) return 'All Files';
    return folders.find(f => f.id === activeFolderId)?.name || 'Folder';
  }, [activeFolderId, folders]);

  // Handlers
  const handleUpload = async (fileList: File[]) => {
    for (const file of fileList) {
      toast(`Uploading ${file.name}...`, 'info');
      try {
        await telegramService.uploadFile(file, activeFolderId);
        const updated = await telegramService.getFiles(activeFolderId);
        setFiles(updated);
        toast(`Uploaded ${file.name}`, 'success');
      } catch (e: any) { toast(`Failed to upload ${file.name}: ${e.message}`, 'error'); }
    }
  };

  const deleteFiles = async (ids: number[]) => {
    toast(`Deleting ${ids.length} file(s)...`, 'info');
    try {
      for (const id of ids) await telegramService.deleteFile(id, activeFolderId);
      setFiles(prev => prev.filter(f => !ids.includes(f.id)));
      setSelected(new Set());
      toast(`${ids.length} file(s) deleted`, 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const renameFolder = useCallback(async (id: number, name: string) => {
    try {
      await telegramService.renameFolder(id, name);
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
      toast('Folder renamed', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  }, [toast]);

  const deleteFolder = useCallback(async (id: number) => {
    try {
      await telegramService.deleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (activeFolderId === id) navigate('/dashboard');
      toast('Folder deleted', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  }, [activeFolderId, navigate, toast]);

  const selectAll = () => {
    if (selected.size === filteredFiles.length) setSelected(new Set());
    else setSelected(new Set(filteredFiles.map(f => f.id)));
  };

  const openFile = (file: FileItem) => {
    const url = telegramService.getStreamingUrl(file.id, activeFolderId, file.name);
    window.open(url, '_blank');
  };

  const downloadFile = (file: FileItem) => {
    const url = telegramService.getStreamingUrl(file.id, activeFolderId, file.name);
    const a = document.createElement('a');
    a.href = url + '?download=1';
    a.download = file.name;
    a.click();
  };

  return (
    <div className="app-shell" onDragEnter={() => setIsDragging(true)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setIsDragging(false); handleUpload(Array.from(e.dataTransfer.files)); }}>
      <Sidebar folders={folders} activeFolderId={activeFolderId} loading={foldersLoading} onNewFolder={() => setShowNewFolder(true)} onDeleteFolder={deleteFolder} />

      <div className="main-panel">
        <TopBar
          folderName={folderName}
          activeFolderId={activeFolderId}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          onUpload={handleUpload}
          selectedCount={selected.size}
          totalCount={filteredFiles.length}
          onMoveSelected={() => setShowMove(true)}
          onDeleteSelected={() => setDeleteModal({ isOpen: true, fileIds: Array.from(selected) })}
          onClearSelection={() => setSelected(new Set())}
          onSelectAll={selectAll}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          stats={stats}
        />

        <div className="file-area" onClick={() => { setCtx(null); setSelected(new Set()); }}>
          {filesLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Fetching files from Telegram...</p>
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
              {filteredFiles.map(f => (
                <FileCard key={f.id} file={f} selected={selected.has(f.id)}
                  onSelect={e => { e.stopPropagation(); const s = new Set(selected); if (s.has(f.id)) s.delete(f.id); else s.add(f.id); setSelected(s); }}
                  onOpen={() => openFile(f)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, fileId: f.id }); }} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>This folder is empty</h3>
              <p>Upload files or drag and drop here</p>
            </div>
          )}
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={[
        { label: 'Open', onClick: () => openFile(files.find(f => f.id === ctx.fileId)!) },
        { label: 'Download', onClick: () => downloadFile(files.find(f => f.id === ctx.fileId)!) },
        { divider: true },
        { label: 'Delete', danger: true, onClick: () => setDeleteModal({ isOpen: true, fileIds: [ctx.fileId] }) }
      ]} onClose={() => setCtx(null)} />}

      <Modal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ isOpen: false, fileIds: [] })}
        onConfirm={() => deleteFiles(deleteModal.fileIds)}
        title="Delete Files"
        message={`Are you sure you want to delete ${deleteModal.fileIds.length} file(s) permanently?`}
        isDanger={true}
        confirmText="Delete"
      />

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="modal-overlay" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24 }}>
             <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>New Folder</h3>
             <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Enter a name for the new folder on Telegram:</p>
             <input 
               className="form-input" 
               style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 8, color: 'white', outline: 'none' }} 
               placeholder="Folder name" 
               value={newFolderName} 
               onChange={e => setNewFolderName(e.target.value)} 
               autoFocus 
               onKeyDown={e => e.key === 'Enter' && newFolderName && (createFolder(newFolderName), setShowNewFolder(false), setNewFolderName(''))} 
             />
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button className="btn btn-ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>Cancel</button>
                <button className="btn btn-primary" disabled={!newFolderName} onClick={() => { createFolder(newFolderName); setShowNewFolder(false); setNewFolderName(''); }}>
                  Create Folder
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
