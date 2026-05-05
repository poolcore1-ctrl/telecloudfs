import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiKey } from '../types';
import { telegramService } from '../services/TelegramClient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useApp();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) setKeys(await res.json());
    } catch { toast('Failed to load API keys', 'error'); }
    finally { setKeysLoading(false); }
  }, [toast]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newKeyName.trim() }) });
      if (!res.ok) throw new Error('Failed to create key');
      const key = await res.json();
      setNewKey(key); setNewKeyName(''); loadKeys();
      toast('API key created', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setCreatingKey(false); }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      const res = await fetch('/api/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('Failed to delete key');
      setKeys(prev => prev.filter(k => k.id !== id));
      toast('Key deleted', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const logout = async () => {
    if (!confirm('Log out? You will need your master password to log back in.')) return;
    await telegramService.logout();
    setAuthenticated(false);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {/* Minimal sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path d="M4 24L10 8l5 10 4-5 9 11H4z" fill="white" fillOpacity=".9" />
            </svg>
          </div>
          <span className="sidebar-brand">TeleCloudFS</span>
        </div>
        <div className="sidebar-items">
          <div className="sidebar-item" onClick={() => navigate('/dashboard')}>
            <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5a1 1 0 011-1h3.5L8 6h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" />
            </svg>
            Dashboard
          </div>
          <div className="sidebar-item active">
            <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="3"/><path d="M14 8a6 6 0 01-6 6 6 6 0 01-6-6 6 6 0 016-6 6 6 0 016 6z"/>
            </svg>
            Settings
          </div>
        </div>
      </div>

      <div className="main-panel" style={{ overflowY: 'auto' }}>
        <div className="settings-wrap">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 24 }}>Settings</h1>

          {/* API Keys */}
          <div className="settings-section">
            <div className="settings-section-head">API Keys</div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
                API keys allow programmatic access to your files via the S3-compatible API.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Key name (e.g. My App)" value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createKey()}
                  style={{ flex: 1, height: 36 }} />
                <button className="btn btn-primary btn-sm" onClick={createKey} disabled={creatingKey || !newKeyName.trim()}>
                  {creatingKey ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Create'}
                </button>
              </div>
              {newKey && (
                <div style={{ marginTop: 12, background: 'var(--success-dim)', border: '1px solid rgba(92,168,122,0.25)', borderRadius: 'var(--r-sm)', padding: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 6 }}>✓ Key created — copy it now, it won't be shown again:</div>
                  <code style={{ fontSize: 12, color: 'var(--text-1)', wordBreak: 'break-all' }}>{newKey.key_secret}</code>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }}
                    onClick={() => { navigator.clipboard.writeText(newKey.key_secret || ''); toast('Copied!', 'success'); }}>
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>

            {keysLoading ? (
              <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
            ) : keys.length === 0 ? (
              <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-3)' }}>No API keys yet.</div>
            ) : keys.map(k => (
              <div key={k.id} className="key-row">
                <div>
                  <div className="key-name">{k.name}</div>
                  <div className="key-secret">{k.id}</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => deleteKey(k.id)}>Delete</button>
              </div>
            ))}
          </div>

          {/* S3 API info */}
          <div className="settings-section">
            <div className="settings-section-head">S3-Compatible API</div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Endpoint</div>
                <code style={{ fontSize: 12, color: 'var(--text-2)' }}>{window.location.origin}/api/s3</code>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Usage</div>
                <div className="settings-row-sub">GET /api/s3/{'{folderId}'}/{'{messageId}'}?apiKey=your-key</div>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="settings-section">
            <div className="settings-section-head">Account</div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Session</div>
                <div className="settings-row-sub">Encrypted and stored in Cloudflare D1</div>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="settings-row">
              <div className="settings-row-label">Log Out</div>
              <button className="btn btn-danger btn-sm" onClick={logout}>Log Out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
