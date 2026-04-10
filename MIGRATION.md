# Request for Comments (RFC): Artichales Architecture & Performance Migration

## 1. Executive Summary
The current Artichales implementation violates single-responsibility principles and synchronous thread constraints, resulting in main-thread locking (UI freezing), catastrophic cursor loss on state updates, and failed scroll synchronization in multi-column outputs.

This document defines the exact, non-negotiable architectural changes required to migrate Artichales to a highly performant, asynchronous, and strictly memoized system.

---

## Phase 1: Editor Subsystem Hardening
**Objective:** Dismantle the monolithic `mdx-editor.tsx`, eliminate the destructive full-document overwrite bug, and implement a strict input debounce boundary.

### 1.1 Decoupling CodeMirror Modules
The `src/components/artichales/editor/mdx-editor.tsx` file must be stripped of all configuration logic. It will act exclusively as a React DOM bridge.

**Mandatory File Structure:**
1.  `src/editor/config/extensions.ts`: Must contain the static `basicSetup`, `history()`, `keymap.of()`, and `EditorView.lineWrapping` definitions.
2.  `src/editor/config/completions.ts`: Must encapsulate `buildBibliographyCompletions()` and `buildArticleCompletions()`.
3.  `src/components/artichales/editor/mdx-editor.tsx`: Must only handle the `useRef` attachment and basic component lifecycle.

### 1.2 Cursor Stabilization (Diff-Based Dispatch)
**Current Flaw:** The `useEffect` listening to the `value` prop executes `changes: { from: 0, to: currentView.state.doc.length, insert: value }`. This deletes and recreates the entire document, destroying the user's cursor position.

**Implementation Mandate:**
External `value` synchronization must use the `@codemirror/state` text diffing algorithm or be strictly guarded.
```typescript
React.useEffect(() => {
  const currentView = viewRef.current;
  if (!currentView || currentView.hasFocus) return; // NEVER overwrite if user is actively typing
  
  const currentContent = currentView.state.doc.toString();
  if (currentContent !== value) {
    // Dispatch a complete replacement ONLY when not focused (e.g., initial load or remote sync)
    currentView.dispatch({
      changes: { from: 0, to: currentView.state.doc.length, insert: value },
    });
  }
}, [value]);
```

### 1.3 The Debounce Boundary
The `EditorView.updateListener` must NOT trigger the document pipeline directly. It must write the raw text to a transient local state. A strict `300ms` debounce function must separate the keystroke from the pipeline execution trigger.

---

## Phase 2: Global State Decomposition
**Objective:** Deprecate the monolithic `useDocument` hook that forces full-application re-renders.

### 2.1 Zustand Store Architecture
A granular state manager (e.g., Zustand) must replace the existing `DocumentSource` object. The state must be sliced into isolated subscriptions to ensure React reconciles only the affected UI components.

**Store Contract (`src/store/workspace.store.ts`):**
```typescript
interface WorkspaceState {
  // Slice 1: Input (Read by Editor and Worker only)
  rawFiles: Record<string, string>;
  
  // Slice 2: Processed Output (Read by root Preview components)
  ast: unified.Node | null;
  frontmatter: Record<string, unknown>;
  
  // Slice 3: Reactive Numbering (Read exclusively by Tier 1 Plugin Containers)
  referenceRegistry: Record<string, ResolvedReference>;
  
  // Slice 4: Diagnostics (Read exclusively by diagnostic panels)
  diagnostics: PipelineDiagnostic[];
}
```

---

## Phase 3: The Asynchronous Pipeline Engine
**Objective:** Move `runDocumentPipeline` entirely off the main thread to guarantee 60 FPS UI performance during typing.

### 3.1 Web Worker Migration
The `src/lib/document-pipeline.ts` must be converted into a Web Worker (`src/workers/pipeline.worker.ts`).

**Execution Protocol:**
1.  **Main Thread:** Upon the `300ms` debounce expiration, the UI thread posts a payload: `{ type: 'EXECUTE_PIPELINE', files: rawFiles, target: 'print' }`.
2.  **Worker Thread:** Executes `unified()`, validation schemas, and constructs the numbering/reference registry.
3.  **Main Thread:** Receives the serialized payload (`{ type: 'PIPELINE_SUCCESS', ast, registry, diagnostics }`) and patches the Zustand store.

*Constraint:* The worker must remain completely isolated from the DOM and must not contain any React rendering logic.

---

## Phase 4: 3-Tier Directive Memoization
**Objective:** Fulfill the specification's requirement that all downstream consumers read from the same resolved numbering state, without causing heavy visual plugins to repaint when numbers shift.

### 4.1 Strict Component Hierarchy
All render plugins (e.g., Plotly, DataTable) must be refactored into a strict 3-Tier architecture.

**Tier 1: The Plugin Container**
* **Responsibility:** Data connection.
* **Implementation:** Receives the AST node. Subscribes to the Zustand store specifically targeting its identity: `useStore(state => state.referenceRegistry[identity])`.

**Tier 2: The Label Component**
* **Responsibility:** Text rendering.
* **Implementation:** A standard React component. Receives the `number` and `title` from Tier 1. It re-renders instantly whenever the numbering shifts.

**Tier 3: The Visual Engine (Strictly Isolated)**
* **Responsibility:** Heavy canvas/SVG execution.
* **Implementation:** Must be wrapped in `React.memo`.
* **Prop Contract:** `props: { pluginId: string; dataPayload: unknown }`.
* **Rule:** It must **NEVER** receive `number` or `title` as props. This guarantees the canvas remains cached even if a newly inserted caption changes this directive's number from "Figure 1" to "Figure 2".

---

## Phase 5: Deterministic Scroll Synchronization
**Objective:** Replace the flawed AST-only alignment calculation with a DOM-aware protocol that inherently supports CSS multi-column layouts and Paged.js.

### 5.1 DOM Metadata Injection
During the final React render phase of the AST, the parser must inject the original source code offset into the HTML attributes of all block-level elements (headings, paragraphs, directives).
* **Standard:** `<div data-source-offset="1024" class="plugin-container">...</div>`

### 5.2 Forward Sync Algorithm (Source -> Preview)
When the CodeMirror cursor position updates:
1.  Extract the absolute cursor offset.
2.  Query the Preview DOM: `document.querySelectorAll('[data-source-offset]')`.
3.  Find the element with the offset closest to, but not exceeding, the cursor offset.
4.  Execute: `targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })`.

### 5.3 Reverse Sync Algorithm (Preview -> Source)
When the user manually scrolls the Preview surface:
1.  Initialize an `IntersectionObserver` on the Preview container.
2.  Define a strict center-screen intersection band: `rootMargin: "-45% 0px -45% 0px"`.
3.  When a block element intersects this band, extract its `data-source-offset` attribute.
4.  Pass this integer to the `jumpToOffsetSignal` dependency in `mdx-editor.tsx`.
5.  CodeMirror will natively dispatch a scroll effect to align the source code view to the reader's exact position.