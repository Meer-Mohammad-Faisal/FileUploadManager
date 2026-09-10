import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('upload dashboard', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

  it('adds multiple files through the picker', () => {
    const { container } = render(<App />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['a'], 'alpha.txt'), new File(['b'], 'beta.txt')] } });
    expect(screen.getByText('alpha.txt')).toBeInTheDocument();
    expect(screen.getByText('beta.txt')).toBeInTheDocument();
  });

  it('adds files through drag and drop and exposes progress semantics', () => {
    render(<App />);
    const zone = screen.getByRole('button', { name: /upload files by browsing/i });
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /photo.png/i })).toHaveAttribute('aria-valuenow', '0');
  });

  it('supports keyboard activation on the upload zone', () => {
    const { container } = render(<App />);
    const zone = screen.getByRole('button', { name: /upload files by browsing/i });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.fn(); input.click = click;
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(click).toHaveBeenCalled();
  });
});
