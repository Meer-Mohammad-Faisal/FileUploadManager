import { FileText, FileImage, FileVideo, FileAudio, FileArchive, Sheet } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
export const formatBytes = (n: number) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
export const iconFor = (type: string, name: string): LucideIcon => { const x = `${type} ${name}`.toLowerCase(); if (x.includes('image')) return FileImage; if (x.includes('video')) return FileVideo; if (x.includes('audio')) return FileAudio; if (x.includes('zip') || x.includes('archive') || x.includes('rar')) return FileArchive; if (x.includes('sheet') || /\.csv|\.xlsx?/.test(x)) return Sheet; return FileText; };
