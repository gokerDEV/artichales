# FIX.md: Comprehensive Architectural & Migration Audit

## Phase 1: Duplicate Type Definitions & Interface Leakage (The "Spaghetti Typing" Issue)

The codebase suffers from severe type duplication, violating DRY principles and risking out-of-sync type signatures across the pipeline and UI layers.

**1. Issue: Duplicated `UnknownRecord`**
* **Location:** `src/components/artichales/plugins/plotty.render.plugin.tsx:12` and `src/components/artichales/plugins/datatable.render.plugin.tsx:5`
* **Violation:** Both plugins declare `type UnknownRecord = Record<string, unknown>;` locally.
* **Solution:** Move to `src/lib/types.ts` or `plugin.contract.ts` and import it.

**2. Issue: Duplicated `DatatableIndexMap`**
* **Location:** `plotty.render.plugin.tsx:32` and `datatable.render.plugin.tsx:6`
* **Violation:** `DatatableIndexMap` is redefined in the Plotty plugin to resolve cross-references.
* **Solution:** Centralize numbering maps in `src/lib/article-analysis.ts` or `types.ts`.

**3. Issue: Pipeline Result Redundancy**
* **Location:** `src/lib/document-pipeline.ts` (`PipelineResult`) vs `src/store/workspace.store.ts` (`PipelineResultPayload`)
* **Violation:** The store manually duplicates the exact signature of the pipeline's return type, requiring double-updates when pipeline features change.
* **Solution:** Export `PipelineResult` from `document-pipeline.ts` and use `type PipelineResultPayload = Omit<PipelineResult, 'pipelineDiagnostics'>` (or similar) in the store.

**4. Issue: Duplicate Diagnostic Typing**
* **Location:** `src/components/artichales/surfaces/editor-preview-surface.tsx:47` (`UiDiagnostic`) vs `src/lib/document-pipeline.ts:25` (`PipelineDiagnostic`)
* **Violation:** The UI layer reinvents the diagnostic interface to normalize it, rather than the Pipeline emitting a standard interface.
* **Solution:** Unify under a single `AppDiagnostic` interface in `src/lib/types.ts`.

**5. Issue: Hardcoded Template Defaults Type**
* **Location:** `plotty.render.plugin.tsx:33` and `datatable.render.plugin.tsx:21`
* **Violation:** Both plugins redefine `ComponentTemplateDefaults`, `DatatableTemplateDefaults`, and `captionPosition` configurations locally.
* **Solution:** Import `DocumentTemplate["componentDefaults"]` directly from `src/hooks/use-document.ts`.

**6. Issue: Redundant `isRecord` Utility**
* **Location:** `plotty.render.plugin.tsx:43` and `datatable.render.plugin.tsx:28`
* **Violation:** The type guard `function isRecord(value: unknown): value is UnknownRecord` is duplicated in both rendering plugins.
* **Solution:** Move to `src/lib/utils.ts`.

**7. Issue: Duplicate ID Normalization Logic**
* **Location:** `plotty.render.plugin.tsx:64` (`normalizePlotId`) and `datatable.render.plugin.tsx:32` (`normalizeId`)
* **Violation:** Identical regex `.replace(/\.[^/.]+$/, "")` used to strip extensions from IDs.
* **Solution:** Extract to a shared `formatAssetId` utility in `src/lib/workspace.ts`.

**8. Issue: Overlapping `DocumentSource` and `WorkspaceState`**
* **Location:** `src/hooks/use-document.ts` vs `src/store/workspace.store.ts`
* **Violation:** The hook recreates the shape of the store state, leading to massive prop drilling and type repetition.
* **Solution:** The hook should map directly to standard store selectors rather than rebuilding the state object.

**9. Issue: Localized `ReferenceTarget` Type**
* **Location:** `src/lib/article-analysis.ts:25`
* **Violation:** `ReferenceTarget` is defined locally, but plugins (like datatable/plotty) need to know target source types to render correctly.
* **Solution:** Export this type to a shared definitions file.

**10. Issue: Missing Global Plotly Definitions**
* **Location:** `plotty.render.plugin.tsx:20` (`PlotlyModule`)
* **Violation:** Custom manual typing of the Plotly library instead of using the `@types/plotly.js` or the provided `src/types/plotly-js-dist-min.d.ts`.
* **Solution:** Rely on the global `d.ts` declaration.

## Phase 2: Editor Subsystem Violations (MIGRATION.md Phase 1 & 2)

**11. Issue: Monolithic Editor Component**
* **Location:** `src/components/artichales/editor/mdx-editor.tsx:44-55`
* **Violation:** Editor handles `markdown()` and `json()` instantiation directly.
* **Solution:** Move all extension logic to `src/editor/config/extensions.ts`.

**12. Issue: State Destruction on Sync**
* **Location:** `mdx-editor.tsx:169-179` (`insert: value`)
* **Violation:** Entire document is wiped and re-inserted on remote value changes, destroying CodeMirror history and selection.
* **Solution:** Implement a transaction-based diff (e.g., using `ChangeSet`).

**13. Issue: Synchronous UI Blocking onChange**
* **Location:** `mdx-editor.tsx:68`
* **Violation:** `onChangeRef.current(...)` fires on every keystroke synchronously.
* **Solution:** Wrap the `updateListener` execution in a `setTimeout` or debounce utility.

**14. Issue: Memory Leak in Editor States**
* **Location:** `mdx-editor.tsx:100` (`statesByFileRef`)
* **Violation:** Map stores `EditorState` objects indefinitely for every file touched.
* **Solution:** Implement an LRU cache or clear states when a file is deleted from the workspace.

**15. Issue: Ignored Jump Nonce**
* **Location:** `mdx-editor.tsx:192`
* **Violation:** `jumpToOffsetSignal` is a dependency, but if `jumpToOffset` is the same integer twice, the view won't always refocus properly.
* **Solution:** Check the nonce explicitly to dispatch the `scrollIntoView` effect unconditionally.

