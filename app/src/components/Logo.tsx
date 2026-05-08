import { LayoutGrid } from 'lucide-react';

export default function Logo({ size = 20, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`app-logo ${className}`} style={{ 
      background: 'var(--accent)', 
      borderRadius: '8px', 
      padding: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'fit-content'
    }}>
      <LayoutGrid size={size} color="black" />
    </div>
  );
}
