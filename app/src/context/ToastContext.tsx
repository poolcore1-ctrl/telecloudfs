import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }
interface ToastCtx { toast: (msg: string, type?: Toast['type']) => void; }
const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const icons: Record<Toast['type'], string> = { success: '✓', error: '✕', info: 'ℹ' };
  const colors: Record<Toast['type'], string> = { success: '#5ca87a', error: '#e05555', info: '#6b9fd4' };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`toast toast-${t.type}`}>
              <span style={{ color: colors[t.type], fontWeight: 600, fontSize: 14 }}>{icons[t.type]}</span>
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => { const c = useContext(Ctx); if (!c) throw new Error('no ToastProvider'); return c; };