**16. Issue: Hardcoded File Resolution**
* **Location:** `mdx-editor.tsx:34` (`resolveEditorFileKind`)
* **Violation:** Uses hardcoded strings `"template.json"` instead of constants from `src/lib/workspace.ts`.
* **Solution:** Use `CORE_TEMPLATE_FILE`, `CORE_BIB_FILE`, etc.

**17. Issue: Unsafe Editor Initialization**
* **Location:** `mdx-editor.tsx:112`
* **Violation:** Initializing `EditorView` without checking if the parent DOM node is fully attached/painted can cause measurement bugs.
* **Solution:** Wrap instantiation in a `requestAnimationFrame`.

## Phase 3: Alignment & Scroll Sync (MIGRATION.md Phase 5)

**18. Issue: Broken Reverse Sync Algorithm**
* **Location:** `src/components/artichales/surfaces/editor-preview-surface.tsx:522-545`
* **Violation:** Calculates intersection manually using `getBoundingClientRect` on a button click, completely ignoring the RFC requirement for an `IntersectionObserver`.
* **Solution:** Implement `IntersectionObserver` on the `previewShellRef` with a `-45%` root margin.

**19. Issue: Manual Sync Buttons**
* **Location:** `editor-preview-surface.tsx:494-555`
* **Violation:** UI relies on "Source to preview alignment" buttons.
* **Solution:** Sync should be automatic on cursor move / scroll stop.

**20. Issue: Incomplete AST Metadata Injection**
* **Location:** `src/lib/document-pipeline.ts:316-324`
* **Violation:** `data-source-offset` is injected into headings and paragraphs, but fails to reliably inject into wrapper `div`s generated by custom plugins.
* **Solution:** Ensure the Unified hook traverses and decorates ALL HTML nodes output by plugins.

**21. Issue: Flawed Heading Map Dependency**
* **Location:** `editor-preview-surface.tsx:206`
* **Violation:** Relies on `articleHeadings` for sync, meaning alignment fails if the user is writing in a long paragraph without a nearby heading.
* **Solution:** Map blocks (paragraphs/directives), not just headings.

## Phase 4: Pipeline & Web Worker Bottlenecks

**22. Issue: Massive AST IPC Transfer**
* **Location:** `src/workers/pipeline.worker.ts:101-115`
* **Violation:** The entire Markdown AST is sent back over the Web Worker `postMessage` boundary.
* **Solution:** Prune the AST of non-serializable or unnecessary positional data before IPC transfer.

**23. Issue: Double Parsing Overhead**
* **Location:** `src/lib/document-pipeline.ts:327` & `src/lib/article-analysis.ts`
* **Violation:** `remarkParse` builds the AST, but `analyzeArticleSource` runs heavy RegExp (`/^:::[ \t]*.../gm`) over the raw string again.
* **Solution:** `analyzeArticleSource` should traverse the already-parsed AST.

**24. Issue: Naive Worker Polyfill**
* **Location:** `src/workers/pipeline.worker.ts:37-62`
* **Violation:** The stub `document` object created for the worker lacks `getElementById` and standard DOM manipulation methods required by some unified plugins, risking silent crashes.
* **Solution:** Use a robust DOM implementation like `linkedom` inside the worker.

**25. Issue: Synchronous Regex Parsing in Main Pipeline**
* **Location:** `src/lib/document-pipeline.ts:114`
* **Violation:** Frontmatter regex execution on huge documents blocks the worker thread immediately.
* **Solution:** Use `remark-frontmatter`.

**26. Issue: Untyped Hook Execution**
* **Location:** `src/lib/document-pipeline.ts:291`
* **Violation:** `const parseHook = plugin.hooks.parse as any;` bypasses TypeScript completely.
* **Solution:** Define exact function signatures in `PluginDefinition`.

**27. Issue: Poor Pipeline Error Bubbling**
* **Location:** `src/workers/pipeline.worker.ts:124`
* **Violation:** Catches generic errors and converts to strings without stack traces, making plugin debugging impossible.
* **Solution:** Pass structured error objects back via IPC.

## Phase 5: Plugin Architecture & Tiered Rendering (SPEC.md)

**28. Issue: Plotty Missing Tier 3 Memoization**
* **Location:** `src/components/artichales/plugins/plotty.render.plugin.tsx:295`
* **Violation:** `PlottyChart` is not wrapped in `React.memo`. Every keystroke in the editor re-renders the Canvas/WebGL context.
* **Solution:** Wrap with `React.memo` and use custom prop comparison.

**29. Issue: Datatable Missing Tier 3 Memoization**
* **Location:** `src/components/artichales/plugins/datatable.render.plugin.tsx:220`
* **Violation:** `DataTable` component renders inline. Changing the caption text causes the entire table to recalculate and remount.
* **Solution:** Isolate `DataTable` in a strictly memoized wrapper.

**30. Issue: Numbering Prop Drifting**
* **Location:** `plotty.render.plugin.tsx:325`
* **Violation:** `figureNo` changes trigger re-renders of the whole `DirectiveDivRender` block, violating the Tier 2 separation rule.
* **Solution:** Isolate the `<p className="title">` into a dedicated `<FigureCaption>` component that subscribes to the numbering context.

**31. Issue: State inside Render Blocks**
* **Location:** `datatable.render.plugin.tsx:162` (`const [query, setQuery] = React.useState("")`)
* **Violation:** Interactive state is kept inside the Markdown component mapper, meaning if the AST reconstructs, the search filter state is wiped out.
* **Solution:** Elevate interaction state to a stable registry or use internal IDs that persist across pipeline runs.

**32. Issue: Inefficient Citation Resolution**
* **Location:** `src/components/artichales/plugins/citation.render.plugin.tsx:90-110`
* **Violation:** Formatting (`authorYearFormatter`) runs on every render cycle for every citation link.
* **Solution:** Compute formatted citation labels in the Web Worker and pass them in a resolved map.

