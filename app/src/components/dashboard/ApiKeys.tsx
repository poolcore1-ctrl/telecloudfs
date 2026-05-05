'use client';

import { useState, useEffect } from 'react';
import { Key, Copy, Trash2, Plus, RefreshCw, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
    id: string;
    name: string;
    created_at: string;
    last_used: string | null;
}

export function ApiKeys() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [generatedKey, setGeneratedKey] = useState<{ id: string, key_secret: string } | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/keys');
            if (res.ok) {
                const data = await res.json() as ApiKey[];
                setKeys(data);
            }
        } catch (err) {
            toast.error("Failed to fetch API keys");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;
        try {
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName })
            });
            if (res.ok) {
                const data = await res.json() as { id: string, key_secret: string };
                setGeneratedKey(data);
                fetchKeys();
                setNewKeyName("");
                toast.success("API key generated successfully");
            }
        } catch (err) {
            toast.error("Failed to generate API key");
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Are you sure you want to delete this API key?")) return;
        try {
            const res = await fetch('/api/keys', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                setKeys(keys.filter(k => k.id !== id));
                toast.success("API key deleted");
            }
        } catch (err) {
            toast.error("Failed to delete API key");
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-telegram-bg">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">TeleCloudFS API</h1>
                        <p className="text-telegram-subtext text-sm">
                            Manage access keys for S3-compatible API and external developers.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNewKeyModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-telegram-primary hover:bg-telegram-primary/90 text-white rounded-lg transition-all shadow-lg shadow-telegram-primary/20"
                    >
                        <Plus className="w-4 h-4" />
                        Generate New Key
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <RefreshCw className="w-8 h-8 text-telegram-primary animate-spin" />
                    </div>
                ) : keys.length === 0 ? (
                    <div className="bg-telegram-surface border border-telegram-border rounded-xl p-12 text-center">
                        <Key className="w-16 h-16 text-telegram-subtext mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg text-white font-medium mb-2">No API keys yet</h3>
                        <p className="text-blue-400/80 text-sm leading-relaxed">
                        Use your API keys to interact with the TeleCloudFS S3-compatible API. The endpoint is <code>{(typeof window !== 'undefined' ? window.location.origin : '')}/api/s3</code>. 
                        Support for GET, PUT, DELETE and LIST operations is available.
                    </p>
                        <button
                            onClick={() => setShowNewKeyModal(true)}
                            className="text-telegram-primary hover:underline font-medium"
                        >
                            Generate a key now
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {keys.map(key => (
                            <div key={key.id} className="bg-telegram-surface border border-telegram-border rounded-xl p-6 transition-all hover:border-telegram-primary/50 group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-telegram-primary/10 flex items-center justify-center">
                                            <Key className="w-5 h-5 text-telegram-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{key.name}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-telegram-subtext">
                                                <span>ID: <code className="bg-white/5 px-1 rounded">{key.id}</code></span>
                                                <span>• Created: {new Date(key.created_at).toLocaleDateString()}</span>
                                                {key.last_used && <span>• Last used: {new Date(key.last_used).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyToClipboard(key.id, key.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-telegram-subtext hover:text-white transition-colors"
                                            title="Copy Key ID"
                                        >
                                            {copiedId === key.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteKey(key.id)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-telegram-subtext hover:text-red-500 transition-colors"
                                            title="Delete Key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-12 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <ExternalLink className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-blue-400 font-medium mb-1">Developer Documentation</h4>
                            <p className="text-blue-400/80 text-sm leading-relaxed">
                                Use your API keys to interact with the S3-compatible API. The endpoint is <code>{(typeof window !== 'undefined' ? window.location.origin : '')}/api/s3</code>. 
                                Support for GET, PUT, DELETE and LIST operations is available.
                            </p>
                            <a href="#" className="inline-block mt-4 text-blue-400 hover:underline text-sm font-medium">
                                View API Reference →
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Key Modal */}
            {showNewKeyModal && (
                <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-telegram-surface border border-telegram-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {!generatedKey ? (
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Generate API Key</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-telegram-subtext mb-1">Key Name</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full bg-white/5 border border-telegram-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-telegram-primary/50"
                                            placeholder="e.g. My Website, Backup Script"
                                            value={newKeyName}
                                            onChange={e => setNewKeyName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateKey()}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setShowNewKeyModal(false)}
                                            className="flex-1 px-4 py-2 rounded-lg border border-telegram-border text-telegram-text hover:bg-white/5 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateKey}
                                            disabled={!newKeyName.trim()}
                                            className="flex-1 px-4 py-2 rounded-lg bg-telegram-primary text-white hover:bg-telegram-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-6 h-6 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white text-center mb-2">Key Generated!</h3>
                                <p className="text-telegram-subtext text-center text-sm mb-6">
                                    Copy your key secret now. You won't be able to see it again.
                                </p>
                                
                                <div className="space-y-4">
                                    <div className="bg-black/40 rounded-lg p-4 border border-telegram-border">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-telegram-subtext uppercase tracking-wider">Key Secret</span>
                                            <button 
                                                onClick={() => copyToClipboard(generatedKey.key_secret, 'secret')}
                                                className="text-telegram-primary hover:text-telegram-primary/80 transition-colors"
                                            >
                                                {copiedId === 'secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <code className="text-telegram-primary font-mono text-sm break-all">
                                            {generatedKey.key_secret}
                                        </code>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setShowNewKeyModal(false);
                                            setGeneratedKey(null);
                                        }}
                                        className="w-full px-4 py-2 rounded-lg bg-telegram-primary text-white hover:bg-telegram-primary/90 transition-colors"
                                    >
                                        I've saved it
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
