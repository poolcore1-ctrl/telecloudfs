export function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ── File type classification ────────────────────────────────────────────

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'] as const;
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'opus'] as const;
const MEDIA_EXTENSIONS: readonly string[] = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif'] as const;

const endsWithAny = (name: string, exts: readonly string[]) => {
    const lower = name.toLowerCase();
    return exts.some(ext => lower.endsWith(ext));
};

export const isMediaFile   = (name: string) => endsWithAny(name, MEDIA_EXTENSIONS);
export const isVideoFile   = (name: string) => endsWithAny(name, VIDEO_EXTENSIONS);
export const isAudioFile   = (name: string) => endsWithAny(name, AUDIO_EXTENSIONS);
export const isImageFile   = (name: string) => endsWithAny(name, IMAGE_EXTENSIONS);
export const isPdfFile     = (name: string) => name.toLowerCase().endsWith('.pdf');
export const isDocxFile    = (name: string) => name.toLowerCase().endsWith('.docx') || name.toLowerCase().endsWith('.doc');
export const isXlsxFile    = (name: string) => name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls') || name.toLowerCase().endsWith('.csv');
export const isCodeFile    = (name: string) => {
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'html', 'css', 'json', 'yaml', 'yml', 'md', 'txt', 'sh', 'bash', 'sql'];
    return endsWithAny(name, codeExts);
};
