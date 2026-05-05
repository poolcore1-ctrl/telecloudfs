import { createContext, useContext, useState, ReactNode } from 'react';

interface AppCtx { isAuthenticated: boolean | null; setAuthenticated: (v: boolean) => void; }
const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState<boolean | null>(null);
  return <Ctx.Provider value={{ isAuthenticated, setAuthenticated }}>{children}</Ctx.Provider>;
}
export const useApp = () => { const c = useContext(Ctx); if (!c) throw new Error('no AppProvider'); return c; };
