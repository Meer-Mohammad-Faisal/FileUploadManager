import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUploadManager } from './useUploadManager';

const files = (count: number) => Array.from({ length: count }, (_, index) => new File([new Uint8Array(2_000_000)], `file-${index}.bin`));

describe('useUploadManager', () => {
  afterEach(() => vi.useRealTimers());

  it('never starts more than three uploads at once and queues the rest', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUploadManager());
    act(() => result.current.addFiles(files(4)));
    await act(async () => { vi.advanceTimersByTime(0); await Promise.resolve(); });
    expect(result.current.files.filter(file => file.status === 'uploading')).toHaveLength(3);
    expect(result.current.files.filter(file => file.status === 'pending')).toHaveLength(1);
  });

  it('cancellation marks the row cancelled and frees its queue slot', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUploadManager());
    act(() => result.current.addFiles(files(4)));
    await act(async () => { vi.advanceTimersByTime(0); await Promise.resolve(); });
    const active = result.current.files.find(file => file.status === 'uploading');
    expect(active).toBeDefined();
    act(() => result.current.cancel(active!.id));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current.files.find(file => file.id === active!.id)?.status).toBe('cancelled');
    expect(result.current.files.filter(file => file.status === 'uploading').length).toBeLessThanOrEqual(3);
    expect(result.current.files.filter(file => file.status === 'pending')).toHaveLength(0);
  });
});
