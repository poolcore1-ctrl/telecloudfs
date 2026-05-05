'use client';

export const runtime = 'edge';

import { DashboardContent } from "../../../components/dashboard/DashboardContent";
import { use } from "react";

export default function FolderDashboard({ params }: { params: Promise<{ folderId: string }> }) {
    const { folderId: folderIdStr } = use(params);
    const folderId = folderIdStr ? parseInt(folderIdStr) : null;

    return <DashboardContent activeFolderId={folderId} />;
}
