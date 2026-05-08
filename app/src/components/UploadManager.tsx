import { useUpload } from '../context/UploadContext';
import { X, CheckCircle, AlertCircle, Trash2, Ban } from 'lucide-react';

export default function UploadManager() {
  const { uploads, cancelUpload, clearFinished, cancelAll } = useUpload();

  if (uploads.length === 0) return null;

  const uploadingCount = uploads.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const finishedCount = uploads.filter(u => u.status === 'completed' || u.status === 'error' || u.status === 'cancelled').length;

  return (
    <div className="upload-manager">
      <div className="upload-header">
        <div className="upload-stats">
          <span>{uploadingCount} Uploading</span>
          {finishedCount > 0 && <span className="text-dim"> • {finishedCount} Finished</span>}
        </div>
        <div className="upload-actions">
          {uploadingCount > 0 && (
            <button onClick={cancelAll} className="btn-icon" title="Cancel All">
              <Ban size={16} />
            </button>
          )}
          {finishedCount > 0 && (
            <button onClick={clearFinished} className="btn-icon" title="Clear Finished">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className="upload-list">
        {uploads.map(upload => (
          <div key={upload.id} className={`upload-item ${upload.status}`}>
            <div className="upload-info">
              <span className="upload-name">{upload.fileName}</span>
              <span className="upload-size">{(upload.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div 
                  className="upload-progress-fill" 
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <div className="upload-status-row">
                <span className="upload-percent">{Math.round(upload.progress)}%</span>
                <div className="upload-controls">
                  {upload.status === 'uploading' || upload.status === 'pending' ? (
                    <button onClick={() => cancelUpload(upload.id)} className="btn-cancel">
                      <X size={14} />
                    </button>
                  ) : upload.status === 'completed' ? (
                    <CheckCircle size={14} className="text-success" />
                  ) : (
                    <AlertCircle size={14} className="text-danger" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