**33. Issue: Unsafe Datatable HTML Cell Fallback**
* **Location:** `datatable.render.plugin.tsx:43`
* **Violation:** `toCellString` falls back to raw stringification, risking rendering `[object Object]` on complex nested JSON data.
* **Solution:** Implement recursive value flattening or strictly reject nested objects.

## Phase 6: Paged.js & Print Preview Instability

**34. Issue: Paged.js Race Condition**
* **Location:** `src/components/artichales/preview/print/print-preview.tsx:135`
* **Violation:** If the user types quickly, multiple `runPagedPreview` instances trigger asynchronously, creating overlapping DOM modifications in `previewShell`.
* **Solution:** Implement an `AbortController` to cancel stale Paged.js polyfill runs.

**35. Issue: Unsafe Inline Style Injection**
* **Location:** `print-preview.tsx:125`
* **Violation:** `stagingElement.style.cssText` or direct property mutations are used.
* **Solution:** Use standard CSS classes defined in `style.css`.

**36. Issue: Missing Page Break Cleanup**
* **Location:** `print-preview.tsx:150`
* **Violation:** Limiting pages via `renderedPages.slice(PAGE_LIMIT)` forcibly removes DOM nodes without notifying Paged.js, risking memory leaks in the polyfill's internal handlers.
* **Solution:** Use Paged.js specific hooks to halt rendering.

**37. Issue: Hardcoded Page Dimensions**
* **Location:** `print-preview.tsx:55`
* **Violation:** `pageHeightPx` assumes strictly `794` or `1123`.
* **Solution:** Calculate based on actual injected CSS `size` properties.

**38. Issue: Raw CSS String Concatenation**
* **Location:** `print-preview.tsx:93`
* **Violation:** Margin box CSS is generated via massive template strings without proper CSS escaping (vulnerable to CSS injection via user frontmatter titles).
* **Solution:** Use a structured CSS-in-JS builder or strict sanitization on `printTitle`.

## Phase 7: State Management & Diagnostics

**39. Issue: O(N) Diagnostic Processing in Render**
* **Location:** `src/components/artichales/surfaces/editor-preview-surface.tsx:280-360`
* **Violation:** The UI component filters diagnostics into errors/warnings/info using heavy array operations during the render cycle.
* **Solution:** The worker should return pre-categorized `diagnostics: { errors: [], warnings: [], info: [] }`.

**40. Issue: Direct LocalStorage Access in UI**
* **Location:** `editor-preview-surface.tsx:162`
* **Violation:** Uses `localStorage.getItem(WORKSPACE_UI_STATE_KEY)` directly inside a `useEffect`.
* **Solution:** Delegate this to `src/services/storage.ts` to ensure compatibility and mockability.

**41. Issue: Unsafe Type Assertion for UI Layout**
* **Location:** `editor-preview-surface.tsx:163` (`as WorkspaceUiState`)
* **Violation:** Blindly casts JSON parsed data. If the shape changes, it crashes the layout hook.
* **Solution:** Use Zod or a custom validation function to parse local storage UI state safely.

**42. Issue: Non-Atomic File Saves**
* **Location:** `editor-preview-surface.tsx:142`
* **Violation:** `workspaceRepository.saveWorkspace(files)` fires repeatedly on debounced intervals. If the browser closes mid-save, the workspace corrupts.
* **Solution:** Implement an atomic lock or temporary staging file approach in `storage.ts`.

## Phase 8: Hardcoded Strings & Magic Numbers (AGENT.md Rules)

**43. Issue: Hardcoded Preview Targets**
* **Location:** `editor-preview-surface.tsx:112`
* **Violation:** `"print" | "web"` used as magic strings everywhere.
* **Solution:** Export an `enum PreviewTarget` from `types.ts`.

**44. Issue: Hardcoded Diagnostic Tabs**
* **Location:** `editor-preview-surface.tsx:365`
* **Violation:** Tab strings `"errors"`, `"warnings"`, `"info"` hardcoded in markup.
* **Solution:** Map over an array of diagnostic types.

**45. Issue: Hardcoded Citation Joiners**
* **Location:** `citation.render.plugin.tsx:43`
* **Violation:** `; ` and `, ` joiners hardcoded in `STYLE_REGISTRY`.
* **Solution:** Move to the branding config or template settings.

**46. Issue: Magic Timeout Delays**
* **Location:** `editor-preview-surface.tsx:102` (`300`), `editor-preview-surface.tsx:142` (`500`).
* **Violation:** Unexplained magic timeout numbers control the entire data flow.
* **Solution:** Define `PIPELINE_DEBOUNCE_MS = 300` and `SAVE_DEBOUNCE_MS = 500` constants.

## Phase 9: DOM & Asset Handling

**47. Issue: Unsafe `FileReader` Behavior**
* **Location:** `editor-preview-surface.tsx:88`
* **Violation:** Uses `readAsDataURL` on unknown file types. Massive files will cause main-thread OOM crashes.
* **Solution:** Implement file size chunking or strictly reject files over a fixed MB limit *before* calling `FileReader`.

**48. Issue: Unmanaged Object URLs**
* **Location:** `editor-preview-surface.tsx:613`
* **Violation:** `URL.createObjectURL(zipBlob)` is created during download. If the operation fails mid-way, `revokeObjectURL` is skipped, leaking memory.
* **Solution:** Wrap in a `try/finally` block.

**49. Issue: Inline Tailwind Overrides**
* **Location:** `mdx-editor.tsx:220`
* **Violation:** `[&_.cm-editor]:h-auto` and massive inline pseudo-selectors violate clean styling guidelines.
* **Solution:** Define these rules in `style.css` under a `.artichales-editor` class.

**50. Issue: Web Preview Unsafe `paddingBottom`**
* **Location:** `web-preview.tsx:32`
* **Violation:** `paddingBottom: calc(40vh * ${scale / 100})` is an arbitrary layout hack.
* **Solution:** Let the scrolling container manage its own overflow naturally without dynamic JS calc injections.

