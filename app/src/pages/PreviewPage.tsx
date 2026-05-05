import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import FileTypeIcon from '../components/FileTypeIcon';
import { formatBytes, formatDate } from '../utils';

export default function PreviewPage() {
  const { fileId, folderId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const fid = fileId ? parseInt(fileId) : null;
        const foldId = folderId ? parseInt(folderId) : null;
        if (!fid) throw new Error('Invalid File ID');

        // Check if metadata is in URL
        const name = searchParams.get('n');
        const size = searchParams.get('s');
        const type = searchParams.get('t');

        if (name && size && type) {
          setFileData({
            id: fid,
            name,
            size: parseInt(size),
            icon_type: type,
            date: Date.now() / 1000 // Fallback date
          });
          setLoading(false);
          return;
        }

        // If not in URL, try to fetch (requires login)
        const list = await telegramService.getFiles(foldId);
        const file = list.find(f => f.id === fid);
        if (!file) throw new Error('File not found or access denied');
        
        setFileData(file);
      } catch (e: any) {
        // If we have params but fetching failed (e.g. not logged in), 
        // we already handled it above. This catch is for when params are missing.
        setError(e.message === 'Client not connected' ? 'Please log in to view this file or use a public share link.' : e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, folderId, searchParams]);

  const handleDownload = () => {
    if (!fileData) return;
    const url = telegramService.getStreamingUrl(fileData.id, folderId ? parseInt(folderId) : null, fileData.name);
    const a = document.createElement('a');
    a.href = url + '&download=1';
    a.download = fileData.name;
    a.click();
  };

  const getStreamUrl = () => {
    if (!fileData) return '';
    return telegramService.getStreamingUrl(fileData.id, folderId ? parseInt(folderId) : null, fileData.name);
  };

  if (loading) return (
    <div className="preview-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (error && !fileData) return (
    <div className="preview-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="error-box" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '32px', borderRadius: '16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h3 style={{ color: 'var(--text-1)', marginBottom: '8px' }}>Private File</h3>
        <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => window.location.href = '/login'}>Log In to View</button>
      </div>
    </div>
  );

  const isVideo = fileData.name.match(/\.(mp4|webm|ogg|mov)$/i);
  const isImage = fileData.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  const isAudio = fileData.name.match(/\.(mp3|wav|ogg|m4a)$/i);

  return (
    <div className="preview-layout">
      <div className="preview-header">
        <div className="preview-logo">☁️ TeleCloudFS</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => window.location.href = '/dashboard'}>Dashboard</button>
          <button className="btn btn-primary btn-sm" onClick={handleDownload}>Download</button>
        </div>
      </div>

      <div className="preview-content">
        <div className="preview-viewer">
          {isImage ? (
            <img src={getStreamUrl()} alt={fileData.name} className="preview-media" />
          ) : isVideo ? (
            <video src={getStreamUrl()} controls className="preview-media" autoPlay />
          ) : isAudio ? (
            <audio src={getStreamUrl()} controls className="preview-media" />
          ) : (
            <div className="preview-generic">
              <FileTypeIcon type={fileData.icon_type} size={80} />
              <div className="preview-filename">{fileData.name}</div>
              <p>Preview not available for this file type.</p>
            </div>
          )}
        </div>

        <div className="preview-sidebar">
          <h2 className="preview-title">{fileData.name}</h2>
          <div className="preview-meta-grid">
            <div className="meta-label">Size</div><div className="meta-value">{formatBytes(fileData.size)}</div>
            <div className="meta-label">Date</div><div className="meta-value">{formatDate(fileData.date)}</div>
            <div className="meta-label">Type</div><div className="meta-value">{fileData.icon_type.toUpperCase()}</div>
          </div>
          
          <div className="preview-actions">
             <button className="btn btn-ghost btn-full" onClick={() => {
               navigator.clipboard.writeText(window.location.href);
               alert('Link copied to clipboard!');
             }}>Copy Share Link</button>
          </div>
        </div>
      </div>
    </div>
  );
}
