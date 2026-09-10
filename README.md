# File Upload Manager

[Live Demo](https://file-upload-manager-iota.vercel.app/)

A polished Google Drive-inspired file upload dashboard built as a frontend-only engineering assignment. It supports multiple files, drag and drop, progress tracking, chunked upload simulation, cancellation, retry/resume, and a strict maximum of three simultaneous uploads.

No file is transmitted to a server. The upload API is simulated locally so the complete experience can be demonstrated without credentials or a backend.

## Features

### Core requirements

- Upload multiple files with the native file picker
- Drag and drop multiple files into the upload area
- Filename, file size, file type icon, progress percentage, and status for every file
- Pending, Uploading, Completed, Failed, and Cancelled states
- Smooth progress bars based on uploaded bytes rather than a disconnected fake percentage
- Cancel an active upload with `AbortController`
- Retry failed uploads without creating duplicate rows
- Resume cancelled or failed uploads from their last completed chunk
- Remove completed, failed, and cancelled items
- Upload all pending items
- Clear completed items without affecting active uploads
- Duplicate-file detection and dismissible validation feedback
- Responsive desktop, tablet, and mobile layouts
- Keyboard-accessible upload area and action controls
- Light/dark theme toggle persisted in `localStorage`

### Bonus requirements

- 1 MB chunk upload simulation
- Upload concurrency limited to 3
- Queue activity indicator showing active upload capacity
- Deterministic failure demo for manual resume testing
- Reduced-motion support for users who prefer less animation

## Demo walkthrough

1. Start the app with `npm run dev`.
2. Select or drop four or more files. The first three become Uploading and remaining files stay Pending.
3. Cancel an active file. Its row becomes Cancelled and the next pending file starts.
4. To demonstrate failure and resume, add a file named `fail-demo.pdf` with at least 3 MB of content.
5. The simulator intentionally fails once at chunk 3. Click Resume; the upload continues from the failed chunk instead of starting over.

The failure rule is deterministic and only applies to filenames containing `fail-demo`, so normal uploads remain reliable.

## Tech stack

- React 18
- TypeScript with strict compiler settings
- Vite
- Lucide React for lightweight icons
- Vitest and React Testing Library
- ESLint 9 with TypeScript and React Hooks rules
- Native Promises, async/await, timers, and AbortController

## Architecture

```text
src/
  App.tsx                         UI composition and file-row presentation
  main.tsx                        React entry point
  types.ts                        UploadItem and UploadStatus models
  utils.ts                        Byte formatting and file-type icon selection
  hooks/
    useUploadManager.ts           Queue, scheduler, state, cancellation, retry
    useUploadManager.test.tsx     Concurrency and cancellation tests
  services/
    uploadSimulator.ts            Abortable chunk upload simulation
    uploadSimulator.test.ts       Progress, failure, resume, abort tests
  App.test.tsx                    Picker, drag/drop, and keyboard UI tests
  index.css                       Responsive light/dark product styling
```

### Upload model

Each upload is represented by an `UploadItem` containing:

- `id`, `file`, `name`, `size`, and `type`
- `status`: `pending | uploading | completed | failed | cancelled`
- `progress`, `uploadedBytes`, and `totalBytes`
- `currentChunk` and `totalChunks`
- `error` and `retryCount`

### Upload flow

```text
File picker / drop
  -> validation and duplicate detection
  -> pending queue
  -> concurrency scheduler
  -> sequential chunk upload
  -> byte-based progress updates
  -> completed, failed, or cancelled
  -> retry/resume when requested
```

The UI is intentionally kept separate from the upload orchestration. `App.tsx` renders the dashboard and delegates queue behavior to `useUploadManager`. The simulator contains the asynchronous upload mechanics and does not know about React rendering.

## Concurrency strategy

`useUploadManager` maintains a `running` set and starts work only while its size is below `MAX_CONCURRENCY`, currently `3`.

When an upload settles, whether by completion, failure, or cancellation, its ID is removed from the running set and the scheduler pumps the next pending item. This makes queue advancement independent of the outcome of the previous upload.

A ref-backed queue snapshot is used by the scheduler so asynchronous callbacks do not read stale React state. Active controllers, scheduled pump timers, and running IDs are cleaned up when the hook unmounts.

## Chunk upload and progress

Files are divided into 1 MB logical chunks. Each chunk waits for a simulated network delay, then reports the bytes completed:

```text
uploadedBytes = min(totalBytes, completedChunk * chunkSize)
progress = round(uploadedBytes / totalBytes * 100)
```

This means the visible progress percentage always reflects the simulated uploaded byte count. The UI also displays the current chunk number.

## Resume strategy

The manager retains `uploadedBytes` and `currentChunk` when an upload fails or is cancelled. Retry changes the row back to Pending and increments `retryCount`; it does not create a new upload item or reset completed chunks.

The simulator begins at the stored `currentChunk`. The deterministic `fail-demo` scenario fails before reporting chunk 3, so retry resumes from chunk 3.

## Async handling and cancellation

- Upload operations return Promises and use async/await.
- Each active upload receives its own `AbortController`.
- Aborting rejects the current chunk wait with `UploadCancelledError`.
- Every upload Promise has completion, failure, and cleanup handling.
- Timer callbacks and abort listeners are cleaned up after settlement.
- Component unmount aborts active work and prevents post-unmount state updates.

## Validation and error handling

The frontend rejects invalid file-like values and duplicate files based on filename, size, and last-modified timestamp. Validation errors are shown in a dismissible alert without interrupting valid files in the same selection.

Upload failures are shown on the affected row. Failed and cancelled rows remain visible so the user can understand what happened and choose Resume, Retry, or Remove.

There is no arbitrary maximum file-size restriction because this is a local simulation and the assignment should remain easy to demonstrate with different file sizes.

## Performance and maintainability

- One centralized scheduler manages all uploads; components do not create per-row polling intervals.
- Functional React state updates avoid lost updates during concurrent progress events.
- Stable upload IDs are used as React keys.
- Derived statistics are memoized with `useMemo`.
- The queue tracks only active controllers and one scheduler timer at a time.
- Upload rows render from a single source of truth.
- Unmount cleanup prevents timers, abort listeners, and uploads from lingering.
- The production bundle uses Vite’s optimized build pipeline.

## Accessibility and responsive behavior

- Semantic headings, buttons, status roles, and alert messaging
- Keyboard activation for the upload area
- Visible focus styles with `:focus-visible`
- ARIA labels for icon-only controls
- Progress bars expose `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`
- Status is communicated with text and not color alone
- Mobile layouts stack file information, progress, and actions without horizontal overflow
- Dark mode maintains contrast and preserves the same interaction model
- Reduced-motion media query disables non-essential transitions

## Testing

The automated suite contains 8 tests across 3 test files:

- Chunk progress reaches the expected byte values
- Deterministic failure is surfaced
- Retry resumes from the failed chunk
- Abort rejects promptly with the cancellation error
- No more than 3 uploads are active at once
- Cancellation marks an item Cancelled and advances the queue
- Multiple files can be added through the picker
- Drag and drop adds files and exposes progress semantics
- The upload area responds to keyboard activation

Run the complete verification suite with:

```bash
npm run lint
npm test
npm run build
```

## Running locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

For a production build and local preview:

```bash
npm run build
npm run preview
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint across the project |
| `npm test` | Run the Vitest suite once |
| `npm run build` | Type-check and create the production bundle |
| `npm run preview` | Preview the production bundle locally |

## Scope and limitations

This project intentionally simulates an upload API in the browser. It does not persist files between page reloads, send data to an external service, or provide server-side validation. Those boundaries keep the assignment focused on frontend state management, async behavior, queue scheduling, accessibility, and product-quality interaction design.
