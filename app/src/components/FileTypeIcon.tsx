export default function FileTypeIcon({ type, size = 36 }: { type: string; size?: number }) {
  const configs: Record<string, { bg: string; color: string; path: string }> = {
    image: { bg: 'rgba(92,168,122,0.15)', color: '#5ca87a', path: 'M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 0v10h10V5H5zm1 7l2-3 2 2.5L12 8l3 4H6z' },
    video: { bg: 'rgba(107,159,212,0.15)', color: '#6b9fd4', path: 'M4 4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2H4zm6 6l4-3v6l-4-3zm-6 0V6h8v8H4V10z' },
    audio: { bg: 'rgba(200,169,122,0.15)', color: '#c8a97a', path: 'M9 3a1 1 0 00-1 1v8a3 3 0 103 3V7h3a1 1 0 000-2H10V4a1 1 0 00-1-1z' },
    file: { bg: 'rgba(158,152,146,0.15)', color: '#9e9892', path: 'M4 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0013.414 6L10 2.586A2 2 0 008.586 2H4zm4 0v4h4M6 10h4m-4 3h4' },
  };
  const cfg = configs[type] || configs.file;
  return (
    <div style={{ width: size, height: size, background: cfg.bg, borderRadius: size * 0.25, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="none" stroke={cfg.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={cfg.path} />
      </svg>
    </div>
  );
}