**51. Issue: Missing Error Boundaries**
* **Location:** `web-preview.tsx` / `print-preview.tsx`
* **Violation:** Neither preview surface uses a React `<ErrorBoundary>`. A single crashed plugin (like Plotly throwing a WebGL error) will white-screen the entire application.
* **Solution:** Implement and wrap Tier 3 plugin outputs and main preview components with explicit Error Boundaries.

---

### Phase 1: Editor Subsystem Hardening

**Task 1.1: Decouple CodeMirror Configuration from Editor Component**
* **The Issue:** The `mdx-editor.tsx` file is acting as a monolith rather than a pure DOM bridge. It directly contains configuration, syntax, completion, and state-switch logic. Furthermore, the configuration files are located in `src/components/artichales/editor/config/` instead of the mandated `src/editor/config/` directory.
* **Location:** `src/components/artichales/editor/mdx-editor.tsx`, `src/components/artichales/editor/config/extensions.ts`, `src/components/artichales/editor/config/completions.ts`.
* **Solution:**
    1.  Move `extensions.ts` and `completions.ts` to `src/editor/config/`.
    2.  Refactor `mdx-editor.tsx` to remove all internal configuration, syntax, and state-switching logic.
    3.  Update the editor to receive its configuration purely as props, acting solely as a React lifecycle bridge for the CodeMirror instance.

### Phase 2: Global State Decomposition

**Task 2.1: Dismantle Monolithic `useDocument` Hook and Optimize Store Selectors**
* **The Issue:** The `useDocument` hook returns a massive, monolithic `DocumentSource` object instead of utilizing a granular selector architecture. Additionally, `useWorkspaceStore()` is invoked without specific selectors, which forces the entire global state to trigger re-renders across the UI whenever any pipeline result changes.
* **Location:** `src/hooks/use-document.ts`, `src/components/artichales/surfaces/editor-preview-surface.tsx`.
* **Solution:**
    1.  Refactor `useDocument` to return specific, memoized slices of state rather than the entire object.
    2.  Update all components importing `useWorkspaceStore` to use strict selectors (e.g., `useWorkspaceStore((state) => state.ast)`).

### Phase 3: Asynchronous Pipeline Engine

**Task 3.1: Enforce Strict Worker DOM Isolation**
* **The Issue:** The web worker violates the rule of complete DOM isolation. It currently implements `window` and `document` polyfills internally. More critically, the pipeline executes React render hooks (`executeRenderHooks`) inside the worker, pulling React rendering logic into the background thread.
* **Location:** `src/workers/pipeline.worker.ts`, `src/lib/document-pipeline.ts`.
* **Solution:**
    1.  Remove DOM polyfills from the worker environment.
    2.  Refactor the pipeline to ensure that React render hooks are strictly executed on the main thread, separating the parsing/AST generation phase (worker) from the rendering phase (UI).

### Phase 4: 3-Tier Directive Memoization

**Task 4.1: Implement Strict Tiered Architecture for Directives**
* **The Issue:** The rendering logic for directives like Plotty and Datatable violates the required 3-tier memoization pattern. The numbering map is generated via AST traversal instead of reading from the store via a selector. Label logic is embedded directly in the render blocks rather than isolated. The Tier 3 visual engines (like `PlottyChart`) lack `React.memo` and improperly receive `number` and `title` props, causing heavy visual components to re-render when only the caption changes.
* **Location:** `src/components/artichales/preview/shared/markdown-content.tsx`, `src/components/artichales/plugins/plotty.render.plugin.tsx`, `src/components/artichales/plugins/datatable.render.plugin.tsx`.
* **Solution:**
    1.  **Tier 1 (Container):** Update containers to subscribe to the `referenceRegistry` in the store using the directive's identity.
    2.  **Tier 2 (Label):** Extract caption and numbering text into isolated, lightweight components.
    3.  **Tier 3 (Visual Engine):** Wrap heavy components (like `PlottyChart` and Datatable views) in `React.memo`. Ensure they only receive stable identifiers (`pluginId` and `dataPayload`) and never receive dynamic numbering or caption props.

### Phase 5: Deterministic Scroll Synchronization

**Task 5.1: Complete DOM Metadata Injection**
* **The Issue:** While `data-source-offset` is injected during the pipeline phase, it is lost during the final render for certain components. For example, the Datatable render path fails to pass node props down, resulting in missing offset attributes.
* **Location:** `src/lib/document-pipeline.ts`, `src/components/artichales/plugins/plotty.render.plugin.tsx`.
* **Solution:** Ensure the Unified/Remark visitor accurately decorates all block-level HTML elements and custom directive wrappers with the `data-source-offset` attribute before final render.

**Task 5.2: Implement Automatic Scroll Sync (Source -> Preview)**
* **The Issue:** The application relies on manual button clicks and heading-ID matching to align the preview, rather than the automatic, cursor-driven `[data-source-offset]` query algorithm defined in the RFC.
* **Location:** `src/components/artichales/surfaces/editor-preview-surface.tsx`.
* **Solution:** Implement a `useEffect` that listens to cursor offset changes in the editor, finds the nearest DOM element in the preview with a corresponding `data-source-offset`, and automatically calls `scrollIntoView`.

**Task 5.3: Implement Reverse Scroll Sync via IntersectionObserver (Preview -> Source)**
* **The Issue:** There is no `IntersectionObserver` implemented for reverse scrolling. The current implementation relies on a manual button trigger to find the first visible heading. Furthermore, the editor intentionally ignores the `jumpToOffsetSignal` dependency, meaning consecutive jumps to the same offset fail to trigger.
* **Location:** `src/components/artichales/surfaces/editor-preview-surface.tsx`, `src/components/artichales/editor/mdx-editor.tsx`.
* **Solution:**
    1.  Attach an `IntersectionObserver` to the preview container with a strict center-screen band.
    2.  Extract the `data-source-offset` from the intersecting block and update the editor's jump state.
    3.  Fix the `useEffect` in `mdx-editor.tsx` to properly react to the `jumpToOffsetSignal` (nonce) so that repeated scroll events to the same position are honored.

