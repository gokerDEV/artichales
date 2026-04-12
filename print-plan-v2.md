# Artichales Print Pipeline Plan v2 — Updated

## Goal

Stabilize the isolated print/export pipeline and fix the current regressions after the new print-tab architecture was introduced.

This revision locks the following decisions:

- **Paged.js is the required print engine**
- `plotty:plot_1` resolves to `#plot-plot_1`
- `datatable:datatable_1` resolves to `#datatable-datatable_1`
- `abstract` keeps its inner children
- data-driven directives such as `plotty` and `datatable` may still normalize to empty children plus metadata

This plan is based on the current `v1` branch structure and focuses on these reported problems:

1. Header, footer, and margin content are not visible in the default sample
2. Refs do not parse and render properly
3. Print opens a new tab and shows an error message
4. Title/author and first-page content appear duplicated
5. Abstract is missing

---

## Locked Architectural Decisions

## 1. Print engine

The print/export pipeline must use **Paged.js** end to end.

Implications:

- Do not introduce a non-Paged.js final pagination engine
- Do not promote the heuristic page-tree logic to the final export path
- Keep the isolated print tab architecture
- Keep the preview/export flow centered on:
    - `src/components/artichales/preview/print/paged-preview-engine.ts`
    - `src/components/artichales/preview/print/print-document-renderer.tsx`
    - `src/print/print-app.tsx`

## 2. Canonical anchor contract

The reference target IDs are fixed as follows:

- `abstract` -> `#abstract`
- `plotty:<key>` -> `#plot-<key>`
- `datatable:<key>` -> `#datatable-<key>`

Examples:

- `plotty:plot_1` -> `#plot-plot_1`
- `datatable:datatable_1` -> `#datatable-datatable_1`

These IDs must be used consistently in:

- the analysis layer
- the ref renderer
- directive renderers
- caption/ref cross-link generation

## 3. Directive normalization behavior

The normalization policy is fixed as follows:

### Prose directives
- `abstract` keeps its inner children
- it may also preserve normalized metadata such as `data-directive-raw`

### Data-driven directives
- `plotty` may normalize to empty children plus metadata
- `datatable` may normalize to empty children plus metadata

This means the normalizer must become directive-aware instead of treating every directive the same way.

---

## Current Root Causes

### 1. Header, footer, and margin content are not visible

### Problem
The codebase currently mixes two print systems:

- running DOM plugins for header/footer/margins
- generated `@page` margin-box CSS inside the print renderer

The isolated print direction is correct, but the implementation is split and incomplete.

### Updated decision
Because Paged.js is mandatory, **the primary print header/footer/margin system should be CSS-based through Paged.js `@page` rules and margin boxes**.

### Action
- Keep Paged.js margin-box generation as the primary mechanism
- Do not rely on a parallel running-elements DOM system for the active print path
- Centralize generated print CSS into one shared builder
- Update the default sample so header/footer/side margins are visibly demonstrated

---

### 2. Refs do not parse and render properly

### Problem A — parser support is incomplete
The parser transforms `[cite:...]` and `[ref:...]`, but not `[caption:...]`.

### Problem B — rendered IDs do not match resolved hrefs
The analysis layer resolves directive refs, but directive renderers do not currently emit the locked canonical IDs.

### Problem C — label families and anchor families are mixed
The system should separate:
- **display family** for labels such as Figure/Table
- **anchor family** for IDs such as `plot-*` and `datatable-*`

### Updated decision
The anchor contract is fixed and technical:

- plotty targets use `plot-*`
- datatable targets use `datatable-*`

Human-readable labels may still remain semantic:

- plotty displayed as Figure
- datatable displayed as Table

### Action
Create a consistent reference contract with these exact outputs:

#### Canonical href outputs
- abstract -> `#abstract`
- plotty `plot_1` -> `#plot-plot_1`
- datatable `datatable_1` -> `#datatable-datatable_1`

#### Files to update
- `src/lib/article-analysis.ts`
- `src/components/artichales/plugins/citation.parser.plugin.tsx`
- `src/components/artichales/plugins/ref.render.plugin.tsx`
- `src/components/artichales/plugins/abstract.directive.plugin.tsx`
- `src/components/artichales/plugins/plotty.directive.plugin.tsx`
- `src/components/artichales/plugins/datatable.directive.plugin.tsx`

#### Required changes
1. Add caption-token parser support
2. Generate real hrefs for short refs such as `[ref:abstract]`
3. Make directive renderers emit matching target IDs
4. Keep display labels semantic while keeping anchors technical

---

### 3. Print opens a new tab and shows an error message

### Most likely cause
The error message is produced when the print page cannot retrieve the stored print job.

### Current weak points
- storage handoff is fragile
- several failure modes collapse into one generic error UI
- `noopener,noreferrer` weakens later close/cleanup behavior

### Action
Update these files:

- `src/components/artichales/preview/print/launch-print-export.ts`
- `src/services/print-job.repository.ts`
- `src/print/print-app.tsx`

### Required changes
1. Introduce structured print-job states:
    - created
    - consumed
    - expired
    - failed
