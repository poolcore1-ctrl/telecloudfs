import React, { createContext, useContext, useState, useCallback } from 'react';
import { telegramService } from '../services/TelegramClient';

export interface UploadTask {
  id: string;
  fileName: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  folderId: number | null;
  error?: string;
}

interface UploadContextType {
  uploads: UploadTask[];
  uploadFiles: (files: FileList | File[], folderId: number | null, onComplete?: () => void) => void;
  cancelUpload: (id: string) => void;
  clearFinished: () => void;
  cancelAll: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadTask[]>([]);

  const uploadFiles = useCallback(async (files: FileList | File[], folderId: number | null, onComplete?: () => void) => {
    const newTasks: UploadTask[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      size: file.size,
      progress: 0,
      status: 'pending',
      folderId
    }));

    setUploads(prev => [...prev, ...newTasks]);

    // Start uploads sequentially or in parallel? Parallel for now.
    newTasks.forEach(async (task, index) => {
      const file = Array.from(files)[index];
      
      try {
        setUploads(prev => prev.map(t => t.id === task.id ? { ...t, status: 'uploading' } : t));
        
        await telegramService.uploadFile(file, folderId, (p) => {
          setUploads(prev => prev.map(t => {
             if (t.id === task.id) {
               if (t.status === 'cancelled') return t;
               return { ...t, progress: p * 100 };
             }
             return t;
          }));
        });

        setUploads(prev => prev.map(t => {
          if (t.id === task.id && t.status !== 'cancelled') {
            return { ...t, status: 'completed', progress: 100 };
          }
          return t;
        }));

        // Notify that a file has been successfully uploaded
        if (onComplete) onComplete();

      } catch (e: any) {
        setUploads(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: e.message } : t));
      }
    });
  }, []);

  const cancelUpload = useCallback((id: string) => {
    setUploads(prev => prev.map(t => t.id === id && (t.status === 'uploading' || t.status === 'pending') ? { ...t, status: 'cancelled' } : t));
  }, []);

  const clearFinished = useCallback(() => {
    setUploads(prev => prev.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'error'));
  }, []);

  const cancelAll = useCallback(() => {
    setUploads(prev => prev.map(t => (t.status === 'uploading' || t.status === 'pending') ? { ...t, status: 'cancelled' } : t));
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, uploadFiles, cancelUpload, clearFinished, cancelAll }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within UploadProvider');
  return context;
}
