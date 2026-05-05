import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { telegramService } from '../services/TelegramClient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

type Step = 'welcome' | 'creds' | 'phone' | 'code' | 'twofa' | 'master' | 'restore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useApp();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phone, setPhone] = useState('');
  const [codeHash, setCodeHash] = useState('');
  const [code, setCode] = useState('');
  const [pass2fa, setPass2fa] = useState('');
  const [master, setMaster] = useState('');
  const [masterConfirm, setMasterConfirm] = useState('');

  const err = (msg: string) => { setError(msg); setLoading(false); };
  const go = async (fn: () => Promise<void>) => { setError(''); setLoading(true); try { await fn(); } catch (e: any) { err(e.message || 'Something went wrong'); } };

  const stepOrder: Step[] = ['creds', 'phone', 'code', 'master'];
  const stepIndex = stepOrder.indexOf(step);

  async function handleConnect() {
    go(async () => {
      if (!apiId || !apiHash) throw new Error('Please enter API ID and API Hash');
      await telegramService.connect(parseInt(apiId), apiHash);
      setLoading(false); setStep('phone');
    });
  }

  async function handlePhone() {
    go(async () => {
      if (!phone) throw new Error('Please enter your phone number');
      const result = await telegramService.sendCode(phone);
      setCodeHash(result.phoneCodeHash);
      setLoading(false); setStep('code');
    });
  }

  async function handleCode() {
    go(async () => {
      if (!code) throw new Error('Please enter the verification code');
      try {
        await telegramService.signIn(phone, codeHash, code);
        setLoading(false); setStep('master');
      } catch (e: any) {
        if (e.message?.includes('SESSION_PASSWORD_NEEDED') || e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          setLoading(false); setStep('twofa');
        } else throw e;
      }
    });
  }

  async function handle2FA() {
    go(async () => {
      if (!pass2fa) throw new Error('Please enter your 2FA password');
      await telegramService.signInWithPassword(pass2fa);
      setLoading(false); setStep('master');
    });
  }

  async function handleSetMaster() {
    go(async () => {
      if (!master) throw new Error('Please create a master password');
      if (master !== masterConfirm) throw new Error('Passwords do not match');
      if (master.length < 6) throw new Error('Password must be at least 6 characters');
      const client = telegramService.getClient();
      if (!client) throw new Error('Not connected');
      await telegramService.saveToVault(master, client.apiId, client.apiHash);
      setAuthenticated(true);
      navigate('/dashboard');
    });
  }

  async function handleRestore() {
    go(async () => {
      if (!master) throw new Error('Please enter your master password');
      const { apiId: id, apiHash: hash } = await telegramService.loadFromVault(master);
      await telegramService.connect(id, hash);
      const ok = await telegramService.checkAuthorization();
      if (!ok) throw new Error('Session expired. Please set up again.');
      setAuthenticated(true);
      navigate('/dashboard');
    });
  }

  const slide = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  return (
    <div className="login-shell">
      <motion.div className="login-card" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="login-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M6 22L12 10l4 8 3-4 7 8H6z" fill="white" fillOpacity=".9"/>
          </svg>
        </div>

        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div key="welcome" {...slide}>
              <div className="login-title">TeleCloudFS</div>
              <div className="login-sub">Secure cloud storage powered by your Telegram account.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-primary btn-full" onClick={() => setStep('creds')}>
                  New Setup
                </button>
                <button className="btn btn-ghost btn-full" onClick={() => setStep('restore')}>
                  Restore Session
                </button>
              </div>
            </motion.div>
          )}

          {step === 'creds' && (
            <motion.div key="creds" {...slide}>
              <div className="step-dots">
                {stepOrder.map((s, i) => <div key={s} className={`step-dot ${i === 0 ? 'active' : ''}`} />)}
              </div>
              <div className="login-title">API Credentials</div>
              <div className="login-sub">Get these from <a href="https://my.telegram.org" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>my.telegram.org</a> → App configuration.</div>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label className="label">API ID</label>
                <input type="number" placeholder="12345678" value={apiId} onChange={e => setApiId(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">API Hash</label>
                <input type="text" placeholder="0123456789abcdef..." value={apiHash} onChange={e => setApiHash(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setStep('welcome')}>Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConnect} disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Continue'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div key="phone" {...slide}>
              <div className="step-dots">{stepOrder.map((s, i) => <div key={s} className={`step-dot ${i < 1 ? 'done' : i === 1 ? 'active' : ''}`} />)}</div>
              <div className="login-title">Phone Number</div>
              <div className="login-sub">Enter your Telegram phone number with country code.</div>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label className="label">Phone</label>
                <input type="tel" placeholder="+1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePhone()} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setStep('creds')}>Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePhone} disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Send Code'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div key="code" {...slide}>
              <div className="step-dots">{stepOrder.map((s, i) => <div key={s} className={`step-dot ${i < 2 ? 'done' : i === 2 ? 'active' : ''}`} />)}</div>
              <div className="login-title">Verification Code</div>
              <div className="login-sub">Check your Telegram app for the login code.</div>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label className="label">Code</label>
                <input type="text" placeholder="12345" value={code} onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCode()} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setStep('phone')}>Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCode} disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Verify'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'twofa' && (
            <motion.div key="twofa" {...slide}>
              <div className="login-title">Two-Factor Auth</div>
              <div className="login-sub">Your account has 2FA enabled. Enter your cloud password.</div>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label className="label">Cloud Password</label>
                <input type="password" placeholder="••••••••" value={pass2fa} onChange={e => setPass2fa(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle2FA()} autoFocus />
              </div>
              <button className="btn btn-primary btn-full" onClick={handle2FA} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Authenticate'}
              </button>
            </motion.div>
          )}

          {step === 'master' && (
            <motion.div key="master" {...slide}>
              <div className="step-dots">{stepOrder.map((s, i) => <div key={s} className={`step-dot ${i < 3 ? 'done' : 'active'}`} />)}</div>
              <div className="login-title">Create Master Password</div>
              <div className="login-sub">This encrypts your session on our servers. You'll need it every time you log in.</div>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label className="label">Master Password</label>
                <input type="password" placeholder="••••••••" value={master} onChange={e => setMaster(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Confirm Password</label>
                <input type="password" placeholder="••••••••" value={masterConfirm} onChange={e => setMasterConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSetMaster()} />
              </div>
              <button className="btn btn-primary btn-full" onClick={handleSetMaster} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Complete Setup'}
              </button>
            </motion.div>
          )}

          {step === 'restore' && (
            <motion.div key="restore" {...slide}>
              <div className="login-title">Restore Session</div>
              <div className="login-sub">Enter your master password to decrypt your saved session.</div>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label className="label">Master Password</label>
                <input type="password" placeholder="••••••••" value={master} onChange={e => setMaster(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRestore()} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => { setStep('welcome'); setMaster(''); setError(''); }}>Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRestore} disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Unlock'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
