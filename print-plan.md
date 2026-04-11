# Artichales Print Pipeline Refactor Plan

## Objective

Refactor the current print and PDF export flow so that **preview rendering** and **final print/export rendering** are treated as two separate pipelines.

The target outcome is:

- the editor stays interactive and layout-rich,
- the in-app print preview remains useful,
- the final PDF export is rendered from an **isolated print document**,
- browser print no longer depends on the editor shell,
- Paged.js runs only in a clean print composition environment.

This plan is designed specifically for the current `v1` repository structure.

---

## Why the current approach breaks

Today, the export flow calls `window.print()` from inside the main editor application after toggling `data-art-printing="true"` on `body`.

That means the print job still originates from the same DOM tree that contains:

- `ResizablePanelGroup`
- editor and file tree panels
- preview header and controls
- `ScrollArea`
- split layout constraints
- preview scaling and absolute containers

Even though many UI elements are hidden in `@media print`, the print output still inherits layout behavior from the editor shell. This is the root cause of the compressed single-page print behavior.

The core issue is architectural, not cosmetic.

---

## Refactor strategy

Introduce a **dedicated print entrypoint** and build a print pipeline with three clearly separated layers:

1. **Canonical document model pipeline**
2. **Preview rendering pipeline**
3. **Final export rendering pipeline**

The final export must render inside its own document, not inside the editor document.

---

## High-level target architecture

```text
Workspace Files
  ├── article.mda
  ├── template.json
  ├── references.bib
  └── assets...
        |
        v
Document Model Pipeline
  ├── parse frontmatter
  ├── validate template
  ├── validate bibliography
  ├── resolve references/captions
  ├── run plugins
  └── produce canonical model
        |
        +-------------------+
        |                   |
        v                   v
Preview Pipeline        Export Pipeline
  ├── WebPreview          ├── print.html
  ├── PrintPreviewPane    ├── PrintDocumentApp
  └── editor-only UI      ├── isolated Paged.js run
                          └── window.print()
```

---

## Scope of this plan

This plan covers:

- file structure changes,
- component extraction,
- print job transport,
- Vite entrypoint changes,
- CSS responsibility split,
- migration path from current implementation.

This plan does **not** require server-side PDF generation yet. It prepares the repository for that later.

---

# Phase 1 — Stabilize the architecture boundary

## Goal

Separate the **document model** from the **UI surface that hosts it**.

## Existing files involved

- `src/lib/document-pipeline.ts`
- `src/workers/pipeline.worker.ts`
- `src/hooks/use-document.ts`
- `src/components/artichales/preview/shared/document-render-content.tsx`

## Observed status

The repository already has a good base:

- `runDocumentPipeline()` produces a rich result object.
- `useDocument()` resolves target-specific template information.
- `DocumentRenderContent` renders from the document source rather than directly from raw files.

This is strong enough to support the refactor without rewriting the whole app.

## Required change

Refactor naming and responsibilities so the code makes the separation explicit.

### Recommended result

Create a canonical model layer that is explicitly target-agnostic.

### File changes

#### Modify
- `src/lib/document-pipeline.ts`

### Tasks

1. Keep `runDocumentPipeline(files, target)` working during migration.
2. Extract the target-independent portion into a new exported function.
3. Keep render-target-specific steps minimal and clearly separated.

### Suggested API direction

```ts
export function buildDocumentModel(files: Record<string, string>): DocumentModel
export function enrichDocumentModelForTarget(model: DocumentModel, target: "web" | "print"): DocumentSource
```

You do not need to fully rename all types in one pass. A transition period is fine.

## Deliverable

A canonical document model that can be consumed by:

- editor preview,
- print preview,
- isolated export page.

---

# Phase 2 — Split print preview from print export

## Goal

Stop using the same print component for both:

- in-editor print preview,
- actual browser print/export.

## Existing files involved

- `src/components/artichales/preview/print/print-preview.tsx`
- `src/components/artichales/surfaces/editor-preview-surface.tsx`

## Problem in current structure

`PrintPreview` currently mixes:

- hidden source DOM,
- staging DOM for Paged.js,
- preview shell,
- scaling,
- scroll container behavior,
- final paged output insertion.

That is acceptable for visual preview, but not for final export.

## Required change

Split `PrintPreview` into two separate concepts.

### New files to add

#### Add
- `src/components/artichales/preview/print/print-preview-pane.tsx`
- `src/components/artichales/preview/print/print-document-renderer.tsx`
- `src/components/artichales/preview/print/paged-preview-engine.ts`

### Responsibility breakdown

#### `print-preview-pane.tsx`
Editor-only print preview component.

Responsibilities:

