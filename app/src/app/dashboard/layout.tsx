'use client';

export const dynamic = 'force-dynamic';

import { ReactNode } from 'react';
import { Sidebar } from '../../components/dashboard/Sidebar';
import { UploadQueue } from '../../components/dashboard/UploadQueue';
import { DownloadQueue } from '../../components/dashboard/DownloadQueue';
import { ExternalDropBlocker } from '../../components/dashboard/ExternalDropBlocker';
import { useTelegramConnection } from '../../hooks/useTelegramConnection';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useFileDownload } from '../../hooks/useFileDownload';
import { telegramService } from '../../services/TelegramClient';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    
    // We need to handle the activeFolderId from the URL
    const folderIdParam = params?.folderId;
    const activeFolderId = folderIdParam ? parseInt(folderIdParam as string) : null;

    const {
        folders, isSyncing, isConnected,
        handleLogout, handleSyncFolders, handleCreateFolder, handleFolderDelete
    } = useTelegramConnection(() => router.push('/'));

    const { uploadQueue, setUploadQueue, handleManualUpload, cancelAll: cancelUploads } = useFileUpload(activeFolderId);
    const { downloadQueue, clearFinished: clearDownloads, cancelAll: cancelDownloads } = useFileDownload();

    const { data: bandwidth } = useQuery({
        queryKey: ['bandwidth'],
        queryFn: () => telegramService.getBandwidth(),
        refetchInterval: 5000,
    });

    const currentView = pathname?.includes('/settings') ? 'api-keys' : 'drive';

    return (
        <div className="flex h-screen w-full overflow-hidden bg-telegram-bg relative">
            <ExternalDropBlocker onUploadClick={handleManualUpload} />

            <Sidebar
                folders={folders}
                activeFolderId={activeFolderId}
                setActiveFolderId={(id) => router.push(id ? `/dashboard/${id}` : '/dashboard')}
                onDrop={(_e, id) => {
                    // Logic for dropping files on folders in sidebar
                    console.log('Drop on folder', id);
                }}
                onDelete={handleFolderDelete}
                onCreate={handleCreateFolder}
                isSyncing={isSyncing}
                isConnected={isConnected}
                onSync={handleSyncFolders}
                onLogout={handleLogout}
                bandwidth={bandwidth || null}
                currentView={currentView}
                onViewChange={(view) => router.push(view === 'api-keys' ? '/dashboard/settings' : '/dashboard')}
            />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {children}
            </main>

            <UploadQueue 
                items={uploadQueue} 
                onClearFinished={() => setUploadQueue(q => q.filter(i => i.status !== 'success'))} 
                onCancelAll={cancelUploads} 
            />
            <DownloadQueue 
                items={downloadQueue} 
                onClearFinished={clearDownloads} 
                onCancelAll={cancelDownloads} 
            />
        </div>
    );
}
