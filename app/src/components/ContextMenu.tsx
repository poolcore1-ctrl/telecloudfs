import { useEffect, useRef } from 'react';

interface Item { label: string; icon?: string; danger?: boolean; divider?: boolean; onClick?: () => void; }
interface Props { x: number; y: number; items: Item[]; onClose: () => void; }

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  // Clamp to viewport
  const style: React.CSSProperties = { top: Math.min(y, window.innerHeight - 220), left: Math.min(x, window.innerWidth - 200) };

  return (
    <div ref={ref} className="ctx-menu" style={style}>
      {items.map((item, i) => item.divider ? (
        <div key={i} className="ctx-divider" />
      ) : (
        <div key={i} className={`ctx-item${item.danger ? ' danger' : ''}`} onClick={() => { item.onClick?.(); onClose(); }}>
          {item.icon && <span style={{ fontSize: 14 }}>{item.icon}</span>}
          {item.label}
        </div>
      ))}
    </div>
  );
}
