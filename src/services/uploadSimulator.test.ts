import { describe, expect, it, vi } from 'vitest';
import { makeUpload, uploadFile, UploadCancelledError } from './uploadSimulator';

describe('upload simulator', () => {
  it('reports chunk-based progress through completion', async () => {
    vi.useFakeTimers();
    const item = makeUpload(new File([new Uint8Array(2_100_000)], 'report.pdf', { type: 'application/pdf' }), '1');
    const updates: number[] = [];
    const promise = uploadFile(item, new AbortController().signal, bytes => updates.push(bytes));
    await vi.runAllTimersAsync(); await promise;
    expect(updates).toEqual([1048576, 2097152, 2100000]);
    vi.useRealTimers();
  });

  it('fails fail-demo once and can resume from its next chunk', async () => {
    vi.useFakeTimers();
    const item = makeUpload(new File([new Uint8Array(4_000_000)], 'fail-demo.pdf'), '2');
    const first = uploadFile(item, new AbortController().signal, (bytes, chunk) => { item.uploadedBytes = bytes; item.currentChunk = chunk + 1; });
    const firstFailure = expect(first).rejects.toThrow('Demo failure'); await vi.runAllTimersAsync(); await firstFailure;
    item.retryCount = 1;
    const chunks: number[] = []; const promise = uploadFile(item, new AbortController().signal, (_, chunk) => chunks.push(chunk));
    await vi.runAllTimersAsync(); await promise;
    expect(chunks[0]).toBe(3); vi.useRealTimers();
  });

  it('rejects promptly when aborted', async () => {
    vi.useFakeTimers(); const controller = new AbortController();
    const item = makeUpload(new File(['x'], 'cancel.txt'), '3'); const promise = uploadFile(item, controller.signal, vi.fn());
    controller.abort(); await expect(promise).rejects.toBeInstanceOf(UploadCancelledError); vi.useRealTimers();
  });
});
