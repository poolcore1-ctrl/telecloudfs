'use client';

export const dynamic = 'force-dynamic';

import { ApiKeys } from "../../../components/dashboard/ApiKeys";

export default function SettingsPage() {
    return (
        <div className="flex-1 overflow-y-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Developer Settings</h1>
            <ApiKeys />
        </div>
    );
}
