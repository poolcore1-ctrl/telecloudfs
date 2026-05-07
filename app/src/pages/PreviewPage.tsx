import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import { formatBytes } from '../utils';

// ─── Type Helpers ─────────────────────────────────────────────────────────────

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'download';

function getPreviewKind(mimeType: string, name: string): PreviewKind {
  const m = mimeType.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext)) return 'video';
  if (m.startsWith('audio/') || ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  return 'download';
}

// ─── File Icon for Download Page ─────────────────────────────────────────────

function FileIcon({ kind }: { kind: PreviewKind }) {
  const icons: Record<PreviewKind, string> = {
    image: '🖼️', video: '🎬', audio: '🎵', pdf: '📄', download: '📦'
  };
  return <span style={{ fontSize: 72 }}>{icons[kind]}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PreviewPage() {
  const { fileId, folderId, shareId, uid } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; size: number; mimeType: string; kind: PreviewKind } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let fid = fileId ? parseInt(fileId) : null;
        let foldId = folderId ? parseInt(folderId) : null;
        let name = '';
        let size = '0';
        let ah = '';
        let mimeType = 'application/octet-stream';
        let botToken = '';

        // ── 1. Resolve /api/file/:folderId/:fileId (Primary Clean Path) ──
        if (fid && foldId !== null) {
          const res = await fetch(`/api/file/${foldId}/${fid}`);
          if (!res.ok) throw new Error('File not found or not indexed');
          const data = await res.json();
          name = data.name;
          size = String(data.size);
          ah = data.access_hash;
          mimeType = data.mime_type || mimeType;
        }
        // ── 2. Resolve /p/ virtual path ──
        else if (location.pathname.startsWith('/p/')) {
          const path = decodeURIComponent(location.pathname.replace('/p', ''));
          const res = await fetch(`/api/p${path}`);
          if (!res.ok) throw new Error('File not found at this path');
          const data = await res.json();
          fid = data.message_id; foldId = data.folder_id; name = data.name;
          size = String(data.size); ah = data.access_hash; mimeType = data.mime_type || mimeType;
        }
        // ── 3. Resolve /f/:uid permanent ID ──
        else if (uid) {
          const res = await fetch(`/api/f/${uid}`);
          if (!res.ok) throw new Error('Permanent file ID not found');
          const data = await res.json();
          fid = data.message_id; foldId = data.folder_id; name = data.name;
          size = String(data.size); ah = data.access_hash; mimeType = data.mime_type || mimeType;
        }
        // ── 4. Resolve /s/:shareId short link ──
        else if (shareId) {
          const res = await fetch(`/api/share/${shareId}`);
          if (!res.ok) throw new Error('Share link expired or invalid');
          const data = await res.json();
          fid = data.message_id || data.messageId;
          foldId = data.folder_id || data.folderId;
          name = data.name; size = String(data.size);
          ah = data.access_hash || data.accessHash; mimeType = data.mime_type || mimeType;

          if (data.botToken) {
            try {
              const cfg = await (await fetch('/api/share/init')).json();
              await telegramService.connectWithBot(cfg.apiId, cfg.apiHash, data.botToken);
              botToken = data.botToken;
            } catch (e) { console.warn('Bot connect failed:', e); }
          }
        }

        // ── Auto-connect bot for guest sessions ──
        if (!telegramService.isConnected() && (uid || location.pathname.startsWith('/p/'))) {
          try {
            const cfg = await (await fetch('/api/share/init')).json();
            const bots = await (await fetch('/api/bots')).json();
            if (bots.length > 0) {
              await telegramService.connectWithBot(cfg.apiId, cfg.apiHash, bots[0].token);
              botToken = bots[0].token;
            }
          } catch (e) { console.warn('Auto bot connect failed:', e); }
        }

        if (!fid || !name) throw new Error('Incomplete file information');

        // ── Register access hash in memory cache so SW can find it without it being in the URL ──
        if (ah && ah !== '0') {
          telegramService.registerAccessHash(foldId, fid, ah);
        }

        // ── Build streaming URL (Clean — no secrets in query params) ──
        const rawUrl = telegramService.getStreamingUrl(fid, foldId, name);
        const urlObj = new URL(rawUrl, window.location.origin);
        if (botToken) urlObj.searchParams.set('bt', botToken);
        const finalStreamUrl = urlObj.pathname + urlObj.search;

        // ── Determine preview kind from mime or name ──
        const kind = getPreviewKind(mimeType, name);

        setStreamUrl(finalStreamUrl);
        setMeta({ name, size: parseInt(size || '0'), mimeType, kind });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, folderId, shareId, uid, location.pathname, searchParams]);

  // ── Loading ──
  if (loading) return (
    <div className="pure-preview">
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <p style={{ marginTop: 16, color: '#888', fontSize: 14 }}>Loading file...</p>
    </div>
  );

  // ── Error ──
  if (error || !meta || !streamUrl) return (
    <div className="pure-preview">
      <span style={{ fontSize: 56 }}>⚠️</span>
      <h2 style={{ marginTop: 16, color: '#ff6b6b' }}>Preview Failed</h2>
      <p style={{ color: '#888', fontSize: 14, maxWidth: 400, textAlign: 'center' }}>{error || 'Unknown error'}</p>
    </div>
  );

  const { name, size, kind } = meta;
  const downloadUrl = streamUrl.includes('?')
    ? streamUrl + '&download=1'
    : streamUrl + '?download=1';

  return (
    <div className="pure-preview" style={{ flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Top Bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={() => window.history.back()} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14
        }}>← Back</button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{formatBytes(size)}</div>
        </div>
        <a href={downloadUrl} download={name} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 14,
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6
        }}>⬇ Download</a>
      </div>

      {/* ── Preview Area ── */}
      <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64 }}>

        {/* IMAGE */}
        {kind === 'image' && (
          <img
            src={streamUrl}
            alt={name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
          />
        )}

        {/* VIDEO */}
        {kind === 'video' && (
          <video
            controls
            autoPlay
            playsInline
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
          >
            <source src={streamUrl} type={meta.mimeType} />
            Your browser does not support video playback.
          </video>
        )}

        {/* AUDIO */}
        {kind === 'audio' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 40 }}>
            <div style={{
              width: 160, height: 160, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72,
              boxShadow: '0 0 60px rgba(102,126,234,0.5)'
            }}>🎵</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{name}</div>
              <div style={{ color: '#888', fontSize: 13 }}>{formatBytes(size)}</div>
            </div>
            <audio controls autoPlay style={{ width: '100%', maxWidth: 480, marginTop: 8 }}>
              <source src={streamUrl} type={meta.mimeType} />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* PDF */}
        {kind === 'pdf' && (
          <iframe
            src={streamUrl}
            title={name}
            style={{ width: '100%', height: '100%', border: 'none', marginTop: 0 }}
          />
        )}

        {/* DOWNLOAD-ONLY */}
        {kind === 'download' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 40, textAlign: 'center' }}>
            <FileIcon kind={kind} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>{name}</div>
              <div style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>{formatBytes(size)} · {meta.mimeType}</div>
              <a href={downloadUrl} download={name} style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff', borderRadius: 10, padding: '12px 32px',
                fontSize: 16, fontWeight: 600, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(102,126,234,0.4)'
              }}>⬇ Download File</a>
            </div>
            <p style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
              This file type cannot be previewed in the browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
