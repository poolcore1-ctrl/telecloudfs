'use client';

import { useState, useCallback, useEffect } from 'react';
import { TopBar } from '../../components/dashboard/TopBar';
import { FileExplorer } from '../../components/dashboard/FileExplorer';
import { MoveToFolderModal } from '../../components/dashboard/MoveToFolderModal';
import { DragDropOverlay } from '../../components/dashboard/DragDropOverlay';
import { AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { telegramService } from '../../services/TelegramClient';
import { formatBytes } from '../../utils';
import { useFileOperations } from '../../hooks/useFileOperations';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useFileDownload } from '../../hooks/useFileDownload';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { toast } from 'sonner';

export function DashboardContent({ activeFolderId }: { activeFolderId: number | null }) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const { data: allFiles = [], isLoading, error } = useQuery({
        queryKey: ['files', activeFolderId],
        queryFn: () => telegramService.getFiles(activeFolderId).then(res => res.map(f => ({
            ...f,
            sizeStr: formatBytes(f.size),
            type: (f.icon_type || (f.name.endsWith('/') ? 'folder' : 'file')) as 'folder' | 'file'
        }))),
    });

    const displayedFiles = searchTerm.length > 2
        ? searchResults
        : allFiles.filter((f: any) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const {
        handleDelete, handleBulkDelete, handleBulkDownload,
        handleBulkMove, handleDownloadFolder, handleGlobalSearch
    } = useFileOperations(activeFolderId, selectedIds, setSelectedIds, displayedFiles);

    const { handleManualUpload, isDragging } = useFileUpload(activeFolderId);
    const { queueDownload } = useFileDownload();

    const handleSelectAll = useCallback(() => {
        if (selectedIds.length === displayedFiles.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayedFiles.map((f: any) => f.id));
        }
    }, [displayedFiles, selectedIds]);

    const handlePreview = (file: any) => {
        const folderPart = activeFolderId === null ? 'home' : activeFolderId.toString();
        // Use the new dynamic bridge page
        window.open(`/s3/${folderPart}/${file.id}`, '_blank');
    };

    useKeyboardShortcuts({
        onSelectAll: handleSelectAll,
        onDelete: handleBulkDelete,
        onEscape: () => setSelectedIds([]),
        onSearch: () => (document.querySelector('input[placeholder="Search files..."]') as HTMLInputElement)?.focus(),
        onEnter: () => {
            if (selectedIds.length === 1) {
                const selected = displayedFiles.find((f: any) => f.id === selectedIds[0]);
                if (selected) handlePreview(selected);
            }
        },
        enabled: !showMoveModal
    });

    useEffect(() => {
        if (searchTerm.length <= 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            const results = await handleGlobalSearch(searchTerm);
            setSearchResults(results);
            setIsSearching(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, handleGlobalSearch]);

    return (
        <>
            <AnimatePresence>
                {showMoveModal && (
                    <MoveToFolderModal
                        folders={[]} // This should ideally come from context or layout
                        onClose={() => setShowMoveModal(false)}
                        onSelect={handleBulkMove}
                        activeFolderId={activeFolderId}
                    />
                )}
                {isDragging && <DragDropOverlay />}
            </AnimatePresence>

            <TopBar
                currentFolderName={activeFolderId === null ? "Saved Messages" : "Folder"}
                fileCount={displayedFiles.length}
                selectedIds={selectedIds}
                onShowMoveModal={() => setShowMoveModal(true)}
                onBulkDownload={handleBulkDownload}
                onBulkDelete={handleBulkDelete}
                onDownloadFolder={handleDownloadFolder}
                onSelectAll={handleSelectAll}
                viewMode={viewMode}
                setViewMode={setViewMode}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <FileExplorer
                files={displayedFiles}
                loading={isLoading || isSearching}
                error={error}
                viewMode={viewMode}
                selectedIds={selectedIds}
                activeFolderId={activeFolderId}
                onFileClick={(e, id) => {
                    e.stopPropagation();
                    if (e.metaKey || e.ctrlKey) {
                        setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
                    } else {
                        setSelectedIds([id]);
                    }
                }}
                onDelete={handleDelete}
                onDownload={(id, name) => queueDownload(id, name, activeFolderId)}
                onPreview={handlePreview}
                onManualUpload={handleManualUpload}
                onSelectionClear={() => setSelectedIds([])}
                onToggleSelection={(id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])}
                onDrop={async (_e, _targetFolderId) => {
                    // Logic for dropping on folder
                    toast.info("Move to folder via drag-drop coming soon in Next.js version");
                }}
                onDragStart={() => {}}
                onDragEnd={() => {}}
            />
        </>
    );
}