---


### Issue 1: Paged.js Header/Footer Failure ("I can not see any header or footer")
* **The Root Cause:** The `print-preview.tsx` attempts to inject headers and footers by dynamically generating a massive CSS string with `@page { @top-left { content: ... } }`. However, it passes an empty array `[]` as the stylesheet parameter to `previewer.preview(sourceElement.innerHTML, [], stagingElement)`. Paged.js is highly unreliable when trying to parse `@page` rules from an inline `<style>` tag buried inside the `innerHTML` string. Furthermore, the `pagination.service.ts` which is designed to handle complex `{pageNumber}` tokens is completely orphaned and never imported.
* **The Fix:**
    1.  Extract the `pagedCss` string in `print-preview.tsx` and pass it as a `Blob` URL or a structured stylesheet array directly into the second argument of `previewer.preview()`.
    2.  Wire `pagination.service.ts` into `print-preview.tsx` to handle the DOM node generation for headers/footers instead of relying solely on raw CSS `content` string replacement.

### Issue 2: `ref:` Resolution and Rendering Crash ("ref: could not render properly")
* **The Root Cause:** There are two converging bugs destroying references. First, there is a data-attribute mismatch: the datatable parser injects `data-datatable-source` into the AST, but the Markdown renderer attempts to read `data-table-source` to extract the numbering index. Consequently, datatable references fail to resolve and render as `?`. Second, the paragraph renderer leaks the raw React `node` object into the DOM (`<p node="[object Object]">`). This corrupts the HTML structure, causing Paged.js and the browser's HTML parser to choke on inline elements like `<cite>` and `<a>` contained within those paragraphs.
* **The Fix:**
    1.  Standardize the attribute key to `data-datatable-source` across all parser and render plugins.
    2.  In `src/components/artichales/preview/shared/markdown-content.tsx`, explicitly destructure and omit the `node` prop from being passed down to the HTML `<p>` element.

### Issue 3: Single Page Truncation ("print only show 1 page not the all pages")
* **The Root Cause:** In `print-preview.tsx`, CSS is injecting standard multi-column layout properties directly onto the document body: `.paged-print-content .artichales__body { column-count: 2; }`. When Paged.js's polyfill engine attempts to calculate page breaks, standard CSS `column-count` completely breaks its measuring algorithm. It fails to fragment the flex/column layout across physical pages, causing the engine to overflow invisibly or collapse the entire document onto Page 1.
* **The Fix:**
    1.  Remove `column-count` from `.artichales__body` in the Paged.js CSS configuration.
    2.  Paged.js requires multi-column layouts to be handled via specific CSS Grid specifications defined at the `@page` margin box level, or by disabling standard column-count and letting Paged.js handle the fragmentation natively.

### Issue 4: The Doppelgänger Bug ("2 abstract, 2 first page one of one column... WTF?")
* **The Root Cause (Duplicate Titles & Abstracts):** The `DocumentRenderContent` component automatically prepends a Title Block and an Abstract Block derived from the YAML `frontmatter` via `title.core.plugin.tsx`. If your `article.mda` source file *also* contains a manual `# Title` or `:::abstract` block, the system blindly renders both the auto-generated core block and your manual block, resulting in duplicates.
* **The Root Cause (Duplicate/Colliding Pages):** The print preview DOM holds the raw source HTML (`pagedSourceRef`) and the Paged.js output (`pagedPreviewRef`) in the same container. The source element is hidden using `opacity-0` and `left-[200vw]` instead of `display: none`. Because of the invalid paragraph nodes (from Issue 2) and the `column-count` crash (from Issue 3), Paged.js sometimes fails to clean up its clone tree, resulting in the user seeing the 1-column source layout bleeding through or stacking alongside the broken 2-column Paged.js output.
* **The Fix:**
    1.  Implement an AST validation step in the pipeline: If `ast` contains a `heading[depth=1]` or an `abstract` directive, suppress the `title.core` and `abstract.core` frontmatter auto-injection.
    2.  Change the wrapper for `pagedSourceRef` to use `display: none` after `previewer.preview()` resolves, ensuring the source DOM cannot interfere with the visual layout of the preview shell.

---

### What Does "`template.json` Single Source of Truth" Mean?

In a system like Artichales, there are two completely separate visual domains:
1.  **The Application UI:** The buttons, sidebars, ResizablePanels, and the CodeMirror editor shell.
2.  **The Document Preview:** The actual academic paper being rendered (Web or Print).

**The Rule:** The Application UI is styled by `src/style.css` (Tailwind). But the **Document Preview** must be styled *exclusively* by the configuration inside `template.json`.

"Single Source of Truth" means that if a user wants their document to have 3 columns, a specific font, and a specific margin, they change `template.json`. The React components (`web-preview.tsx`, `print-preview.tsx`, and all plugin renderers) should **never** contain hardcoded CSS, magic numbers, or inline style fallbacks for the document content. They must blindly read from the template.

---

### Why the Current Codebase is Fundamentally Broken (The Audit I Missed)

The current codebase violently breaks this rule. It mixes application CSS with document CSS, and litters the React components with hardcoded magic numbers that override the `template.json`.

Here is the highly detailed addition to your `FIX.md` addressing the styling architectural failures.

### Phase 10: Styling Architecture & Template Boundary Violations

**Task 10.1: Hardcoded Fallbacks Defeating the Template**
* **The Issue:** Components are hardcoding visual fallbacks inside the JavaScript, which overrides or ignores the `template.json` if a value is missing. This defeats the purpose of a template-driven system.
* **Location:** * `src/components/artichales/preview/web/web-preview.tsx:28`: `const containerWidth = webLayout.containerWidth || "800px";`
    * `src/components/artichales/preview/web/web-preview.tsx:29`: `const containerClass = webLayout.containerClass || "shrink-0 rounded-xl..."`
    * `src/components/artichales/plugins/plotty.render.plugin.tsx:145`: `height: height ? \`\${height}px\` : "520px"`
