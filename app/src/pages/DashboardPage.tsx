import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Folder, FileItem, UploadItem } from '../types';
import { telegramService } from '../services/TelegramClient';
import { useToast } from '../context/ToastContext';
import { formatBytes } from '../utils';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import FileCard from '../components/FileCard';
import FileListItem from '../components/FileListItem';
import ContextMenu from '../components/ContextMenu';
import CreateFolderModal from '../components/CreateFolderModal';
import MoveModal from '../components/MoveModal';

export default function DashboardPage() {
  const { folderId: folderIdParam } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const activeFolderId = folderIdParam ? parseInt(folderIdParam) : null;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; fileId: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCount = useRef(0);

  const folderName = activeFolderId === null
    ? 'All Files'
    : folders.find(f => f.id === activeFolderId)?.name ?? 'Folder';

  // Load folders
  const loadFolders = useCallback(async () => {
    setFoldersLoading(true);
    try { setFolders(await telegramService.scanFolders()); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setFoldersLoading(false); }
  }, [toast]);

  // Load files
  const loadFiles = useCallback(async () => {
    setFilesLoading(true); setSelected(new Set());
    try { setFiles(await telegramService.getFiles(activeFolderId)); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setFilesLoading(false); }
  }, [activeFolderId, toast]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Filtered files
  const filteredFiles = searchQuery.trim()
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  // Upload handler
  const handleUpload = useCallback(async (fileList: File[]) => {
    for (const file of fileList) {
      const id = Math.random().toString(36).slice(2);
      setUploads(p => [...p, { id, file, progress: 0, status: 'uploading' }]);
      try {
        await telegramService.uploadFile(file, activeFolderId, (p) => {
          setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: Math.round(p * 100) } : u));
        });
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'done', progress: 100 } : u));
        setTimeout(() => setUploads(prev => prev.filter(u => u.id !== id)), 2000);
        toast(`Uploaded ${file.name}`, 'success');
        loadFiles();
      } catch (e: any) {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: e.message } : u));
        toast(`Failed: ${e.message}`, 'error');
      }
    }
  }, [activeFolderId, loadFiles, toast]);

  // Delete
  const deleteFile = useCallback(async (fileId: number) => {
    try {
      await telegramService.deleteFile(fileId, activeFolderId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelected(prev => { const s = new Set(prev); s.delete(fileId); return s; });
      toast('File deleted', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  }, [activeFolderId, toast]);

  const deleteSelected = useCallback(async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} file(s)?`)) return;
    const ids = Array.from(selected);
    try {
      for (const id of ids) await telegramService.deleteFile(id, activeFolderId);
      setFiles(prev => prev.filter(f => !ids.includes(f.id)));
      setSelected(new Set());
      toast(`Deleted ${ids.length} file(s)`, 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  }, [selected, activeFolderId, toast]);

  // Move
  const moveSelected = useCallback(async (targetFolderId: number | null) => {
    const ids = Array.from(selected);
    try {
      await telegramService.moveFiles(ids, activeFolderId, targetFolderId);
      setFiles(prev => prev.filter(f => !ids.includes(f.id)));
      setSelected(new Set());
      toast(`Moved ${ids.length} file(s)`, 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  }, [selected, activeFolderId, toast]);

  // Open/stream file
  const openFile = useCallback((file: FileItem) => {
    const url = telegramService.getStreamingUrl(file.id, activeFolderId, file.name);
    window.open(url, '_blank');
  }, [activeFolderId]);

  // Download file
  const downloadFile = useCallback((file: FileItem) => {
    const url = telegramService.getStreamingUrl(file.id, activeFolderId, file.name);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
  }, [activeFolderId]);

  // Create folder
  const createFolder = useCallback(async (name: string) => {
    const folder = await telegramService.createFolder(name);
    setFolders(prev => [...prev, folder]);
    toast(`Folder "${name}" created`, 'success');
    navigate(`/dashboard/folder/${folder.id}`);
  }, [navigate, toast]);

  // Delete folder
  const deleteFolder = useCallback(async (id: number) => {
    try {
      await telegramService.deleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (activeFolderId === id) navigate('/dashboard');
      toast('Folder deleted', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  }, [activeFolderId, navigate, toast]);

  // Selection
  const toggleSelect = (id: number) => setSelected(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  // Context menu items
  const ctxFile = ctx ? files.find(f => f.id === ctx.fileId) : null;
  const ctxItems = ctxFile ? [
    { label: 'Open / Preview', icon: '▶', onClick: () => openFile(ctxFile) },
    { label: 'Download', icon: '⬇', onClick: () => downloadFile(ctxFile) },
    { label: 'Move to...', icon: '→', onClick: () => { setSelected(new Set([ctxFile.id])); setShowMove(true); } },
    { divider: true },
    { label: 'Delete', icon: '🗑', danger: true, onClick: () => deleteFile(ctxFile.id) },
  ] : [];

  // Drag & drop
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCount.current++; setIsDragging(true); };
  const handleDragLeave = () => { dragCount.current--; if (dragCount.current === 0) setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); dragCount.current = 0; setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleUpload(files);
  };

  return (
    <div className="app-shell" onDragEnter={handleDragEnter} onDragOver={e => e.preventDefault()} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Sidebar folders={folders} activeFolderId={activeFolderId} loading={foldersLoading} onNewFolder={() => setShowNewFolder(true)} onDeleteFolder={deleteFolder} />

      <div className="main-panel">
        <TopBar
          folderName={folderName}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          onUpload={handleUpload}
          selectedCount={selected.size}
          onMoveSelected={() => setShowMove(true)}
          onDeleteSelected={deleteSelected}
          onClearSelection={() => setSelected(new Set())}
        />

        <div className="file-area" onClick={() => { setCtx(null); setSelected(new Set()); }}>
          {filesLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="12" width="56" height="44" rx="4"/><path d="M4 24h56M16 12V4M48 12V4"/>
              </svg>
              <div className="empty-title">{searchQuery ? 'No files match your search' : 'This folder is empty'}</div>
              <div className="empty-sub">{searchQuery ? 'Try a different search term' : 'Upload files or drag and drop here'}</div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="file-grid">
              {filteredFiles.map(f => (
                <FileCard key={f.id} file={f} selected={selected.has(f.id)}
                  onSelect={e => { (e as any).stopPropagation?.(); toggleSelect(f.id); }}
                  onOpen={() => openFile(f)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, fileId: f.id }); }} />
              ))}
            </div>
          ) : (
            <div className="file-list">
              {filteredFiles.map(f => (
                <FileListItem key={f.id} file={f} selected={selected.has(f.id)}
                  onSelect={() => toggleSelect(f.id)}
                  onOpen={() => openFile(f)}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, fileId: f.id }); }}
                  onDelete={() => deleteFile(f.id)}
                  onDownload={() => downloadFile(f)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="upload-queue">
          <div className="upload-queue-title">Uploads</div>
          {uploads.map(u => (
            <div key={u.id} className="upload-item">
              <div className="upload-item-name">{u.file.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div className="progress-bar-fill" style={{ width: `${u.progress}%`, background: u.status === 'error' ? 'var(--danger)' : u.status === 'done' ? 'var(--success)' : 'var(--accent)' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 32 }}>{u.status === 'uploading' ? `${u.progress}%` : u.status === 'done' ? '✓' : '✕'}</span>
              </div>
              {u.error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{u.error}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-text">Drop files to upload</div>
        </div>
      )}

      {/* Context menu */}
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctxItems} onClose={() => setCtx(null)} />}

      {/* Modals */}
      {showNewFolder && <CreateFolderModal onConfirm={createFolder} onClose={() => setShowNewFolder(false)} />}
      {showMove && <MoveModal folders={folders} currentFolderId={activeFolderId} onMove={moveSelected} onClose={() => setShowMove(false)} />}
    </div>
  );
}
