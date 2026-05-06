import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import FileTypeIcon from '../components/FileTypeIcon';

export default function PreviewPage() {
  const { fileId, folderId, shareId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);
  const [keys, setKeys] = useState<{ t: string, a: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let fid = fileId ? parseInt(fileId) : null;
        let foldId = folderId ? parseInt(folderId) : null;
        let name = searchParams.get('n');
        let size = searchParams.get('s');
        let type = searchParams.get('t');
        let tok = searchParams.get('tok') || searchParams.get('t');
        let ah = searchParams.get('ah');

        // Handle Short Link /s/:id
        if (shareId) {
          const res = await fetch(`/api/share/${shareId}`);
          if (!res.ok) throw new Error('Share link expired or invalid');
          const data = await res.json();
          fid = data.messageId;
          foldId = data.folderId;
          name = data.name;
          size = data.size;
          type = data.type;
          ah = data.accessHash;
          // For short links, the backend gives us the session secrets if we have the share link
          // But wait, we still need the master password to decrypt the session locally.
          // TO MAKE IT TRULY PUBLIC: We'll use the token from localStorage if logged in,
          // OR we'll ask the user for the password if it's a private share.
          // BUT the user wants "WITHOUT LOGIN".
          // So we'll update DashboardPage to save a 'Guest Token' for short links.
          tok = localStorage.getItem('token') || ''; 
        }

        const p = searchParams.get('p');
        if (p) {
          try {
            const decoded = JSON.parse(atob(p));
            tok = decoded.t;
            ah = decoded.a;
          } catch (e) { console.error('Payload decode failed'); }
        }

        if (fid && name && size && type) {
          setFileData({ id: fid, name, size: parseInt(size as any), icon_type: type });
          setKeys({ t: tok || '', a: ah || '' });

          if (tok) {
            try {
              const { apiId, apiHash } = await telegramService.loadFromVault(tok);
              await telegramService.connect(apiId, apiHash);
            } catch (e) { console.warn('Connect failed:', e); }
          }

          if (searchParams.get('d') === '1' || shareId) {
            const url = telegramService.getStreamingUrl(fid, foldId, name);
            const urlObj = new URL(url, window.location.origin);
            if (tok) urlObj.searchParams.set('t', tok);
            if (ah) urlObj.searchParams.set('ah', ah);
            window.location.replace(urlObj.pathname + urlObj.search);
            return;
          }
          setLoading(false);
          return;
        }

        throw new Error('Incomplete share information');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, folderId, shareId, searchParams]);

  if (loading) return <div className="pure-preview"><div className="spinner" /></div>;
  if (error) return <div className="pure-preview"><div className="error-box">{error}</div></div>;

  return <div className="pure-preview">Redirecting to file...</div>;
}