* **Solution:** 1. Remove all string-based styling fallbacks from the React components.
    2. If a value is missing from the active `template.json`, the system must fall back to a deeply merged **Default Template Object** loaded at the pipeline level, *not* inside the component render cycle.

**Task 10.2: Application UI Leaking into Document Previews**
* **The Issue:** `src/style.css` and Tailwind classes are being used to style the inside of the academic document. If a user exports the document HTML or changes the `template.json` colors, the Tailwind classes (like `bg-card`, `border-border`, `text-muted-foreground`) will either break outside the app environment or stubbornly refuse to change.
* **Location:** * `src/components/artichales/preview/web/web-preview.tsx`: Uses Tailwind classes like `bg-background`, `bg-card`, `border-border` directly on the document container.
    * `src/components/artichales/plugins/datatable.render.plugin.tsx:220`: Uses `border-border`, `overflow-x-auto` via Tailwind classes.
* **Solution:** 1. The preview containers must be wrapped in an isolated boundary (like an iframe, or a strict CSS `all: revert` shadow-DOM wrapper).
    2. The pipeline must generate a `<style>` block containing standard CSS variables (e.g., `--doc-bg`, `--doc-text`) derived *only* from `template.json`. Plugins must use these variables, not Tailwind utility classes.

**Task 10.3: `style.css` Pollution**
* **The Issue:** Because the boundary is blurred, `style.css` likely contains overrides to force CodeMirror or Markdown elements to behave, rather than letting the specific environments manage themselves. (As seen in the `mdx-editor.tsx` where massive inline `[&_.cm-editor]` tailwind classes are used instead of proper CSS).
* **Location:** `src/components/artichales/editor/mdx-editor.tsx:220`
* **Solution:** Create isolated, scoped CSS modules for complex third-party shells (like CodeMirror) instead of dumping arbitrary selector chains into the React `className` prop.

**Task 10.4: Hardcoded Print Measurements**
* **The Issue:** `print-preview.tsx` attempts to render the preview background gradient using hardcoded magic numbers for A4 paper sizes, ignoring the `template.json` page size configuration.
* **Location:** `src/components/artichales/preview/print/print-preview.tsx:55`: `const pageHeightPx = pageConfig?.orientation === "landscape" ? 794 : 1123;`
* **Solution:** The background grid/gradient measurement must be dynamically calculated based on the exact `size` (e.g., Letter, A5, Custom) declared in `template.json`, converted accurately to pixels based on standard DPI, rather than hardcoding A4 dimensions.


---

### 1. `UnknownRecord` (Exact Clone)
This generic utility type is manually redefined in multiple plugin files instead of being imported from a shared `types.ts` or `utils.ts`.

* **Location 1:** `src/components/artichales/plugins/plotty.render.plugin.tsx`
    ```typescript
    type UnknownRecord = Record<string, unknown>;
    ```
* **Location 2:** `src/components/artichales/plugins/datatable.render.plugin.tsx`
    ```typescript
    type UnknownRecord = Record<string, unknown>;
    ```

### 2. `DatatableIndexMap` (Exact Clone)
The map used to resolve numbering for tables is duplicated because `plotty` needs to know about datatables to avoid overlapping references, but neither imports a shared definition.

* **Location 1:** `src/components/artichales/plugins/plotty.render.plugin.tsx`
    ```typescript
    type DatatableIndexMap = Record<string, number>;
    ```
* **Location 2:** `src/components/artichales/plugins/datatable.render.plugin.tsx`
    ```typescript
    type DatatableIndexMap = Record<string, number>;
    ```

### 3. Template Component Defaults (Fragmented Duplication)
Instead of importing the `DocumentTemplate` definition from `src/hooks/use-document.ts`, the plugins manually recreate the schema for template component configurations.

* **Location 1:** `src/components/artichales/plugins/plotty.render.plugin.tsx`
    ```typescript
    type ComponentTemplateDefaults = {
    	figure?: {
    		captionPosition?: "top" | "bottom";
    		defaultSpan?: "column" | "page";
    		spacingBefore?: string;
    		spacingAfter?: string;
    	};
    	table?: { /* ... identical table props ... */ };
    };
    ```
* **Location 2:** `src/components/artichales/plugins/datatable.render.plugin.tsx`
    ```typescript
    type DatatableTemplateDefaults = {
    	captionPosition?: "top" | "bottom";
    	defaultSpan?: "column" | "page";
    	spacingBefore?: string;
    	spacingAfter?: string;
    };
    ```

### 4. Pipeline Results vs. Store Payload (Structural Clone)
The workspace store manually duplicates the entire return signature of the document pipeline. If a field is added to the pipeline, the store type must be manually updated to match.

* **Location 1 (Source):** `src/lib/document-pipeline.ts` (`export type PipelineResult = { ... }`)
* **Location 2 (Clone):** `src/store/workspace.store.ts`
    ```typescript
    export type PipelineResultPayload = {
    	ast: Root | null;
    	content: string;
    	frontmatter: Record<string, unknown>;
    	citations: Record<string, CitationEntry>;
    	validatedBibEntries: Record<string, ValidatedBibEntry>;
    	plots: Record<string, unknown>;
    	template: TemplateFileResolved;
    	citationStyle: string;
    	referenceRegistry: Record<string, ResolvedReference>;
    	referenceTargets: ReferenceSelectorTarget[];
    	diagnostics: PipelineDiagnostic[];
    	activePluginIds: { /* ... */ };
    };
    ```

### 5. Diagnostic Schemas (Triplicate Overlap)
The system has three separate but overlapping interfaces for errors, forcing the UI to manually recast them.

