import { TelegramClient, Api, sessions } from 'telegram';
const { StringSession } = sessions;
import { SecurityService } from './Security';

class TelegramService {
  private client: TelegramClient | null = null;
  private session: StringSession = new StringSession('');

  async connect(apiId: any, apiHash: string, force = false) {
    if (!this.client || force) {
      this.client = new TelegramClient(this.session, Number(apiId), apiHash, { connectionRetries: 5 });
    }
    await this.client.connect();
    return this.client.connected;
  }

  async connectWithBot(apiId: any, apiHash: string, botToken: string) {
    this.client = new TelegramClient(new StringSession(''), Number(apiId), apiHash, { connectionRetries: 5 });
    await this.client.start({ botAuthToken: botToken });
    return this.client.connected;
  }

  async saveToVault(password: string, apiId: number, apiHash: string) {
    const { encryptionKey, authKey, salt } = await SecurityService.deriveKeys(password);
    const encrypted_payload = await SecurityService.encrypt({ session_string: this.session.save() }, encryptionKey);
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', password_hash: authKey, encrypted_payload, salt, api_id: apiId, api_hash: apiHash }),
    });
    if (!res.ok) throw new Error('Failed to save vault');
    return true;
  }

  async loadFromVault(password: string) {
    const init = await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'load' }) });
    if (!init.ok) { const e = await init.json() as any; throw new Error(e.error || 'Vault not found'); }
    const { salt, api_id, api_hash } = await init.json() as any;
    const { encryptionKey, authKey } = await SecurityService.deriveKeys(password, salt);
    const res = await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'load', password_hash: authKey }) });
    if (!res.ok) throw new Error('Invalid master password');
    const data = await res.json() as any;
    if (!data.encrypted_payload) throw new Error('Invalid master password');
    const decrypted = await SecurityService.decrypt(data.encrypted_payload, encryptionKey);
    this.session = new StringSession(decrypted.session_string);
    return { apiId: Number(api_id), apiHash: api_hash };
  }

  async sendCode(phoneNumber: string) {
    if (!this.client) throw new Error('Client not connected');
    return this.client.sendCode({ apiId: this.client.apiId, apiHash: this.client.apiHash }, phoneNumber);
  }

  async signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string) {
    if (!this.client) throw new Error('Client not connected');
    return this.client.invoke(new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode }));
  }

  async signInWithPassword(password: string) {
    if (!this.client) throw new Error('Client not connected');
    await this.client.signInWithPassword({ apiId: this.client.apiId, apiHash: this.client.apiHash }, { password: async () => password, onError: (e) => { throw e; } });
    return true;
  }

  async checkAuthorization(): Promise<boolean> {
    if (!this.client) return false;
    try { return await this.client.checkAuthorization(); } catch { return false; }
  }

  getClient() { return this.client; }
  isConnected() { return !!this.client; }

  async logout() {
    if (this.client) { await this.client.invoke(new Api.auth.LogOut()); this.client = null; this.session = new StringSession(''); }
  }

  async scanFolders() {
    if (!this.client) throw new Error('Client not connected');
    const dialogs = await this.client.getDialogs({ limit: 200 });
    return dialogs.filter(d => d.isChannel && d.entity && (d.entity as any).creator)
      .map(d => ({ 
        id: Number(d.entity?.id || 0), 
        name: d.title || 'Unknown', 
        access_hash: (d.entity as any).accessHash?.toString() || '0',
        file_count: 0, 
        total_size: 0 
      }));
  }

  async createFolder(name: string) {
    if (!this.client) throw new Error('Client not connected');
    const result = await this.client.invoke(new Api.channels.CreateChannel({ title: name, about: 'TeleCloudFS Folder', megagroup: false, broadcast: true }));
    const chats = (result as any).chats;
    if (chats?.length > 0) {
      const folder = { 
        id: Number(chats[0].id), 
        name: chats[0].title, 
        access_hash: chats[0].accessHash?.toString() || '0',
        file_count: 0, 
        total_size: 0 
      };

      // Automatically add bots as administrators
      try {
        const botsRes = await fetch('/api/bots');
        if (botsRes.ok) {
          const bots = await botsRes.json();
          const botTokens = bots.map((b: any) => b.token);
          for (const token of botTokens) {
            try {
              const botId = token.split(':')[0];
              await this.client.invoke(new Api.channels.EditAdmin({
                channel: chats[0].id,
                userId: botId,
                adminRights: new Api.ChatAdminRights({
                  changeInfo: true,
                  postMessages: true,
                  editMessages: true,
                  deleteMessages: true,
                  inviteUsers: true,
                  manageCall: true,
                  other: true
                }),
                rank: 'TeleCloudFS Bot'
              }));
              console.log(`Added bot ${botId} as admin to ${folder.name}`);
            } catch (e) { console.warn(`Failed to add bot as admin:`, e); }
          }
        }
      } catch (e) { console.warn('Failed to fetch bot config for auto-admin:', e); }

      return folder;
    }
    throw new Error('Failed to create folder');
  }

  async renameFolder(folderId: number, name: string) {
    if (!this.client) throw new Error('Client not connected');
    await this.client.invoke(new Api.channels.EditTitle({ channel: folderId, title: name }));
    return true;
  }

  async deleteFolder(folderId: number) {
    if (!this.client) throw new Error('Client not connected');
    await this.client.invoke(new Api.channels.DeleteChannel({ channel: folderId }));
    return true;
  }

  async syncBotsWithFolders() {
    if (!this.client) throw new Error('Client not connected');
    const folders = await this.scanFolders();
    const res = await fetch('/api/bots');
    if (!res.ok) return;
    const bots = await res.json();
    const botTokens = bots.map((b: any) => b.token);

    for (const folder of folders) {
      for (const token of botTokens) {
        try {
          const botId = token.split(':')[0];
          await this.client.invoke(new Api.channels.EditAdmin({
            channel: folder.id,
            userId: botId,
            adminRights: new Api.ChatAdminRights({
              changeInfo: true,
              postMessages: true,
              editMessages: true,
              deleteMessages: true,
              inviteUsers: true,
              manageCall: true,
              other: true
            }),
            rank: 'TeleCloudFS Bot'
          }));
          console.log(`Synced bot ${botId} to folder ${folder.name}`);
        } catch (e) { console.warn(`Failed to sync bot to ${folder.name}:`, e); }
      }
    }
  }

  async revokeBotFromFolders(botToken: string) {
    if (!this.client) throw new Error('Client not connected');
    const folders = await this.scanFolders();
    const botId = botToken.split(':')[0];

    for (const folder of folders) {
      try {
        await this.client.invoke(new Api.channels.EditAdmin({
          channel: folder.id,
          userId: botId,
          adminRights: new Api.ChatAdminRights({
            changeInfo: false, postMessages: false, editMessages: false, deleteMessages: false,
            inviteUsers: false, manageCall: false, other: false
          }),
          rank: ''
        }));
        console.log(`Revoked bot ${botId} from folder ${folder.name}`);
      } catch (e) { console.warn(`Failed to revoke bot from ${folder.name}:`, e); }
    }
  }

  async getFiles(folderId: number | null) {
    if (!this.client) throw new Error('Client not connected');
    const peer = folderId ?? 'me';
    let allMessages: any[] = [];
    let lastId = 0;
    for (let i = 0; i < 20; i++) {
      const batch = await this.client.getMessages(peer, { limit: 100, offsetId: lastId });
      if (!batch.length) break;
      if (lastId && batch.length === 1 && batch[0].id === lastId) break;
      allMessages = [...allMessages, ...batch];
      lastId = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }
    const unique = Array.from(new Map(allMessages.map(m => [m.id, m])).values());
    return unique.filter(m => m.media && ((m.media as any).document || (m.media as any).photo)).map(m => {
      const media = m.media as any;
      const doc = media.document; const photo = media.photo;
      let name = 'Unknown', size = 0, mime_type = 'application/octet-stream', icon_type: 'file' | 'image' | 'video' | 'audio' = 'file', duration: number | undefined;
      if (doc) {
        size = Number(doc.size); mime_type = doc.mimeType;
        for (const a of doc.attributes || []) {
          if (a.className === 'DocumentAttributeFilename') name = a.fileName;
          if (a.className === 'DocumentAttributeVideo') { duration = a.duration; icon_type = 'video'; }
          if (a.className === 'DocumentAttributeAudio') { duration = a.duration; icon_type = 'audio'; }
        }
        if (icon_type === 'file' && doc.mimeType.startsWith('image/')) icon_type = 'image';
      } else if (photo) {
        name = `Photo_${m.id}.jpg`; icon_type = 'image'; mime_type = 'image/jpeg';
        const sz = photo.sizes[photo.sizes.length - 1];
        size = sz.size || 0;
      }
      return { id: m.id, name, size, mime_type, date: m.date, icon_type, duration };
    });
  }

  async getFileInfo(messageId: number, folderId: number | null, accessHash?: string) {
    if (!this.client) throw new Error('Client not connected');
    let peer: any = folderId ?? 'me';
    if (folderId && accessHash && accessHash !== '0') {
      peer = new Api.InputPeerChannel({ channelId: BigInt(folderId), accessHash: BigInt(accessHash) });
    }
    // Force entity resolution for guest clients
    try { await this.client.getEntity(peer); } catch (e) { console.warn('Peer resolution failed:', e); }
    const messages = await this.client.getMessages(peer, { ids: [messageId] });
    if (!messages.length || !messages[0].media) return null;
    const media = messages[0].media as any;
    const doc = media.document; const photo = media.photo;
    let fileName = 'file', totalSize = 0, mimeType = 'application/octet-stream';
    if (doc) {
      totalSize = Number(doc.size); mimeType = doc.mimeType;
      for (const a of doc.attributes || []) if (a.className === 'DocumentAttributeFilename') fileName = a.fileName;
    } else if (photo) {
      fileName = `Photo_${messageId}.jpg`; mimeType = 'image/jpeg';
      totalSize = (photo.sizes[photo.sizes.length - 1]?.size) || 0;
    }
    return { fileName, totalSize, mimeType };
  }

  async uploadFile(file: File, folderId: number | null, onProgress?: (p: number) => void) {
    if (!this.client) throw new Error('Client not connected');
    const uploaded = await this.client.uploadFile({ file, workers: 1, onProgress: p => onProgress?.(p) });
    await this.client.sendFile(folderId ?? 'me', { file: uploaded, caption: file.name, forceDocument: true });
  }

  async deleteFile(messageId: number, folderId: number | null) {
    if (!this.client) throw new Error('Client not connected');
    await this.client.deleteMessages(folderId ?? 'me', [messageId], { revoke: true });
  }

  async deleteFiles(messageIds: number[], folderId: number | null) {
    if (!this.client) throw new Error('Client not connected');
    await this.client.deleteMessages(folderId ?? 'me', messageIds, { revoke: true });
  }

  async moveFiles(messageIds: number[], sourceFolderId: number | null, targetFolderId: number | null) {
    if (!this.client) throw new Error('Client not connected');
    await this.client.forwardMessages(targetFolderId ?? 'me', { messages: messageIds, fromPeer: sourceFolderId ?? 'me' });
    await this.client.deleteMessages(sourceFolderId ?? 'me', messageIds, { revoke: true });
  }

  async copyFiles(messageIds: number[], sourceFolderId: number | null, targetFolderId: number | null) {
    if (!this.client) throw new Error('Client not connected');
    await this.client.forwardMessages(targetFolderId ?? 'me', { messages: messageIds, fromPeer: sourceFolderId ?? 'me' });
  }

  async downloadChunk(messageId: number, folderId: number | null, start: number, end: number, accessHash?: string) {
    if (!this.client) throw new Error('Client not connected');
    let peer: any = folderId ?? 'me';
    if (folderId && accessHash && accessHash !== '0') {
      peer = new Api.InputPeerChannel({ channelId: BigInt(folderId), accessHash: BigInt(accessHash) });
    }
    try { await this.client.getEntity(peer); } catch (e) { console.warn('Peer resolution failed:', e); }
    const messages = await this.client.getMessages(peer, { ids: [messageId] });
    if (!messages.length || !messages[0].media) throw new Error('File not found');
    const media = messages[0].media;
    const totalSize = Number((media as any).document?.size || 0);
    const mimeType = (media as any).document?.mimeType || 'application/octet-stream';
    // @ts-ignore
    const buffer = await this.client.downloadFile(media, { start, end, workers: 4 });
    return { data: buffer, totalSize, mimeType };
  }

  async searchGlobal(query: string) {
    if (!this.client) throw new Error('Client not connected');
    let ext: string | null = null; let exact = false; let q = query;
    const em = q.match(/ext:([a-zA-Z0-9]+)/); if (em) { ext = em[1].toLowerCase(); q = q.replace(em[0], '').trim(); }
    const qm = q.match(/"([^"]+)"/); if (qm) { q = qm[1]; exact = true; }
    const msgs = await this.client.getMessages('me', { search: q, limit: 200 });
    return msgs.filter(m => m.media && (m.media as any).document).map(m => {
      const doc = (m.media as any).document;
      let name = 'Unknown';
      for (const a of doc.attributes || []) if (a.className === 'DocumentAttributeFilename') name = a.fileName;
      return { id: m.id, name, size: Number(doc.size), mime_type: doc.mimeType, date: m.date, icon_type: 'file' as const };
    }).filter(f => {
      if (ext && !f.name.toLowerCase().endsWith(`.${ext}`)) return false;
      if (exact && f.name.toLowerCase() !== q.toLowerCase()) return false;
      return true;
    });
  }

  getStreamingUrl(messageId: number, folderId: number | null, fileName: string) {
    const fp = folderId === null ? 'home' : String(folderId);
    let url = `/stream/${fp}/${messageId}/${encodeURIComponent(fileName)}`;
    const token = localStorage.getItem('token');
    if (token) url += `?t=${token}`;
    return url;
  }

  setupServiceWorkerHandler() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const port = event.ports[0];
      const { type, folderId, messageId, start, end, accessHash, botToken } = event.data || {};
      if (type === 'PING') { port?.postMessage({ ok: true }); return; }

      // If a bot token is provided, ensure we are connected as a bot
      if (botToken && (!this.client || !this.client.connected)) {
        try {
          const init = await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'load' }) });
          const { api_id, api_hash } = await init.json() as any;
          await this.connectWithBot(Number(api_id), api_hash, botToken);
        } catch (e) { console.error('Auto bot connect failed:', e); }
      }

      if (type === 'GET_FILE_INFO') {
        try { port?.postMessage(await this.getFileInfo(messageId, folderId, accessHash)); }
        catch (e: any) { port?.postMessage({ error: e.message }); }
      }
      if (type === 'GET_CHUNK') {
        try {
          const result = await this.downloadChunk(messageId, folderId, start, end, accessHash) as any;
          port?.postMessage(result, [result.data.buffer]);
        } catch (e: any) { port?.postMessage({ error: e.message }); }
      }
    });
    navigator.serviceWorker.register('/sw.js').catch(e => console.error('SW reg failed:', e));
  }
}

export const telegramService = new TelegramService();
