import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import FileTypeIcon from '../components/FileTypeIcon';

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

        const name = searchParams.get('n');
        const size = searchParams.get('s');
        const type = searchParams.get('t');

        const tok = searchParams.get('tok') || searchParams.get('t');
        if (tok) {
          try {
            const { apiId, apiHash } = await telegramService.loadFromVault(tok);
            await telegramService.connect(apiId, apiHash);
          } catch (e) { console.warn('Guest connect failed:', e); }
        }

        if (name && size && type) {
          setFileData({ id: fid, name, size: parseInt(size), icon_type: type });
          setLoading(false);
          return;
        }

        const list = await telegramService.getFiles(foldId);
        const file = list.find(f => f.id === fid);
        if (!file) throw new Error('File not found');
        setFileData(file);
      } catch (e: any) {
        setError(e.message === 'Client not connected' ? 'Please log in or use a valid share link.' : e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, folderId, searchParams]);

  const getStreamUrl = () => {
    if (!fileData) return '';
    const url = telegramService.getStreamingUrl(fileData.id, folderId ? parseInt(folderId) : null, fileData.name);
    const urlObj = new URL(url, window.location.origin);
    
    // Ensure the token from the URL params is attached to the stream URL
    const tok = searchParams.get('tok') || searchParams.get('t');
    if (tok) urlObj.searchParams.set('t', tok);
    
    return urlObj.pathname + urlObj.search;
  };

  if (loading) return <div className="pure-preview"><div className="spinner" /></div>;
  if (error && !fileData) return <div className="pure-preview"><div className="error-box">{error}</div></div>;

  const isVideo = fileData.name.match(/\.(mp4|webm|ogg|mov)$/i);
  const isImage = fileData.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  const isAudio = fileData.name.match(/\.(mp3|wav|ogg|m4a)$/i);
  const isPDF = fileData.name.match(/\.(pdf)$/i);

  return (
    <div className="pure-preview">
      <div className="preview-media-container">
        {isImage ? (
          <img src={getStreamUrl()} alt={fileData.name} className="preview-media-full" />
        ) : isVideo ? (
          <video src={getStreamUrl()} controls className="preview-media-full" autoPlay />
        ) : isAudio ? (
          <audio src={getStreamUrl()} controls />
        ) : isPDF ? (
          <iframe src={getStreamUrl()} title={fileData.name} className="preview-iframe" />
        ) : (
          <div className="preview-generic">
            <FileTypeIcon type={fileData.icon_type} size={120} />
            <div className="preview-filename-large">{fileData.name}</div>
          </div>
        )}
      </div>

      <div className="preview-floating-actions">
        <div className="preview-file-info">
          <FileTypeIcon type={fileData.icon_type} size={16} />
          <span>{fileData.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const url = getStreamUrl();
            const a = document.createElement('a'); a.href = url + '&download=1'; a.download = fileData.name; a.click();
          }}>Download</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied!');
          }}>Copy Link</button>
        </div>
      </div>
    </div>
  );
}
