import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QueueItem } from '../types';
import { useFileDrop } from './useFileDrop';
import { telegramService } from '../services/TelegramClient';


export function useFileUpload(activeFolderId: number | null) {
    const queryClient = useQueryClient();
    const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const cancelledRef = useRef<Set<string>>(new Set());

    // Removed Tauri listener and store logic since files are in-memory (File objects can't be stored in JSON store)

    useEffect(() => {
        if (processing) return;
        const nextItem = uploadQueue.find(i => i.status === 'pending');
        if (nextItem) {
            processItem(nextItem);
        }
    }, [uploadQueue, processing]);

    const processItem = async (item: QueueItem) => {
        setProcessing(true);
        setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i));
        try {
            if (item.file) {
                await telegramService.uploadFile(item.file, item.folderId, (progress) => {
                    setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, progress: progress * 100 } : i));
                });
            } else {
                throw new Error("File object missing");
            }
            // Check if cancelled during upload
            if (cancelledRef.current.has(item.id)) {
                cancelledRef.current.delete(item.id);
            } else {
                setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'success', progress: 100 } : i));
                queryClient.invalidateQueries({ queryKey: ['files', item.folderId] });
            }
        } catch (e) {
            if (!cancelledRef.current.has(item.id)) {
                setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'error', error: String(e) } : i));
                toast.error(`Upload failed for ${item.path.split('/').pop()}: ${e}`);
            } else {
                cancelledRef.current.delete(item.id);
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleManualUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = async (e: any) => {
            const files = Array.from(e.target.files) as File[];
            if (files.length > 0) {
                const newItems: QueueItem[] = files.map((file) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    path: file.name,
                    file: file,
                    folderId: activeFolderId,
                    status: 'pending'
                }));
                setUploadQueue(prev => [...prev, ...newItems]);
                toast.info(`Queued ${files.length} files for upload`);
            }
        };
        input.click();
    };

    const cancelAll = () => {
        setUploadQueue(q => {
            const uploading = q.find(i => i.status === 'uploading');
            if (uploading) cancelledRef.current.add(uploading.id);
            return q
                .filter(i => i.status !== 'pending')
                .map(i => i.status === 'uploading' ? { ...i, status: 'cancelled' as const } : i);
        });
        toast.info('All uploads cancelled');
    };

    const { isDragging } = useFileDrop();

    return {
        uploadQueue,
        setUploadQueue,
        handleManualUpload,
        cancelAll,
        isDragging
    };
}