2. Add explicit user-facing error categories:
    - missing job id
    - job not found
    - job expired
    - storage unavailable
    - document build failed
3. Remove `noreferrer`
4. Keep only the minimum window features necessary
5. Delay job cleanup until after successful print completion or explicit cancellation

---

### 4. Title/author are doubled and first-page content appears duplicated

### Most likely cause
The print renderer keeps two live trees at the same time:

- hidden source tree
- visible Paged.js output tree

This pattern exists in both:
- `src/components/artichales/preview/print/print-preview.tsx`
- `src/components/artichales/preview/print/print-document-renderer.tsx`

That is acceptable during staging, but it should not remain true once pagination completes.

### Additional contributor
`src/print/main.tsx` mounts the print app inside `React.StrictMode`, which can duplicate effect execution in development.

### Action
Update:

- `src/components/artichales/preview/print/print-document-renderer.tsx`
- `src/components/artichales/preview/print/paged-preview-engine.ts`
- `src/print/main.tsx`

### Required changes
1. Remove `React.StrictMode` from the print entry
2. Move Paged.js staging into a detached or temporary host
3. Ensure only final `.pagedjs_pages` remains in the visible print DOM after pagination completes

---

### 5. Abstract is missing

### Root cause
The directive normalizer currently empties children for every directive.

That breaks `abstract`, because `AbstractRender` expects to render `children`.

### Updated decision
`abstract` must preserve inner children.

### Action
Update:

- `src/lib/artichales.utils.ts`
- `src/components/artichales/plugins/abstract.directive.plugin.tsx`

### Required changes
1. Make normalization directive-aware
2. Preserve children for `abstract`
3. Add `id="abstract"` to the rendered abstract block
4. Continue allowing metadata-driven directives to normalize to empty children

---

## New Implementation Plan

## Phase 1 — Lock the Paged.js-first print path

### 1.1 Declare Paged.js as the only active print engine
**Files**
- `src/components/artichales/preview/print/paged-preview-engine.ts`
- `src/components/artichales/preview/print/print-document-renderer.tsx`
- `src/print/print-app.tsx`

**Work**
- Treat Paged.js as the final pagination/render engine
- Do not introduce an alternate final page builder
- Keep isolated print tab + Paged.js as the standard export flow

### 1.2 Centralize generated print CSS
**New file**
- `src/components/artichales/preview/print/build-print-stylesheet.ts`

**Work**
Move all generated print CSS from:
- `print-preview.tsx`
- `print-document-renderer.tsx`

into one builder.

The builder should produce:
- `@page` rules
- margin box rules
- column layout rules
- preview-only helper rules if necessary

### 1.3 Mount the stylesheet explicitly
**New file**
- `src/components/artichales/preview/print/use-print-stylesheet.ts`

**Work**
Mount generated print CSS into the print document head instead of embedding it as inline body HTML.

---

## Phase 2 — Make directive normalization type-aware

### 2.1 Split directive normalization by directive type
**File**
- `src/lib/artichales.utils.ts`

**Work**
Replace the generic normalization behavior with directive-specific rules.

### Required behavior
#### `abstract`
- preserve children
- preserve metadata fields
- keep `data-directive="abstract"`

#### `plotty`
- keep metadata
- allow `children = []`

#### `datatable`
- keep metadata
- allow `children = []`

### 2.2 Update abstract rendering
**File**
- `src/components/artichales/plugins/abstract.directive.plugin.tsx`

**Work**
- render preserved children
- mount `id="abstract"`
- keep the existing abstract presentation wrapper

---

## Phase 3 — Freeze the reference contract

### 3.1 Add caption parser support
**File**
- `src/components/artichales/plugins/citation.parser.plugin.tsx`

**Work**
Add parsing for:
- `[caption:type:key](Title)`

This parser should create explicit AST nodes or properties that can be rendered consistently with refs/citations.

### 3.2 Update reference analysis
**File**
- `src/lib/article-analysis.ts`

**Work**
Use the locked canonical href contract:

- abstract -> `#abstract`
- plotty:key -> `#plot-key`
- datatable:key -> `#datatable-key`

### Important rule
Separate:
- **display label family**: Figure / Table / Abstract / Section
- **anchor family**: plot / datatable / abstract / caption

### 3.3 Emit matching IDs from directive renderers
**Files**
- `src/components/artichales/plugins/abstract.directive.plugin.tsx`
- `src/components/artichales/plugins/plotty.directive.plugin.tsx`
- `src/components/artichales/plugins/datatable.directive.plugin.tsx`

**Work**
Render exact IDs:

- abstract -> `id="abstract"`
- plotty `plot_1.json` -> `id="plot-plot_1"`
- datatable `datatable_1.json` -> `id="datatable-datatable_1"`

### 3.4 Update ref renderer
**File**
- `src/components/artichales/plugins/ref.render.plugin.tsx`

**Work**
Make the renderer consume only the canonical `resolvedReferences` contract. It must not independently invent IDs or labels.

---

## Phase 4 — Remove competing header/footer mechanisms