* **Location 1:** `src/lib/document-pipeline.ts` defines `PipelineDiagnostic` (has `code`, `severity`, `source`, `stage`, `fileName`).
* **Location 2:** `src/lib/article-analysis.ts` defines `ArticleAnalysisDiagnostic` (has `code`, `severity`, `message`, `source`, `pluginId`).
* **Location 3:** `src/components/artichales/surfaces/editor-preview-surface.tsx` defines a custom `UiDiagnostic` to try and normalize the previous two before rendering.
    ```typescript
    type UiDiagnostic = {
    	severity: "error" | "warning" | "info";
    	source: string;
    	message: string;
    	details?: string;
    	line?: number;
    	column?: number;
    	offset?: number;
    	fileName?: string;
    };
    ```
  
---


### Phase 12: Eradication of Legacy Fallbacks & Compat Blocks

**Task 12.1: The Web Worker DOM Polyfill (The "React Compat" Hack)**
* **The Issue:** The Web Worker contains a massive, manual polyfill block to trick libraries into thinking they are running on the main browser thread. It injects fake React Refresh variables (`$RefreshSig$`), a fake `window`, a fake `navigator`, and a completely stubbed `document` object with dummy `createElement` methods. This is a dangerous legacy hack used to force UI-bound React plugins to execute inside the background worker.
* **Location:** `src/workers/pipeline.worker.ts:28-83` (Inside `ensureWorkerDocumentPolyfill()`)
* **The Legacy Code:**
  ```typescript
  if (typeof globalAny.$RefreshSig$ === "undefined") {
      globalAny.$RefreshSig$ = () => (type: unknown) => type;
  }
  // ... window, self, location stubs ...
  globalAny.document = {
      createElement: createStubElement,
      querySelector: () => null,
      // ...
  };
  ```
* **Solution:** Delete `ensureWorkerDocumentPolyfill()` completely. Web Workers must remain strictly isolated from the DOM. If a unified/remark plugin requires `document` or React hooks to parse the AST, that plugin is architecturally invalid for the worker thread and must be rewritten or executed on the main thread.

**Task 12.2: Paged.js ESM/CJS Module Resolution Fallback**
* **The Issue:** There is a brute-force module resolution fallback designed to guess how Paged.js was exported (CommonJS vs. ES Modules). This is a legacy band-aid for older bundlers (like Webpack 4) and shouldn't exist in a modern Vite/Bun environment.
* **Location:** `src/components/artichales/preview/print/print-preview.tsx:23-41` (`resolvePagedPreviewerFactory`)
* **The Legacy Code:**
  ```typescript
  const candidate = module as { Previewer?: new () => PagedPreviewerInstance; default?: { Previewer?: new () => PagedPreviewerInstance; }; };
  const previewerCtor = candidate.Previewer;
  if (previewerCtor) { return () => new previewerCtor(); }
  const defaultPreviewerCtor = candidate.default?.Previewer;
  if (defaultPreviewerCtor) { return () => new defaultPreviewerCtor(); }
  ```
* **Solution:** Remove the `resolvePagedPreviewerFactory` function. Configure the bundler (Vite/Bun) to resolve the Paged.js ESM export correctly, and instantiate it directly: `import { Previewer } from "pagedjs"; const previewer = new Previewer();`.

**Task 12.3: Untyped Catch Block Fallbacks**
* **The Issue:** In the worker, if the pipeline fails, the error is caught, downgraded to a generic string, and the stack trace is swallowed. This is a legacy fallback to prevent older versions of the app from crashing entirely, but it makes debugging pipeline failures impossible.
* **Location:** `src/workers/pipeline.worker.ts:124`
* **The Legacy Code:**
  ```typescript
  catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      self.postMessage({ type: "PIPELINE_ERROR", requestId: event.data.requestId, error: errorMessage });
  }
  ```
* **Solution:** Remove the string fallback. Serialize the actual `Error` object (or at least `error.stack` and `error.name`) and pass the structured error back to the UI so it can be rendered properly in the diagnostic panels.

---


### Phase 13: CodeMirror Editor Performance Remediation

The current implementation of `MdxEditor` is highly inefficient and creates memory leaks and unnecessary re-evaluations, especially regarding autocompletion and state caching.

**Task 13.1: Eliminate Redundant Autocompletion Reconfiguration (The Re-render Loop)**
* **The Issue:** The `useEffect` on `src/components/artichales/editor/mdx-editor.tsx:143-167` unconditionally calls `view.dispatch({ effects: [ ...reconfigure... ] })` whenever `completions` or `fileName` changes. However, `completions` is an object (`{ bibKeys: [], referenceSelectors: [], directiveNames: [] }`). In React, passing an object literal as a prop means its reference changes on *every single parent render*. This forces CodeMirror to destroy and rebuild its entire autocompletion tree (a very heavy operation) constantly, even if the user just typed a single letter.
* **The Fix:**
  1.  The parent component MUST memoize the `completions` prop deeply (e.g., using a deep-compare custom hook or pre-formatting the array in the worker).
  2.  In `MdxEditor`, do not reconfigure the language/completion compartment unless the deep values of `completions` or the `fileName` have actually changed.

**Task 13.2: Prevent State Destruction on File Switch (The "Existing State" Bug)**
* **The Issue:** In the initialization `useEffect` (`mdx-editor.tsx:103-141`), when `fileName` changes, the code attempts to retrieve the existing state from `statesByFileRef.current.get(fileName)`. If it exists, it assigns it to `nextState`. However, the dependency array for this effect is `[completions, fileName, value]`. Because `value` changes on every keystroke, and `completions` changes on every parent render, this effect fires constantly. This logic belongs in a file-switching specific effect, not an effect tied to text input.
* **The Fix:**
  1.  Separate the CodeMirror mounting/initialization logic from the file-switching logic.
  2.  Ensure `value` is NOT a dependency for the mounting/file-switching effect. The `value` prop should only be handled by the specific synchronization effect (`mdx-editor.tsx:169-178`).

