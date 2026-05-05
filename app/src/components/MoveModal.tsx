import { Folder } from '../types';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: number | null) => void;
  folders: Folder[];
  selectedCount: number;
  mode: 'move' | 'copy';
}

export default function MoveModal({ isOpen, onClose, onConfirm, folders, selectedCount, mode }: Props) {
  const title = mode === 'copy' ? 'Copy Files' : 'Move Files';
  const actionText = mode === 'copy' ? 'copying' : 'moving';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      message={`Select destination for ${actionText} ${selectedCount} file(s):`}
      showFooter={false}
    >
      <div className="move-list">
        <div className="move-item" onClick={() => { onConfirm(null); onClose(); }}>
          <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 5a1 1 0 011-1h3.5L8 6h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" />
          </svg>
          All Files (Home)
        </div>
        {folders.map(f => (
          <div key={f.id} className="move-item" onClick={() => { onConfirm(f.id); onClose(); }}>
            <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" />
            </svg>
            {f.name}
          </div>
        ))}
      </div>
    </Modal>
  );
}
