import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';
import { SecurityService } from './Security';

class TelegramService {
    private client: TelegramClient | null = null;
    private session: StringSession;

    constructor() {
        this.session = new StringSession('');
    }

    public async connect(apiId: number, apiHash: string, force = false) {
        if (!this.client || force) {
            this.client = new TelegramClient(this.session, apiId, apiHash, {
                connectionRetries: 5,
            });
        }
        await this.client.connect();
        return this.client.connected;
    }

    public async saveToVault(password: string, apiId: number, apiHash: string) {
        const { encryptionKey, authKey, salt } = await SecurityService.deriveKeys(password);
        
        const payload = {
            session_string: this.session.save()
        };

        const encrypted_payload = await SecurityService.encrypt(payload, encryptionKey);

        const response = await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save',
                password_hash: authKey,
                encrypted_payload,
                salt,
                api_id: apiId,
                api_hash: apiHash
            })
        });
        return response.ok;
    }

    public async loadFromVault(password: string) {
        // Step 1: Fetch the salt and plain keys
        const initResponse = await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'load' })
        });

        if (!initResponse.ok) {
            const err = await initResponse.json() as any;
            throw new Error(err.error || 'Vault not found');
        }

        const { salt, api_id, api_hash } = await initResponse.json() as any;
        const { encryptionKey, authKey } = await SecurityService.deriveKeys(password, salt);

        // Step 2: Fetch the encrypted session using the derived authKey
        const payloadResponse = await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'load', 
                password_hash: authKey 
            })
        });

        if (!payloadResponse.ok) {
            throw new Error('Invalid master password');
        }

        const data = await payloadResponse.json() as any;
        if (!data.encrypted_payload) {
            throw new Error('Invalid master password');
        }

        const decrypted = await SecurityService.decrypt(data.encrypted_payload, encryptionKey);
        
        // Update local session and return credentials
        this.session = new StringSession(decrypted.session_string);
        
        return {
            apiId: Number(api_id),
            apiHash: api_hash
        };
    }

    public async sendCode(phoneNumber: string) {
        if (!this.client) throw new Error("Client not connected");
        return await this.client.sendCode(
            {
                apiId: this.client.apiId,
                apiHash: this.client.apiHash,
            },
            phoneNumber
        );
    }

    public async signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string) {
        if (!this.client) throw new Error("Client not connected");
        const user = await this.client.invoke(
            new Api.auth.SignIn({
                phoneNumber,
                phoneCodeHash,
                phoneCode,
            })
        );
        return user;
    }

    public async signInWithPassword(password: string) {
        if (!this.client) throw new Error("Client not connected");
        await this.client.signInWithPassword({ apiId: this.client.apiId, apiHash: this.client.apiHash }, { password: async () => password, onError: (e) => { throw e; }});
        return true;
    }
    
    public async checkAuthorization() {
        if (!this.client) return false;
        try {
            return await this.client.checkAuthorization();
        } catch {
            return false;
        }
    }

    public getClient() {
        return this.client;
    }

    public async logout() {
        if (this.client) {
            await this.client.invoke(new Api.auth.LogOut());
            this.client = null;
            this.session = new StringSession('');
        }
    }

    public async scanFolders() {
        if (!this.client) throw new Error("Client not connected");
        const dialogs = await this.client.getDialogs({ limit: 100 });
        // Optional: loop if needed, but 100 is usually enough for folders
        // Let's add one loop for up to 200 just in case
        if (dialogs.length === 100) {
            const more = await this.client.getDialogs({ limit: 100, offsetId: Number(dialogs[dialogs.length - 1].id) });
            dialogs.push(...more);
        }
        return dialogs
            .filter(d => d.isChannel && d.entity && (d.entity as any).creator)
            .map(d => ({
                id: Number(d.entity?.id || 0),
                name: d.title || 'Unknown',
                file_count: 0,
                total_size: 0
            }));
    }

    public async createFolder(name: string) {
        if (!this.client) throw new Error("Client not connected");
        const result = await this.client.invoke(
            new Api.channels.CreateChannel({
                title: name,
                about: 'Telegram Drive Folder',
                megagroup: false,
                broadcast: true,
            })
        );
        const chats = (result as any).chats;
        if (chats && chats.length > 0) {
            return {
                id: Number(chats[0].id),
                name: chats[0].title,
                file_count: 0,
                total_size: 0
            };
        }
        throw new Error("Failed to create folder");
    }

    public async deleteFolder(folderId: number) {
        if (!this.client) throw new Error("Client not connected");
        await this.client.invoke(
            new Api.channels.DeleteChannel({
                channel: folderId
            })
        );
        return true;
    }
    public async getFiles(folderId: number | null) {
        if (!this.client) throw new Error("Client not connected");
        
        const peer = folderId ? folderId : 'me';
        let allMessages: any[] = [];
        let lastId = 0;
        
        // Fetch in batches of 100 to avoid hitting limits while getting a reasonable amount
        for (let i = 0; i < 20; i++) { // Increased to 20 batches (2000 messages)
            const batch = await this.client.getMessages(peer, { 
                limit: 100,
                offsetId: lastId
            });
            if (batch.length === 0) break;
            
            // Avoid infinite loop if we keep getting the same message
            if (lastId !== 0 && batch.length === 1 && batch[0].id === lastId) break;

            allMessages = [...allMessages, ...batch];
            lastId = batch[batch.length - 1].id;
            
            if (batch.length < 100) break;
        }

        // De-duplicate by message ID
        const uniqueMessages = Array.from(new Map(allMessages.map(m => [m.id, m])).values());

        return uniqueMessages.filter(m => m.media && ((m.media as any).document || (m.media as any).photo)).map(m => {
            const media = m.media as any;
            const doc = media.document;
            const photo = media.photo;
            
            let fileName = 'Unknown';
            let size = 0;
            let mime_type = 'application/octet-stream';
            let icon_type = 'file';
            let duration = undefined;

            if (doc) {
                const attributes = doc.attributes || [];
                size = Number(doc.size);
                mime_type = doc.mimeType;

                for (const attr of attributes) {
                    if (attr.className === 'DocumentAttributeFilename') fileName = attr.fileName;
                    if (attr.className === 'DocumentAttributeVideo') {
                        duration = attr.duration;
                        icon_type = 'video';
                    }
                    if (attr.className === 'DocumentAttributeAudio') {
                        duration = attr.duration;
                        icon_type = 'audio';
                    }
                }
                if (icon_type === 'file' && doc.mimeType.startsWith('image/')) icon_type = 'image';
            } else if (photo) {
                // Handle Photos
                fileName = `Photo_${m.id}.jpg`;
                icon_type = 'image';
                mime_type = 'image/jpeg';
                // Pick the largest size for the "file size"
                const largestSize = photo.sizes[photo.sizes.length - 1];
                size = largestSize.size || (largestSize.w * largestSize.h * 0.2); // Fallback estimate
            }

            return {
                id: m.id,
                name: fileName,
                size: size,
                mime_type: mime_type,
                date: m.date,
                icon_type,
                duration
            };
        });
    }

    public async getBandwidth() {
        return { up_bytes: 0, down_bytes: 0 };
    }

    public async uploadFile(file: File, folderId: number | null, onProgress?: (progress: number) => void) {
        if (!this.client) throw new Error("Client not connected");

        // Use the built-in uploadFile method which is the most stable for browser environments
        const uploadedFile = await this.client.uploadFile({
            file: file,
            workers: 1,
            onProgress: (p) => {
                if (onProgress) onProgress(p);
            }
        });

        const peer = folderId ? folderId : 'me';
        await this.client.sendFile(peer, {
            file: uploadedFile,
            caption: file.name,
            forceDocument: true
        });
    }

    public async deleteFile(messageId: number, folderId: number | null) {
        if (!this.client) throw new Error("Client not connected");
        const peer = folderId ? folderId : 'me';
        await this.client.deleteMessages(peer, [messageId], { revoke: true });
    }

    public async moveFiles(messageIds: number[], sourceFolderId: number | null, targetFolderId: number | null) {
        if (!this.client) throw new Error("Client not connected");
        const sourcePeer = sourceFolderId ? sourceFolderId : 'me';
        const targetPeer = targetFolderId ? targetFolderId : 'me';
        
        await this.client.forwardMessages(targetPeer, {
            messages: messageIds,
            fromPeer: sourcePeer
        });
        await this.client.deleteMessages(sourcePeer, messageIds, { revoke: true });
    }

    public async downloadFile(messageId: number, folderId: number | null, onProgress?: (progress: number) => void) {
        if (!this.client) throw new Error("Client not connected");
        const peer = folderId ? folderId : 'me';
        const messages = await this.client.getMessages(peer, { ids: [messageId] });
        if (messages.length === 0 || !messages[0].media) throw new Error("File not found");
        
        const buffer = await this.client.downloadMedia(messages[0].media, {
            progressCallback: (downloaded: any, total: any) => {
                if (onProgress && total && total > 0) {
                    onProgress(Number(downloaded) / Number(total));
                }
            }
        });
        return buffer;
    }

    public async searchGlobal(query: string) {
        if (!this.client) throw new Error("Client not connected");

        let searchTerm = query;
        let extensionFilter: string | null = null;
        let exactMatch = false;

        // Parse extension filter: ext:pdf
        const extMatch = query.match(/ext:([a-zA-Z0-9]+)/);
        if (extMatch) {
            extensionFilter = extMatch[1].toLowerCase();
            searchTerm = searchTerm.replace(extMatch[0], '').trim();
        }

        // Parse exact match: "my file"
        const quoteMatch = searchTerm.match(/"([^"]+)"/);
        if (quoteMatch) {
            searchTerm = quoteMatch[1];
            exactMatch = true;
        }

        let allSearchMessages: any[] = [];
        let searchLastId = 0;

        for (let i = 0; i < 5; i++) {
            const batch = await this.client.getMessages('me', { 
                search: searchTerm, 
                limit: 100,
                offsetId: searchLastId
            });
            if (batch.length === 0) break;
            allSearchMessages = [...allSearchMessages, ...batch];
            searchLastId = batch[batch.length - 1].id;
            if (batch.length < 100) break;
        }

        const messages = allSearchMessages;
        
        return messages
            .filter(m => m.media && (m.media as any).document)
            .map(m => {
                const doc = (m.media as any).document;
                const attributes = doc.attributes || [];
                let fileName = 'Unknown';
                for (const attr of attributes) {
                    if (attr.className === 'DocumentAttributeFilename') fileName = attr.fileName;
                }
                return {
                    id: m.id,
                    name: fileName,
                    size: Number(doc.size),
                    sizeStr: '',
                    type: 'file' as const,
                    mime_type: doc.mimeType,
                    date: m.date,
                    icon_type: 'file'
                };
            })
            .filter(f => {
                if (extensionFilter && !f.name.toLowerCase().endsWith(`.${extensionFilter}`)) return false;
                if (exactMatch && f.name.toLowerCase() !== searchTerm.toLowerCase()) return false;
                return true;
            });
    }
    public async getPreviewUrl(messageId: number, folderId: number | null, fileName: string = 'file'): Promise<string> {
        return this.getStreamingUrl(messageId, folderId, fileName);
    }

    public async getThumbnailUrl(messageId: number, folderId: number | null): Promise<string> {
        if (!this.client) throw new Error("Client not connected");
        const peer = folderId ? folderId : 'me';
        const messages = await this.client.getMessages(peer, { ids: [messageId] });
        if (messages.length === 0 || !messages[0].media) throw new Error("File not found");
        
        const media = messages[0].media;
        
        // Try to get a small thumbnail first
        // @ts-ignore
        const buffer = await this.client.downloadMedia(media, {
            thumb: 0
        }).catch(() => null);

        if (!buffer) return this.getPreviewUrl(messageId, folderId);

        const blob = new Blob([buffer]);
        return URL.createObjectURL(blob);
    }

    public getStreamingUrl(messageId: number, folderId: number | null, fileName: string): string {
        const folderPart = folderId === null ? 'home' : folderId.toString();
        return `/stream/${folderPart}/${messageId}/${encodeURIComponent(fileName)}`;
    }

    public async downloadChunk(messageId: number, folderId: number | null, start: number, end: number) {
        if (!this.client) throw new Error("Client not connected");
        const peer = folderId ? folderId : 'me';
        const messages = await this.client.getMessages(peer, { ids: [messageId] });
        if (messages.length === 0 || !messages[0].media) throw new Error("File not found");
        
        const media = messages[0].media;
        const totalSize = (media as any).document?.size || (media as any).photo?.sizes.slice(-1)[0].size || 0;
        const mimeType = (media as any).document?.mimeType || 'application/octet-stream';

        // @ts-ignore
        const buffer = await this.client.downloadFile(media, {
            start,
            end,
            workers: 4 // Increased for speed
        });

        return {
            data: buffer,
            totalSize: Number(totalSize),
            mimeType
        };
    }

    public setupServiceWorkerHandler() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', async (event) => {
                if (event.data?.type === 'GET_CHUNK') {
                    const { folderId, messageId, start, end } = event.data;
                    const port = event.ports[0];
                    
                    try {
                        const result = await this.downloadChunk(messageId, folderId, start, end) as any;
                        port.postMessage(result, [result.data.buffer]);
                    } catch (error: any) {
                        port.postMessage({ error: error.message });
                    }
                }
            });
            
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW Registered', reg))
                .catch(err => console.error('SW Registration failed', err));
        }
    }
}

export const telegramService = new TelegramService();
