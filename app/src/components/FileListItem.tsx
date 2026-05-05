import { FileItem } from '../types';
import FileTypeIcon from './FileTypeIcon';
import { formatBytes, formatDate } from '../utils';
import { motion } from 'framer-motion';

interface Props {
  file: FileItem;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onDownload: () => void;
}

export default function FileListItem({ file, selected, onSelect, onOpen, onContextMenu, onDelete, onDownload }: Props) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={`file-list-item ${selected ? 'selected' : ''}`}
      onClick={onSelect} onDoubleClick={onOpen} onContextMenu={onContextMenu}>
      <div className="fli-icon"><FileTypeIcon type={file.icon_type} size={32} /></div>
      <div className="fli-name" title={file.name}>{file.name}</div>
      <div className="fli-meta">{formatBytes(file.size)}</div>
      <div className="fli-meta">{formatDate(file.date)}</div>
      <div className="fli-actions">
        <button className="btn-icon" title="Download" onClick={e => { e.stopPropagation(); onDownload(); }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
          </svg>
        </button>
        <button className="btn-icon" title="Delete" onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ color: 'var(--danger)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
