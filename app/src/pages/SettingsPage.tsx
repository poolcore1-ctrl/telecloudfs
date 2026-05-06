import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiKey } from '../types';
import { telegramService } from '../services/TelegramClient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Bot {
  id: string;
  name: string;
  token: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useApp();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);

  const [bots, setBots] = useState<Bot[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [newBotName, setNewBotName] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [creatingBot, setCreatingBot] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) setKeys(await res.json());
    } catch { toast('Failed to load API keys', 'error'); }
    finally { setKeysLoading(false); }
  }, [toast]);

  const loadBots = useCallback(async () => {
    setBotsLoading(true);
    try {
      const res = await fetch('/api/bots');
      if (res.ok) setBots(await res.json());
    } catch { toast('Failed to load bots', 'error'); }
    finally { setBotsLoading(false); }
  }, [toast]);

  useEffect(() => { loadKeys(); loadBots(); }, [loadKeys, loadBots]);

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

  const syncBots = async () => {
    setSyncing(true);
    try {
      await telegramService.syncBotsWithFolders();
      toast('Bots synced with all folders', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSyncing(false); }
  };

  const createBot = async () => {
    if (!newBotToken.trim()) return;
    setCreatingBot(true);
    try {
      const res = await fetch('/api/bots', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name: newBotName.trim() || 'TeleCloud Bot', token: newBotToken.trim() }) 
      });
      if (!res.ok) throw new Error('Failed to add bot');
      setNewBotName(''); setNewBotToken(''); 
      await loadBots();
      toast('Bot added! Starting background sync...', 'success');
      // Trigger retroactive sync
      syncBots();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setCreatingBot(false); }
  };

  const deleteBot = async (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;
    if (!confirm(`Remove "${bot.name}"? It will also be removed as an administrator from all folders.`)) return;
    
    try {
      toast(`Revoking bot "${bot.name}"...`, 'info');
      // First revoke from Telegram
      await telegramService.revokeBotFromFolders(bot.token);
      
      // Then delete from database
      const res = await fetch('/api/bots', { 
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id }) 
      });
      if (!res.ok) throw new Error('Failed to delete bot from database');
      
      setBots(prev => prev.filter(b => b.id !== id));
      toast('Bot removed and revoked successfully', 'success');
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
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
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

      <div className="main-panel" style={{ overflowY: 'auto', background: 'var(--bg-1)' }}>
        <div className="settings-container" style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8, letterSpacing: '-0.02em' }}>Settings</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 15 }}>Configure your project, manage bots, and API access.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* Bot Management Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card"
            >
              <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 className="card-title">Public Preview Bots</h2>
                    <p className="card-desc">Bots in this pool will be automatically added as admins to all your folders.</p>
                  </div>
                  <button className={`btn ${syncing ? 'btn-ghost' : 'btn-primary'} btn-sm`} onClick={syncBots} disabled={syncing || bots.length === 0}>
                    {syncing ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} /> Syncing...</> : 'Sync All Folders'}
                  </button>
                </div>
              </div>

              <div className="card-body">
                <div className="bot-add-form" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, marginBottom: 24, padding: 16, background: 'var(--bg-2)', borderRadius: 12 }}>
                  <input type="text" placeholder="Bot Nickname" value={newBotName}
                    onChange={e => setNewBotName(e.target.value)}
                    className="premium-input" />
                  <input type="text" placeholder="Telegram Bot Token" value={newBotToken}
                    onChange={e => setNewBotToken(e.target.value)}
                    className="premium-input" />
                  <button className="btn btn-primary" onClick={createBot} disabled={creatingBot || !newBotToken.trim()} style={{ height: 42 }}>
                    {creatingBot ? <span className="spinner" /> : 'Add Bot'}
                  </button>
                </div>

                <div className="bot-list">
                  {botsLoading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
                  ) : bots.length === 0 ? (
                    <div className="empty-state">No bots configured yet. Add one above to enable public sharing.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                      {bots.map(bot => (
                        <motion.div key={bot.id} layout className="bot-card">
                          <div className="bot-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </div>
                          <div className="bot-info">
                            <div className="bot-name">{bot.name}</div>
                            <div className="bot-token-preview">{bot.token.split(':')[0]}...</div>
                          </div>
                          <button className="bot-delete" onClick={() => deleteBot(bot.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* API Keys Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="premium-card"
            >
              <div className="card-header">
                <h2 className="card-title">S3 API Keys</h2>
                <p className="card-desc">Programmatic access to your files via S3-compatible endpoints.</p>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <input type="text" placeholder="New Key Name" value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createKey()}
                    className="premium-input" style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={createKey} disabled={creatingKey || !newKeyName.trim()}>
                    {creatingKey ? <span className="spinner" /> : 'Create Key'}
                  </button>
                </div>

                <AnimatePresence>
                  {newKey && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="new-key-alert"
                    >
                      <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>✓ Key Generated Successfully</div>
                      <div className="key-display">
                        <code>{newKey.key_secret}</code>
                        <button onClick={() => { navigator.clipboard.writeText(newKey.key_secret || ''); toast('Copied!', 'success'); }}>Copy</button>
                      </div>
                      <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>This key will never be shown again. Store it securely.</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="key-list">
                  {keysLoading ? (
                    <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" /></div>
                  ) : keys.length === 0 ? (
                    <div className="empty-state">No active API keys.</div>
                  ) : (
                    keys.map(k => (
                      <div key={k.id} className="key-row-premium">
                        <div className="key-main">
                          <div className="key-label">{k.name}</div>
                          <div className="key-id">{k.id}</div>
                        </div>
                        <button className="btn-danger-text" onClick={() => deleteKey(k.id)}>Revoke</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>

            {/* Account Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="premium-card"
              style={{ border: '1px solid rgba(255, 69, 58, 0.2)' }}
            >
              <div className="card-header" style={{ borderBottom: '1px solid rgba(255, 69, 58, 0.1)' }}>
                <h2 className="card-title" style={{ color: '#ff453a' }}>Danger Zone</h2>
                <p className="card-desc">Irreversible account actions and session management.</p>
              </div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>Logout from Session</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>You will need your master password to re-authorize this device.</div>
                </div>
                <button className="btn btn-danger" onClick={logout}>Sign Out</button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