- may use `ScrollArea`
- may use visual scaling
- may keep preview warnings and truncation notices
- may show page shadows and spacing
- must never be the DOM used for final browser printing

#### `print-document-renderer.tsx`
Final print document renderer.

Responsibilities:

- render a clean print root
- host only the print document
- run Paged.js against isolated content
- expose a completion callback such as `onReadyToPrint()`
- contain zero editor UI assumptions

#### `paged-preview-engine.ts`
Shared orchestration helper for Paged.js.

Responsibilities:

- import and instantiate Paged.js
- run preview against source HTML + CSS
- return rendered pages root or nodes
- centralize truncation handling if needed

This removes duplication and gives both preview and export a common engine with different containers.

## Existing file updates

#### Modify
- `src/components/artichales/surfaces/editor-preview-surface.tsx`

### Tasks

1. Replace `PrintPreview` import with `PrintPreviewPane`.
2. Remove direct coupling between editor surface and final print execution.
3. Keep the preview panel focused on preview only.

## Deliverable

A clear split between:

- `PrintPreviewPane` for the editor,
- `PrintDocumentRenderer` for final export.

---

# Phase 3 — Introduce an isolated print entrypoint

## Goal

Create a dedicated document for printing.

## New top-level files

#### Add
- `print.html`
- `src/print/print-app.tsx`
- `src/print/main.tsx`

## Responsibilities

### `print.html`
A minimal HTML shell used only for final print/export.

### `src/print/main.tsx`
Entrypoint that mounts the print app.

### `src/print/print-app.tsx`
Orchestrates:

- loading print job data,
- building the document model,
- rendering `PrintDocumentRenderer`,
- waiting for Paged.js completion,
- calling `window.print()`,
- cleaning up after print.

## Vite changes

#### Modify
- `vite.config.ts`

### Tasks

Add `print.html` as a second build input.

### Target build shape

```ts
build: {
  rollupOptions: {
    input: {
      app: "app.html",
      print: "print.html",
    },
  },
}
```

## Why this matters

This is the most important structural change in the plan.

Once printing happens from `print.html`, the export document is no longer affected by:

- editor panels,
- resizable layout,
- main app overflow behavior,
- preview transforms,
- visibility hacks.

## Deliverable

A standalone print runtime that can be opened independently from the editor page.

---

# Phase 4 — Add a print job transport layer

## Goal

Move data from the editor runtime to the isolated print runtime in a deterministic way.

## Recommended design

Transport the **workspace files snapshot**, not the rendered DOM.

This is the correct boundary because it allows the print page to rebuild the document using the same pipeline logic.

## New files to add

#### Add
- `src/services/print-job.repository.ts`
- `src/types/print-job.ts`

## Suggested print job payload

```ts
export type PrintJob = {
  id: string;
  createdAt: number;
  target: "print";
  files: Record<string, string>;
  options?: {
    autoPrint?: boolean;
  };
};
```

## Storage choice

Because this is a Chrome extension app, prefer extension-safe storage.

### Recommended first implementation

Use one of these:

- `chrome.storage.local`
- existing workspace persistence abstraction, if suitable

Do not rely on transient in-memory state shared between pages.

## Repository responsibilities

### `print-job.repository.ts`
Should provide:

- `createPrintJob(files, options)`
- `readPrintJob(id)`
- `deletePrintJob(id)`
- optional TTL cleanup

## Editor flow

When the user clicks Export PDF:

1. capture current workspace files,
2. create a print job,
3. open `print.html?job=<id>`.

## Print page flow

1. read `job` from URL,
2. load print job,
3. run document pipeline for target `print`,
4. render isolated print document,
5. print,
6. clean up job.

## Deliverable

A deterministic handoff between editor and print page.

---

# Phase 5 — Move final print execution out of the editor surface

## Goal

Remove `window.print()` from the editor pipeline.

## Existing file involved

#### Modify
- `src/components/artichales/surfaces/editor-preview-surface.tsx`

## What to remove

The current editor-side flow includes:

- `pendingPdfExportRef`
- `runPdfExport()` that sets `data-art-printing`
- `window.print()` from the editor page
- `afterprint` cleanup tied to the editor page

This must be replaced.

## Replace with

Create a dedicated export launcher function inside the editor surface.

### Suggested extraction

#### Add
- `src/components/artichales/preview/print/launch-print-export.ts`

### Responsibility

This helper should:

1. receive current workspace files,
2. create a print job,
3. resolve the URL for `print.html`,
4. open the print page,
5. optionally report errors via toast.

### Suggested signature

```ts
export async function launchPrintExport(files: Record<string, string>): Promise<void>
```

## Editor surface result

