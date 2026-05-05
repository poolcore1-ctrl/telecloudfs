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
    </motion.div>
  );
}
