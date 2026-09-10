# File Upload Manager

A production-quality React + TypeScript file upload dashboard with drag-and-drop, simulated chunk uploads, progress tracking, cancellation, retry/resume, and a maximum concurrency of three.

## Features

- Multiple file selection and drag-and-drop
- Pending, uploading, completed, failed, and cancelled states
- Progress, file size, file type icons, validation-safe handling
- Cancel, retry/resume, remove, Upload all, and Clear completed actions
- Responsive light/dark UI with persisted theme preference
- Duplicate-file detection with dismissible validation feedback

## Bonus features

- 1 MB chunk upload simulation
- Three-file concurrency scheduler
- Resume from the last completed chunk
- Deterministic `fail-demo` filename for failure/resume demonstration

## Architecture

`useUploadManager` owns the queue and concurrency scheduler. `uploadSimulator` contains the abortable async chunk simulation. The UI is composed in `App.tsx`, with pure formatting/type-icon utilities separated into `utils.ts`.

The manager tracks controllers and scheduled pump timers, keeps a ref-backed queue snapshot to avoid stale-state races, and cleans up active work on unmount.

## Upload flow

Selection → validation → pending queue → max-three scheduler → chunk upload → progress → completion/failure → retry/resume.

The scheduler tracks active IDs and starts the next pending item whenever an upload settles. AbortController releases a slot on cancellation. Retry preserves uploaded bytes/current chunk and increments the retry count; `fail-demo` fails once at chunk three, then resumes.

## Running locally

```bash
npm install
npm run dev
npm test
npm run build
```

No files are sent to a server; all upload behavior is simulated locally.

The tests cover chunk progress, deterministic failure and resume, abort behavior, the three-upload concurrency ceiling, queued uploads, and cancellation slot release.
