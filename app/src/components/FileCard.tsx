import { FileItem } from '../types';
import FileTypeIcon from './FileTypeIcon';
import { formatBytes, formatDate } from '../utils';
import { motion } from 'framer-motion';

interface Props {
  file: FileItem;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function FileCard({ file, selected, onSelect, onOpen, onContextMenu }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`file-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="file-card-icon">
        <FileTypeIcon type={file.icon_type} size={48} />
      </div>
      <div className="file-card-name" title={file.name}>{file.name}</div>
      <div className="file-card-meta">{formatBytes(file.size)}</div>
      <div className="file-card-meta" style={{ fontSize: 10 }}>{formatDate(file.date)}</div>
      {file.raw && (
        <details style={{ position: 'absolute', bottom: 5, right: 5, fontSize: 10, background: 'rgba(0,0,0,0.8)', padding: 5, zIndex: 10, maxWidth: '90%', maxHeight: 150, overflow: 'auto', borderRadius: 4 }} onClick={e => e.stopPropagation()}>
          <summary style={{ cursor: 'pointer', color: '#00f2fe' }}>Raw Data</summary>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(file.raw, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
}
