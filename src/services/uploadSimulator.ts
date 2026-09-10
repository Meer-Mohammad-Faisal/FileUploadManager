import { UploadItem } from '../types';
export class UploadCancelledError extends Error { constructor() { super('Upload cancelled'); } }
const CHUNK_SIZE = 1024 * 1024;
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new UploadCancelledError()); return; }
  let settled = false;
  const cleanup = () => { window.clearTimeout(t); signal.removeEventListener('abort', onAbort); };
  const onAbort = () => { if (settled) return; settled = true; cleanup(); reject(new UploadCancelledError()); };
  const t = window.setTimeout(() => { if (settled) return; settled = true; cleanup(); resolve(); }, ms);
  signal.addEventListener('abort', onAbort, { once: true });
});
export async function uploadFile(item: UploadItem, signal: AbortSignal, onProgress: (bytes: number, chunk: number) => void): Promise<void> {
  const total = Math.max(item.totalBytes, 1); const chunks = item.totalChunks;
  for (let chunk = item.currentChunk; chunk <= chunks; chunk++) {
    await wait(180 + Math.min(160, Math.max(0, item.size / 500000)), signal);
    if (item.name.toLowerCase().includes('fail-demo') && item.retryCount === 0 && chunk === 3) throw new Error(`Demo failure at chunk ${chunk}`);
    const bytes = Math.min(total, chunk * CHUNK_SIZE); onProgress(bytes, chunk);
  }
}
export const makeUpload = (file: File, id: string): UploadItem => ({ id, file, name: file.name, size: file.size, type: file.type, progress: 0, uploadedBytes: 0, totalBytes: Math.max(file.size, 1), currentChunk: 1, totalChunks: Math.max(1, Math.ceil(file.size / CHUNK_SIZE)), status: 'pending', retryCount: 0 });
