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
  const [keys, setKeys] = useState<{ t: string, a: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const fid = fileId ? parseInt(fileId) : null;
        const foldId = folderId ? parseInt(folderId) : null;
        if (!fid) throw new Error('Invalid File ID');

        // Decode obfuscated keys
        const p = searchParams.get('p');
        let decodedKeys = null;
        if (p) {
          try {
            decodedKeys = JSON.parse(atob(p));
            setKeys(decodedKeys);
          } catch (e) { console.error('Failed to decode keys'); }
        }

        const name = searchParams.get('n');
        const size = searchParams.get('s');
        const type = searchParams.get('t');

        if (name && size && type) {
          setFileData({ id: fid, name, size: parseInt(size), icon_type: type });
          
          if (decodedKeys?.t) {
            try {
              const { apiId, apiHash } = await telegramService.loadFromVault(decodedKeys.t);
              await telegramService.connect(apiId, apiHash);
            } catch (e) { console.warn('Guest connect failed:', e); }
          }

          // Handle Direct View redirect
          if (searchParams.get('d') === '1') {
            const file = { id: fid, name, size: parseInt(size), icon_type: type };
            const url = telegramService.getStreamingUrl(file.id, foldId, file.name);
            const urlObj = new URL(url, window.location.origin);
            if (decodedKeys?.t) urlObj.searchParams.set('t', decodedKeys.t);
            if (decodedKeys?.a) urlObj.searchParams.set('ah', decodedKeys.a);
            window.location.replace(urlObj.pathname + urlObj.search);
            return;
          }

          setLoading(false);
          return;
        }

        const list = await telegramService.getFiles(foldId);
        const file = list.find(f => f.id === fid);
        if (!file) throw new Error('File not found');
        setFileData(file);
      } catch (e: any) {
        setError(e.message === 'Client not connected' ? 'Invalid or expired share link.' : e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, folderId, searchParams]);

  const getStreamUrl = () => {
    if (!fileData) return '';
    const url = telegramService.getStreamingUrl(fileData.id, folderId ? parseInt(folderId) : null, fileData.name);
    const urlObj = new URL(url, window.location.origin);
    
    if (keys?.t) urlObj.searchParams.set('t', keys.t);
    if (keys?.a) urlObj.searchParams.set('ah', keys.a);
    
    return urlObj.pathname + urlObj.search;
  };

  if (loading) return <div className="pure-preview"><div className="spinner" /></div>;
  if (error && !fileData) return <div className="pure-preview"><div className="error-box">{error}</div></div>;

  const ext = fileData.name.split('.').pop()?.toLowerCase() || '';
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
  const isPDF = ext === 'pdf';
  const isCSV = ext === 'csv';
  const isDoc = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
  const isText = ['txt', 'md', 'js', 'ts', 'tsx', 'css', 'json', 'html', 'py', 'go', 'rs', 'php', 'c', 'cpp'].includes(ext);

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
          <div className="pdf-container">
            <iframe src={getStreamUrl() + '#toolbar=0'} title={fileData.name} className="preview-iframe" />
          </div>
        ) : isCSV || isText ? (
          <div className="text-viewer-container">
            <div className="text-viewer-header">
              <span>{isCSV ? 'Spreadsheet Preview' : 'Document Preview'}</span>
            </div>
            <iframe src={getStreamUrl()} title={fileData.name} className="preview-iframe text-viewer" />
          </div>
        ) : isDoc ? (
          <div className="preview-generic">
            <div className="doc-preview-card">
              <FileTypeIcon type="file" size={80} />
              <div className="preview-filename-large">{fileData.name}</div>
              <p className="doc-hint">Office documents require server-side conversion for browser rendering. Download to view with full formatting.</p>
              <button className="btn btn-primary btn-lg" onClick={() => {
                const a = document.createElement('a'); a.href = getStreamUrl() + '&download=1'; a.download = fileData.name; a.click();
              }}>Download & Open</button>
            </div>
          </div>
        ) : (
          <div className="preview-generic">
            <FileTypeIcon type={fileData.icon_type} size={120} />
            <div className="preview-filename-large">{fileData.name}</div>
            <button className="btn btn-ghost" onClick={() => {
              const a = document.createElement('a'); a.href = getStreamUrl() + '&download=1'; a.download = fileData.name; a.click();
            }}>Download File</button>
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
