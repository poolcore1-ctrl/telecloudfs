'use client';

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';

export default function StreamBridge({ params }: { params: Promise<{ folderId: string; messageId: string }> }) {
    const { folderId, messageId } = use(params);
    const [status, setStatus] = useState('Initializing stream engine...');
    const [error, setError] = useState<string | null>(null);

    const streamPath = `/stream/${folderId}/${messageId}/file`;

    useEffect(() => {
        async function startStream() {
            if (!('serviceWorker' in navigator)) {
                setError('Your browser does not support Service Workers. Please use Chrome, Firefox, or Edge.');
                return;
            }

            try {
                setStatus('Registering stream engine...');
                await navigator.serviceWorker.register('/sw.js', { scope: '/' });

                setStatus('Activating stream engine...');
                await navigator.serviceWorker.ready;

                if (!navigator.serviceWorker.controller) {
                    setStatus('Almost ready, activating...');
                    window.location.reload();
                    return;
                }

                setStatus('Connecting to TeleCloudFS...');

                const channel = new MessageChannel();
                const pingPromise = new Promise<{ ok: boolean }>((resolve) => {
                    channel.port1.onmessage = (e) => resolve(e.data);
                    setTimeout(() => resolve({ ok: false }), 3000);
                });
                navigator.serviceWorker.controller.postMessage({ type: 'PING' }, [channel.port2]);
                const pong = await pingPromise;

                if (!pong || !pong.ok) {
                    setError('TeleCloudFS dashboard is not open. Please log in first.');
                    return;
                }

                setStatus('Starting stream...');
                setTimeout(() => {
                    window.location.href = streamPath;
                }, 300);

            } catch (err: any) {
                setError('Stream initialization failed: ' + err.message);
            }
        }

        startStream();
    }, [streamPath]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white font-sans">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 p-10 rounded-3xl shadow-2xl border border-slate-800 max-w-md w-[90%] text-center"
            >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl shadow-lg shadow-blue-500/20">
                    ☁
                </div>
                <h1 className="text-2xl font-bold mb-2">TeleCloudFS</h1>
                <p className="text-sm text-slate-400 mb-8">Preparing your file stream...</p>
                
                {!error ? (
                    <>
                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <div className="text-sm text-slate-300">{status}</div>
                    </>
                ) : (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm leading-relaxed text-left">
                        <strong className="block mb-1">Stream Error</strong>
                        {error}
                        {error.includes('log in first') && (
                             <a href="/" className="block mt-3 text-blue-400 underline font-medium">Open Dashboard</a>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
