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
      {file.raw && (
        <details style={{ position: 'absolute', right: 50, fontSize: 10, background: 'rgba(0,0,0,0.8)', padding: 5, zIndex: 10, maxWidth: 400, maxHeight: 150, overflow: 'auto', borderRadius: 4 }} onClick={e => e.stopPropagation()}>
          <summary style={{ cursor: 'pointer', color: '#00f2fe' }}>Raw Data</summary>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(file.raw, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
