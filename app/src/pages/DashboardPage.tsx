import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import { FileItem, Folder } from '../types';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import FileCard from '../components/FileCard';
import FileListItem from '../components/FileListItem';
import ContextMenu from '../components/ContextMenu';
import Modal from '../components/Modal';
import MoveModal from '../components/MoveModal';

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
  const [transferMode, setTransferMode] = useState<'move' | 'copy'>('move');
  const [showTransfer, setShowTransfer] = useState(false);
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

  const [page, setPage] = useState(1);
  const pageSize = 60;

  // Load files and sync with registry
  useEffect(() => {
    (async () => {
      setFilesLoading(true);
      setSelected(new Set());
      setPage(1);
      try {
        const list = await telegramService.getFiles(activeFolderId);
        setFiles(list);

        // Background indexing for permanent links
        const activeFolder = folders.find(f => f.id === activeFolderId);
        const folderPath = activeFolder ? `/${activeFolder.name}` : '/home';
        
        // Sync files in background
        Promise.all(list.slice(0, 100).map(file => fetch('/api/file/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `${activeFolderId || 0}_${file.id}`,
            path: `${folderPath}/${file.name}`,
            folderId: activeFolderId || 0,
            messageId: file.id,
            accessHash: activeFolder?.access_hash || '0',
            name: file.name,
            size: file.size,
            type: file.icon_type,
            mimeType: file.mime_type
          })
        }))).catch(err => console.warn('Registry sync failed:', err));

      } catch (e: any) { toast(e.message, 'error'); }
      finally { setFilesLoading(false); }
    })();
  }, [activeFolderId, folders, toast]);

  // Derived stats
  const stats = useMemo(() => {
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    return { totalSize, fileCount: files.length };
  }, [files]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return files.filter(f => !q || f.name.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const paginatedFiles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFiles.slice(start, start + pageSize);
  }, [filteredFiles, page]);

  const totalPages = Math.ceil(filteredFiles.length / pageSize);

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
      await telegramService.deleteFiles(ids, activeFolderId);
      setFiles(prev => prev.filter(f => !ids.includes(f.id)));
      setSelected(new Set());
      toast(`${ids.length} file(s) deleted`, 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const handleTransfer = async (targetFolderId: number | null) => {
    if (targetFolderId === activeFolderId) return;
    const ids = Array.from(selected);
    const action = transferMode === 'copy' ? 'Copying' : 'Moving';
    toast(`${action} ${ids.length} file(s)...`, 'info');
    try {
      if (transferMode === 'copy') {
        await telegramService.copyFiles(ids, activeFolderId, targetFolderId);
      } else {
        await telegramService.moveFiles(ids, activeFolderId, targetFolderId);
        setFiles(prev => prev.filter(f => !ids.includes(f.id)));
      }
      setSelected(new Set());
      toast(`${ids.length} file(s) ${transferMode}d`, 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const createFolder = useCallback(async (name: string) => {
    try {
      const folder = await telegramService.createFolder(name);
      setFolders(prev => [...prev, folder]);
      toast(`Folder "${name}" created`, 'success');
      navigate(`/dashboard/folder/${folder.id}`);
    } catch (e: any) { toast(e.message, 'error'); }
  }, [navigate, toast]);

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
    if (selected.size === filteredFiles.length && filteredFiles.length > 0) setSelected(new Set());
    else setSelected(new Set(filteredFiles.map(f => f.id)));
  };

  const openFile = async (file: FileItem) => {
    // Navigate to preview page with clean URL — it will fetch metadata from the secure API
    const previewUrl = `/preview/${activeFolderId || 0}/${file.id}`;
    window.open(previewUrl, '_blank');
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
          onMoveSelected={() => { setTransferMode('move'); setShowTransfer(true); }}
          onCopySelected={() => { setTransferMode('copy'); setShowTransfer(true); }}
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
          ) : paginatedFiles.length > 0 ? (
            <>
              <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
                {paginatedFiles.map(f => (
                  viewMode === 'grid' ? (
                    <FileCard key={f.id} file={f} selected={selected.has(f.id)}
                      onSelect={e => { e.stopPropagation(); const s = new Set(selected); if (s.has(f.id)) s.delete(f.id); else s.add(f.id); setSelected(s); }}
                      onOpen={() => openFile(f)}
                      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, fileId: f.id }); }} />
                  ) : (
                    <FileListItem key={f.id} file={f} selected={selected.has(f.id)}
                      onSelect={e => { e.stopPropagation(); const s = new Set(selected); if (s.has(f.id)) s.delete(f.id); else s.add(f.id); setSelected(s); }}
                      onOpen={() => openFile(f)}
                      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, fileId: f.id }); }} />
                  )
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                  <span className="page-info">Page {page} of {totalPages}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
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
        { label: 'Copy to...', onClick: () => { setSelected(new Set([ctx.fileId])); setTransferMode('copy'); setShowTransfer(true); } },
        { label: 'Move to...', onClick: () => { setSelected(new Set([ctx.fileId])); setTransferMode('move'); setShowTransfer(true); } },
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

      <MoveModal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        onConfirm={handleTransfer}
        folders={folders.filter(f => f.id !== activeFolderId)}
        selectedCount={selected.size}
        mode={transferMode}
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
