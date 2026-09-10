import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadItem } from '../types';
import { makeUpload, uploadFile, UploadCancelledError } from '../services/uploadSimulator';

const MAX_CONCURRENCY = 3;
const idFor = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useUploadManager() {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const filesRef = useRef(files); filesRef.current = files;
  const controllers = useRef(new Map<string, AbortController>());
  const running = useRef(new Set<string>());
  const scheduledPump = useRef<number | undefined>();
  const mounted = useRef(true);

  const patch = useCallback((id: string, update: Partial<UploadItem>) => {
    if (mounted.current) {
      filesRef.current = filesRef.current.map(x => x.id === id ? { ...x, ...update } : x);
      setFiles(xs => xs.map(x => x.id === id ? { ...x, ...update } : x));
    }
  }, []);

  const pump = useCallback(() => {
    if (!mounted.current) return;
    while (running.current.size < MAX_CONCURRENCY) {
      const next = filesRef.current.find(x => x.status === 'pending' && !running.current.has(x.id));
      if (!next) return;
      running.current.add(next.id);
      const controller = new AbortController(); controllers.current.set(next.id, controller);
      const item = { ...next, status: 'uploading' as const };
      patch(next.id, { status: 'uploading', error: undefined });
      void uploadFile(item, controller.signal, (bytes, chunk) => patch(next.id, {
        uploadedBytes: bytes, currentChunk: chunk, progress: Math.min(100, Math.round(bytes / item.totalBytes * 100)),
      })).then(() => patch(next.id, { status: 'completed', progress: 100, uploadedBytes: item.totalBytes, currentChunk: item.totalChunks }))
        .catch((error: unknown) => {
          if (error instanceof UploadCancelledError) patch(next.id, { status: 'cancelled', error: undefined });
          else patch(next.id, { status: 'failed', error: error instanceof Error ? error.message : 'Upload failed' });
        })
        .finally(() => {
          running.current.delete(next.id); controllers.current.delete(next.id);
          if (mounted.current) scheduledPump.current = window.setTimeout(() => { scheduledPump.current = undefined; pump(); }, 0);
        });
    }
  }, [patch]);

  const schedulePump = useCallback(() => {
    if (scheduledPump.current !== undefined || !mounted.current) return;
    scheduledPump.current = window.setTimeout(() => { scheduledPump.current = undefined; pump(); }, 0);
  }, [pump]);

  const addFiles = useCallback((incoming: File[]) => {
    const errors: string[] = []; const accepted: File[] = [];
    const known = new Set(filesRef.current.map(x => `${x.name}:${x.size}:${x.file.lastModified}`));
    incoming.forEach((file) => {
      if (!file || typeof file.name !== 'string' || typeof file.size !== 'number') { errors.push('One item was not a valid file.'); return; }
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (known.has(key)) errors.push(`${file.name} is already in the list.`); else { known.add(key); accepted.push(file); }
    });
    if (errors.length && mounted.current) setValidationErrors(errors);
    if (accepted.length) {
      const additions = accepted.map(file => makeUpload(file, idFor())); filesRef.current = [...filesRef.current, ...additions];
      setFiles(xs => [...xs, ...additions]); schedulePump();
    }
  }, [schedulePump]);

  const cancel = useCallback((id: string) => { const controller = controllers.current.get(id); if (controller) controller.abort(); else patch(id, { status: 'cancelled' }); }, [patch]);
  const retry = useCallback((id: string) => { filesRef.current = filesRef.current.map(x => x.id === id ? { ...x, status: 'pending', retryCount: x.retryCount + 1, error: undefined } : x); setFiles(xs => xs.map(x => x.id === id ? { ...x, status: 'pending', retryCount: x.retryCount + 1, error: undefined } : x)); schedulePump(); }, [schedulePump]);
  const remove = useCallback((id: string) => { cancel(id); filesRef.current = filesRef.current.filter(x => x.id !== id); setFiles(xs => xs.filter(x => x.id !== id)); }, [cancel]);
  const clearCompleted = useCallback(() => { filesRef.current = filesRef.current.filter(x => x.status !== 'completed'); setFiles(xs => xs.filter(x => x.status !== 'completed')); }, []);

  useEffect(() => {
    mounted.current = true; schedulePump();
    const controllerMap = controllers.current; const runningIds = running.current;
    return () => { mounted.current = false; if (scheduledPump.current !== undefined) window.clearTimeout(scheduledPump.current); controllerMap.forEach(controller => controller.abort()); controllerMap.clear(); runningIds.clear(); };
  }, [schedulePump]);
  return { files, validationErrors, dismissValidation: () => setValidationErrors([]), addFiles, cancel, retry, remove, clearCompleted, uploadAll: pump, maxConcurrency: MAX_CONCURRENCY };
}
