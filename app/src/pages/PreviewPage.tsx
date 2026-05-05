import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import FileTypeIcon from '../components/FileTypeIcon';
import { formatBytes, formatDate } from '../utils';

export default function PreviewPage() {
  const { fileId, folderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const fid = fileId ? parseInt(fileId) : null;
        const foldId = folderId ? parseInt(folderId) : null;
        if (!fid) throw new Error('Invalid File ID');

        // We need a way to fetch file metadata without being logged in
        // For now, we'll try to get it from the service
        // Note: This might require the service to have a "public" mode or the API to support it
        const list = await telegramService.getFiles(foldId);
        const file = list.find(f => f.id === fid);
        if (!file) throw new Error('File not found or access denied');
        
        setFileData(file);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, folderId]);

  const handleDownload = () => {
    if (!fileData) return;
    const url = telegramService.getStreamingUrl(fileData.id, folderId ? parseInt(folderId) : null, fileData.name);
    const a = document.createElement('a');
    a.href = url + '?download=1';
    a.download = fileData.name;
    a.click();
  };

  const getStreamUrl = () => {
    if (!fileData) return '';
    return telegramService.getStreamingUrl(fileData.id, folderId ? parseInt(folderId) : null, fileData.name);
  };

  if (loading) return <div className="preview-layout"><div className="spinner" /></div>;
  if (error) return <div className="preview-layout"><div className="error-box">{error}</div></div>;

  const isVideo = fileData.name.match(/\.(mp4|webm|ogg|mov)$/i);
  const isImage = fileData.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  const isAudio = fileData.name.match(/\.(mp3|wav|ogg|m4a)$/i);

  return (
    <div className="preview-layout">
      <div className="preview-header">
        <div className="preview-logo">☁️ TeleCloudFS</div>
        <button className="btn btn-primary btn-sm" onClick={handleDownload}>Download</button>
      </div>

      <div className="preview-content">
        <div className="preview-viewer">
          {isImage ? (
            <img src={getStreamUrl()} alt={fileData.name} className="preview-media" />
          ) : isVideo ? (
            <video src={getStreamUrl()} controls className="preview-media" />
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
             }}>Copy Link</button>
          </div>
        </div>
      </div>
    </div>
  );
}