`handleExportPdf` should become a thin launcher, not a print orchestrator.

## Deliverable

The editor page no longer prints itself.

---

# Phase 6 — Simplify print CSS responsibilities

## Goal

Stop using print CSS to fight the editor shell.

## Existing files involved

- `src/components/artichales/base/index.css`
- `src/components/artichales/base/base.template.print.css`
- `src/components/artichales/base/print.mechanics.css`

## Current problem

`print.mechanics.css` currently tries to rescue the print flow by using global selectors such as:

- `body[data-art-printing="true"] * { visibility: hidden !important; }`
- visibility recovery for print root and preview elements
- scroll area normalization
- shell transform resets

This is a signal that the export page is not isolated enough.

## New CSS responsibility model

### `base.template.print.css`
Keep this as the semantic print design layer.

Responsibilities:

- typography
- headings
- figures
- tables
- references
- print-friendly semantic styling

### `print.mechanics.css`
Reduce this to isolated print mechanics only.

Responsibilities:

- paged.js page presentation
- print color adjustment
- break rules
- page surface cleanup

### New file to add

#### Add
- `src/components/artichales/base/print.document.css`

Responsibilities:

- print page root layout
- isolated print document body rules
- print-only root sizing
- no editor shell recovery rules

## Example intent for `print.document.css`

- `html, body` use white background and natural height
- `#print-root` becomes the only app shell
- no `visibility: hidden` mass reset
- no dependence on `data-art-printing`

## Deliverable

Print CSS becomes clean, targeted, and maintainable.

---

# Phase 7 — Build the isolated print application flow

## Goal

Define the exact runtime flow inside `print.html`.

## New file

#### Add
- `src/print/print-app.tsx`

## Runtime sequence

### Step 1 — Read job id

Read `job` query param from `window.location.search`.

### Step 2 — Load job data

Use `print-job.repository.ts` to fetch the stored workspace snapshot.

### Step 3 — Build print document source

Run the same document pipeline used by the editor, but for `target: "print"`.

### Step 4 — Render isolated print document

Mount `PrintDocumentRenderer` into `#print-root`.

### Step 5 — Wait for render readiness

The print renderer should expose an `onReady` or `onReadyToPrint` callback.

The callback should fire only after:

- document source content is mounted,
- Paged.js has completed,
- page DOM is stable.

### Step 6 — Trigger browser print

If the job is marked `autoPrint`, call `window.print()` after the ready callback.

### Step 7 — Cleanup

On `afterprint`:

- delete the print job,
- optionally close the window.

## Deliverable

A stable, deterministic print lifecycle.

---

# Phase 8 — Reuse Paged.js correctly

## Goal

Make Paged.js a shared rendering engine, not a surface-specific implementation detail.

## Existing file involved

#### Modify
- `src/components/artichales/preview/print/print-preview.tsx`

## New extraction target

#### Add
- `src/components/artichales/preview/print/paged-preview-engine.ts`

## What to move into the shared engine

- `resolvePagedPreviewerFactory`
- dynamic Paged.js import
- staging element creation pattern
- previewer invocation
- output extraction from `.pagedjs_pages`
- page limit logic
- error normalization

## What should remain outside the shared engine

### In preview pane
- scaling
- `ScrollArea`
- preview warnings
- page gap visuals
- preview shell styling

### In print document renderer
- page mount root
- auto-print readiness flow
- export-only DOM lifecycle

## Deliverable

One Paged.js orchestration layer, two consumers.

---

# Phase 9 — Introduce clearer naming for print concepts

## Goal

Reduce ambiguity between preview, print, export, and document render stages.

## Recommended naming changes

### Existing ambiguous names
- `PrintPreview`
- `runPdfExport`
- `data-art-printing`
- `data-art-print-root`

### Recommended naming direction

- `PrintPreviewPane`
- `PrintDocumentRenderer`
- `launchPrintExport`
- `printJob`
- `print-root`
- `paged-preview-engine`

## Why this matters

The current names blur the line between:

- previewing print,
- actually printing,
- preparing pages,
- controlling the page lifecycle.

Explicit names will make future work easier, especially if you later add:

- headless export,
- batch export,
- journal templates,
- print diagnostics.

---

# Phase 10 — Migration steps in repository order

## Step 1

### Add files
- `print.html`
- `src/print/main.tsx`
- `src/print/print-app.tsx`
- `src/services/print-job.repository.ts`
- `src/types/print-job.ts`

### Modify files
- `vite.config.ts`

### Outcome
Second entrypoint exists but is not yet wired into the editor.

---

## Step 2