### 4.1 Reduce the active print path to Paged.js CSS margin boxes
**Files**
- `src/components/artichales/plugins/header.render.plugin.tsx`
- `src/components/artichales/plugins/footer.render.plugin.tsx`
- `src/components/artichales/plugins/margin-left.render.plugin.tsx`
- `src/components/artichales/plugins/margin-right.render.plugin.tsx`
- `src/components/artichales/plugins/plugin.registry.ts`

**Work**
- remove or retire these from the active print path
- keep them only if intentionally preserved for future experimentation
- do not let them compete with the Paged.js `@page` system

### 4.2 Keep `DocumentRenderContent` focused on document body composition
**File**
- `src/components/artichales/preview/shared/document-render-content.tsx`

**Work**
Leave this component focused on:
- title
- author
- article body
- references

Do not overload it with a second running-header/footer mechanism.

---

## Phase 5 — Stabilize print-job handoff

### 5.1 Improve repository diagnostics
**File**
- `src/services/print-job.repository.ts`

**Work**
Add:
- structured outcomes
- better expiration handling
- optional development logging

### 5.2 Improve print page error handling
**File**
- `src/print/print-app.tsx`

**Work**
Replace the generic error UI with explicit states.

### 5.3 Adjust new-tab launch behavior
**File**
- `src/components/artichales/preview/print/launch-print-export.ts`

**Work**
- remove `noreferrer`
- keep the open-tab flow
- make the child print page closeable after completion if allowed

---

## Phase 6 — Eliminate duplicated live trees

### 6.1 Simplify print document renderer
**File**
- `src/components/artichales/preview/print/print-document-renderer.tsx`

**Work**
Once pagination is complete:
- remove source staging tree from the live document
- keep only the final paginated output visible

### 6.2 Use detached staging
**File**
- `src/components/artichales/preview/print/paged-preview-engine.ts`

**Work**
Run Paged.js against:
- a detached host
- or a temporary staging root that is destroyed immediately after output extraction

### 6.3 Remove StrictMode from print entry
**File**
- `src/print/main.tsx`

**Work**
Use a plain root render in the isolated print app.

---

## Phase 7 — Make the default sample prove the system works

### 7.1 Update default template sample
**File**
- `src/workspace/defaults/template.json`

**Work**
Use visible sample values for:
- first-page header
- default-page header
- footer page number
- left margin text
- right margin text

These must be visible under the Paged.js margin-box system.

### 7.2 Update default article sample
**File**
- `src/workspace/defaults/article.mda`

**Work**
Ensure the default sample exercises:
- abstract
- citations
- `[ref:abstract]`
- `[ref:plotty:plot_1]`
- `[ref:datatable:datatable_1]`
- section or caption refs
- multipage content

---

## File-Level Change List

## Must update
- `src/lib/artichales.utils.ts`
- `src/components/artichales/plugins/abstract.directive.plugin.tsx`
- `src/components/artichales/plugins/citation.parser.plugin.tsx`
- `src/lib/article-analysis.ts`
- `src/components/artichales/plugins/ref.render.plugin.tsx`
- `src/components/artichales/plugins/plotty.directive.plugin.tsx`
- `src/components/artichales/plugins/datatable.directive.plugin.tsx`
- `src/components/artichales/preview/print/print-document-renderer.tsx`
- `src/components/artichales/preview/print/paged-preview-engine.ts`
- `src/components/artichales/preview/print/launch-print-export.ts`
- `src/services/print-job.repository.ts`
- `src/print/print-app.tsx`
- `src/print/main.tsx`
- `src/workspace/defaults/template.json`
- `src/workspace/defaults/article.mda`

## New files
- `src/components/artichales/preview/print/build-print-stylesheet.ts`
- `src/components/artichales/preview/print/use-print-stylesheet.ts`

## Deactivate or retire from active print path
- `src/components/artichales/plugins/header.render.plugin.tsx`
- `src/components/artichales/plugins/footer.render.plugin.tsx`
- `src/components/artichales/plugins/margin-left.render.plugin.tsx`
- `src/components/artichales/plugins/margin-right.render.plugin.tsx`

---

## Acceptance Criteria

The work is complete when all of the following are true:

1. The isolated print tab uses **Paged.js** for final pagination
2. The default sample visibly shows:
    - header
    - footer
    - side margins
    - page number
3. `abstract` appears correctly in preview and isolated print
4. The following refs resolve and render correctly:
    - `[ref:abstract]`
    - `[ref:plotty:plot_1]`
    - `[ref:datatable:datatable_1]`
5. Plotty renders with `id="plot-plot_1"`
6. Datatable renders with `id="datatable-datatable_1"`
7. The print page no longer shows doubled title/author/content
8. The new print tab opens without the current load error
9. The live document contains only one final visible paginated tree after pagination completes

---

## Recommended Order of Work

1. Make directive normalization type-aware
2. Fix abstract rendering with preserved children
3. Freeze the canonical ref/anchor contract
4. Make plotty/datatable emit matching IDs
5. Add caption parser support
6. Centralize generated Paged.js stylesheet creation
7. Remove competing running-header/footer systems from the active path
8. Stabilize print-job handoff and error handling
9. Remove duplicate live trees and StrictMode from the print entry
10. Refresh the default sample template and article
