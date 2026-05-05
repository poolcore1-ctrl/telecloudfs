import { FileItem } from '../types';
import FileTypeIcon from './FileTypeIcon';
import { formatBytes, formatDate } from '../utils';

interface Props {
  file: FileItem;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function FileListItem({ file, selected, onSelect, onOpen, onContextMenu }: Props) {
  return (
    <div 
      className={`file-list-item ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="fli-icon">
        <FileTypeIcon type={file.icon_type} size={24} />
      </div>
      <div className="fli-name" title={file.name}>{file.name}</div>
      <div className="fli-meta">{formatBytes(file.size)}</div>
      <div className="fli-meta">{formatDate(file.date)}</div>
    </div>
  );
}
