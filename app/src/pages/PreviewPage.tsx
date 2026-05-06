import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import FileTypeIcon from '../components/FileTypeIcon';

export default function PreviewPage() {
  const { fileId, folderId, shareId, uid } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        let fid = fileId ? parseInt(fileId) : null;
        let foldId = folderId ? parseInt(folderId) : null;
        let name = searchParams.get('n');
        let size = searchParams.get('s');
        let type = searchParams.get('t');
        let ah = searchParams.get('ah');
        let botToken = '';

        // 1. Resolve Path-based link (/p/folder/file)
        if (location.pathname.startsWith('/p/')) {
          const path = decodeURIComponent(location.pathname.replace('/p', ''));
          const res = await fetch(`/api/p${path}`);
          if (!res.ok) throw new Error('File not found at this path');
          const data = await res.json();
          fid = data.message_id; foldId = data.folder_id; name = data.name; size = data.size; type = data.type; ah = data.access_hash;
        }

        // 2. Resolve UID-based link (/f/:uid)
        if (uid) {
          const res = await fetch(`/api/f/${uid}`);
          if (!res.ok) throw new Error('Permanent file ID not found');
          const data = await res.json();
          fid = data.message_id; foldId = data.folder_id; name = data.name; size = data.size; type = data.type; ah = data.access_hash;
        }

        // 3. Resolve Short Link /s/:id
        if (shareId) {
          const res = await fetch(`/api/share/${shareId}`);
          if (!res.ok) throw new Error('Share link expired or invalid');
          const data = await res.json();
          fid = data.message_id || data.messageId; 
          foldId = data.folder_id || data.folderId; 
          name = data.name; 
          size = data.size; 
          type = data.type; 
          ah = data.access_hash || data.accessHash;
          
          if (data.botToken) {
            try {
              // Ensure we have a client to connect with
              const configRes = await fetch('/api/share/init');
              const config = await configRes.json();
              await telegramService.connectWithBot(config.apiId, config.apiHash, data.botToken);
              botToken = data.botToken;
            } catch (e) { console.warn('Bot connect failed:', e); }
          }
        }

        // Fallback for missing bot connection on path/uid links
        if (!telegramService.isConnected() && (uid || location.pathname.startsWith('/p/'))) {
            try {
                const configRes = await fetch('/api/share/init');
                const config = await configRes.json();
                const botsRes = await fetch('/api/bots');
                const bots = await botsRes.json();
                if (bots.length > 0) {
                    await telegramService.connectWithBot(config.apiId, config.apiHash, bots[0].token);
                    botToken = bots[0].token;
                }
            } catch (e) { console.warn('Auto bot connect failed:', e); }
        }

        if (fid && name && size && type) {
          setFileData({ id: fid, name, size: parseInt(size as any), icon_type: type });

          if (searchParams.get('d') === '1' || shareId || uid || location.pathname.startsWith('/p/')) {
            const url = telegramService.getStreamingUrl(fid, foldId, name);
            const urlObj = new URL(url, window.location.origin);
            if (ah) urlObj.searchParams.set('ah', ah);
            if (botToken) urlObj.searchParams.set('bt', botToken);
            window.location.replace(urlObj.pathname + urlObj.search);
            return;
          }
          setLoading(false);
          return;
        }

        throw new Error('Incomplete file information');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, folderId, shareId, uid, location.pathname, searchParams]);

  if (loading) return <div className="pure-preview"><div className="spinner" /></div>;
  if (error) return <div className="pure-preview"><div className="error-box">{error}</div></div>;

  return <div className="pure-preview">Redirecting to file...</div>;
}
