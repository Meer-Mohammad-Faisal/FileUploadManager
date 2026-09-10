export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
export interface UploadItem { id: string; file: File; name: string; size: number; type: string; progress: number; uploadedBytes: number; totalBytes: number; currentChunk: number; totalChunks: number; status: UploadStatus; error?: string; retryCount: number; }
