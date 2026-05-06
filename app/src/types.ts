export interface Folder {
  id: number;
  name: string;
  access_hash: string;
  file_count: number;
  total_size: number;
}

export interface FileItem {
  id: number;
  name: string;
  size: number;
  mime_type: string;
  date: number;
  icon_type: 'file' | 'image' | 'video' | 'audio';
  duration?: number;
  raw?: any;
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ApiKey {
  id: string;
  name: string;
  key_secret?: string;
  created_at: string;
  last_used?: string;
}