### Add files
- `src/components/artichales/preview/print/paged-preview-engine.ts`
- `src/components/artichales/preview/print/print-document-renderer.tsx`
- `src/components/artichales/preview/print/print-preview-pane.tsx`

### Modify files
- `src/components/artichales/preview/print/print-preview.tsx`

### Outcome
Shared Paged.js orchestration exists and the current preview logic begins to split.

---

## Step 3

### Modify files
- `src/components/artichales/surfaces/editor-preview-surface.tsx`

### Add files
- `src/components/artichales/preview/print/launch-print-export.ts`

### Outcome
Editor export uses print job creation + `print.html` opening instead of local `window.print()`.

---

## Step 4

### Modify files
- `src/components/artichales/base/print.mechanics.css`
- `src/components/artichales/base/index.css`

### Add files
- `src/components/artichales/base/print.document.css`

### Outcome
CSS stops trying to suppress the editor shell during export.

---

## Step 5

### Modify files
- `src/lib/document-pipeline.ts`
- `src/workers/pipeline.worker.ts`
- `src/hooks/use-document.ts`

### Outcome
Canonical model pipeline becomes clearer and more reusable.

---

# Suggested file tree after refactor

```text
.
├── app.html
├── print.html
├── src
│   ├── components
│   │   └── artichales
│   │       ├── base
│   │       │   ├── index.css
│   │       │   ├── base.template.print.css
│   │       │   ├── print.mechanics.css
│   │       │   └── print.document.css
│   │       ├── preview
│   │       │   ├── shared
│   │       │   │   └── document-render-content.tsx
│   │       │   ├── web
│   │       │   │   └── web-preview.tsx
│   │       │   └── print
│   │       │       ├── paged-preview-engine.ts
│   │       │       ├── print-document-renderer.tsx
│   │       │       ├── print-preview-pane.tsx
│   │       │       └── launch-print-export.ts
│   │       └── surfaces
│   │           └── editor-preview-surface.tsx
│   ├── lib
│   │   └── document-pipeline.ts
│   ├── print
│   │   ├── main.tsx
│   │   └── print-app.tsx
│   ├── services
│   │   └── print-job.repository.ts
│   ├── types
│   │   └── print-job.ts
│   └── workers
│       └── pipeline.worker.ts
└── vite.config.ts
```

---

# Acceptance criteria

The refactor is successful when all of the following are true.

## Functional criteria

- Export PDF no longer calls `window.print()` from the editor page.
- Export opens `print.html` and prints from there.
- Final print output is independent from panel widths and editor layout.
- Hiding editor UI is no longer necessary for export correctness.
- Print output uses the same canonical document model as preview.
- Paged.js runs successfully in the isolated print page.

## UX criteria

- In-editor print preview still works.
- Export remains one click from the preview header.
- Failed print job loading is handled gracefully.
- The print window can auto-close after printing if desired.

## Maintainability criteria

- Preview components do not control final print lifecycle.
- CSS is not responsible for dismantling the editor shell.
- Print job transport is explicit and testable.
- File roles are clear from their names.

---

# Risks and mitigation

## Risk 1 — Duplicated pipeline execution

The print page may rerun the document pipeline even though the editor already ran it.

### Mitigation
This is acceptable in v1. Determinism and isolation are more important than avoiding one extra render pass.

---

## Risk 2 — Extension page URL handling

Opening `print.html` inside the extension shell may need careful URL construction.

### Mitigation
Create a small utility that resolves the entry URL using the extension runtime environment and keeps this logic out of UI components.

---

## Risk 3 — Auto-print timing

Calling `window.print()` before Paged.js finishes can still produce incomplete output.

### Mitigation
Require an explicit ready callback from `PrintDocumentRenderer` and wait for the DOM to settle before printing.

---

## Risk 4 — CSS drift between preview and export

Preview and export may slowly diverge.

### Mitigation
Keep semantic print styling shared in `base.template.print.css` and isolate only surface mechanics.

---

# Recommended implementation order for you

If you want the fastest path with the highest payoff, implement in this order:

1. add `print.html` and its entrypoint,
2. add print job transport,
3. move export out of `EditorPreviewSurface`,
4. extract `PrintDocumentRenderer`,
5. keep `PrintPreviewPane` for the editor,
6. simplify `print.mechanics.css`,
7. refine the canonical model API.

That order will solve the broken export behavior early without forcing a risky full rewrite.

---

# Final recommendation

Do **not** continue expanding the current `@media print` rescue strategy inside the editor page.

For this repository, the correct long-term architecture is:

- one canonical document pipeline,
- one editor preview surface,
- one isolated print document surface,
- one explicit print job handoff between them.

That is the most stable path for Artichales as an academic writing system built around Markdown, Paged.js, and structured templates.