**Task 13.3: Optimize Dynamic Completion Generation**
* **The Issue:** `buildArticleCompletions` in `completions.ts` calls `.map()` three times to build lists of hundreds of reference options and citation keys. Because `MdxEditor` constantly reconfigures the extension (due to Task 13.1), this mapping operation runs repeatedly on the main thread, choking the CPU during typing.
* **The Fix:** Move the mapping logic inside `buildArticleCompletions` into a memoized function or perform the mapping in the Web Worker before passing the `EditorCompletions` payload to the UI. The UI should just receive a pre-formatted array of `Completion` objects.

**Task 13.4: Fix the Diff-Based Dispatch (Full Document Overwrite)**
* **The Issue:** The synchronization effect (`mdx-editor.tsx:169-178`) uses `changes: { from: 0, to: currentView.state.doc.length, insert: value }`. Even though there is a `hasFocus` check, if a pipeline update comes back (e.g., a formatting hook alters the value remotely) while the user briefly clicks away from the editor, the entire document is wiped and replaced. This destroys the undo/redo history within CodeMirror.
* **The Fix:** Implement a true text diffing algorithm (or use CodeMirror's built-in transaction methods) to apply only the actual character changes, rather than replacing the entire string from index 0 to `length`.

**Task 13.5: Clean up Magic Numbers and Inline Styles**
* **The Issue:** The `mdx-editor.tsx` file contains a massive string of inline Tailwind overrides (`[&_.cm-editor]:h-auto...`) and hardcoded magic strings (`"template.json"`, `"article.mda"`) inside `resolveEditorFileKind`.
* **The Fix:**
  1.  Move the complex Tailwind selectors into a dedicated class in `src/style.css` (e.g., `.ac-editor-container`).
  2.  Import `CORE_TEMPLATE_FILE`, `CORE_BIB_FILE`, and `CORE_ARTICLE_FILE` from `src/lib/workspace-default-files.ts` instead of using hardcoded strings in the resolution logic.

---

Here is the detailed task breakdown to fix the catastrophic memoization failures and main-thread blocking issues currently degrading the editor's performance.

### Phase 14: Strict Memoization & Main-Thread Optimization

The current implementation completely bypasses React's rendering optimizations, causing the entire Markdown AST and heavy visual plugins to be re-evaluated and re-drawn on every single keystroke.

**Task 14.1: Eradicate the `content` Prop and Memoize `MarkdownContent`**
* **The Issue:** `DocumentRenderContent` passes the raw `document.content` string down to `MarkdownContent`, which receives it as `content: _content` but never uses it. Because this string changes on every keystroke, React is forced to re-render the entire document tree, ignoring any internal memoization. Furthermore, the `MarkdownContent` component itself is a standard function, not a memoized component.
* **The Fix:**
  1.  Remove `content={document.content}` from the `<MarkdownContent />` invocation in `src/components/artichales/preview/shared/document-render-content.tsx`.
  2.  Remove `content: _content` from the `MarkdownContentProps` and destructured arguments.
  3.  Wrap the entire component export in `React.memo`. Because the `ast` object reference changes on every pipeline run, you MUST provide a custom deep-comparison function (e.g., using `fast-deep-equal`) as the second argument to `React.memo`.
      *Example:* `export const MarkdownContent = React.memo(function MarkdownContent(...) { ... }, (prev, next) => isEqual(prev.ast, next.ast) && prev.target === next.target);`

**Task 14.2: Remove Main-Thread AST Cloning (The UI Freezer)**
* **The Issue:** Inside `MarkdownContent`, the `renderedContent` `useMemo` block executes `globalThis.structuredClone(ast)` on the main thread during the render cycle. Copying a massive AST JSON object blocks the UI thread completely, causing typing latency.
* **The Fix:**
  1.  Remove the `structuredClone` entirely from the React render path.
  2.  If `stripDuplicatePrintLeadBlocks` needs to mutate the AST specifically for the `"print"` target, this mutation MUST happen inside the Web Worker (`pipeline.worker.ts`) before the AST is posted back to the main thread. The UI should receive a strictly read-only, ready-to-render AST.

**Task 14.3: Fix Shallow-Compare `useMemo` Failures**
* **The Issue:** The index calculators (`plotIndexById`, `datatableIndexById`) are wrapped in `React.useMemo(() => { ... }, [ast])`. However, because the Web Worker returns a fresh AST object reference on every successful parse, `[ast]` will fail the shallow equality check every time. This forces an O(N) traversal of the entire document tree on every keystroke.
* **The Fix:**
  1.  Move the calculation of `plotIndexById`, `datatableIndexById`, and `refIndexById` entirely into `src/lib/article-analysis.ts` (executed in the worker).
  2.  Pass these pre-calculated, flat dictionary objects to `MarkdownContent` as simple props.
  3.  If they must remain in the UI layer, use a custom `useDeepCompareMemo` hook that serializes or deeply compares the `ast` before triggering a recalculation.

**Task 14.4: Enforce Tier 3 Component Memoization (Plotty & Datatable)**
* **The Issue:** As dictated by the SPEC, heavy visual components must be strictly isolated to prevent re-renders when surrounding text or numbering changes. Currently, `PlottyChart` and `DataTable` are rendering in-line without memoization.
* **The Fix:**
  1.  In `src/components/artichales/plugins/plotty.render.plugin.tsx`, wrap the inner chart component: `const MemoizedPlottyChart = React.memo(PlottyChart, (prev, next) => prev.plot.id === next.plot.id);`
  2.  In `src/components/artichales/plugins/datatable.render.plugin.tsx`, extract the Shadcn `<DataTable>` block into a dedicated `DatatableVisual` component and wrap it in `React.memo`.
  3.  Ensure that props like `caption`, `figureNo`, and `tableNo` are ONLY passed to a lightweight Tier 2 wrapper component (`<FigureCaption>`), and NEVER passed down into the Tier 3 memoized visual components.