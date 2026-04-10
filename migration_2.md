# Artichales v1 - SPEC Alignment Migration Plan

This document is an actionable migration plan to close the gaps between the current codebase and `SPEC.md`.

## 1) Quick Status Summary

- **Strong alignment areas**
  - Single workspace + three protected core files model (`src/lib/workspace.ts`, `src/services/workspace.repository.ts`).
  - OPFS-based persistence and automatic saving (`src/services/workspace.repository.ts`, `src/components/artichales/surfaces/editor-preview-surface.tsx`).
  - Asset type/size rules (2MB default, 20MB hard cap) (`src/services/workspace.repository.ts`).
  - Blocking behavior for bibliography duplicate keys/syntax/schema errors (`src/lib/bibtex.ts`, `src/hooks/use-document.ts`).
  - Print/Web target switching and print page limit = 40 (`src/components/artichales/preview/print/pagination.service.ts`).
  - Singleton short-form reference rules, caption identity, and directive identity checks (`src/lib/article-analysis.ts`).

- **Critical misalignments**
  - Autosave is missing **blur-triggered save** (only debounce save exists).
  - Editor autocomplete is not built from the SPEC-defined normalized reference target index; it is derived from current resolved reference usage.
  - Template/default span token mismatch: code uses `full`, SPEC expects `page`.
  - Default template `citationStyle` fallback is `author-year`; SPEC minimum set is focused on `numeric|ieee|apc`.
  - Default `references.bib` uses `@inproceedings`, which may conflict with the supported type set.

## 2) Alignment Matrix (Selected Topics)

| SPEC Topic | Status | Evidence (Code) | Notes |
|---|---|---|---|
| 4.x Single workspace, 3 core files, ordering | Aligned | `src/lib/workspace.ts`, `src/components/artichales/panels/file-tree.tsx` | Core files are pinned and non-deletable |
| 5.1 OPFS storage | Aligned | `src/services/workspace.repository.ts` | Throws explicit error when OPFS is unavailable |
| 5.2 Debounce + blur save | Partial | `src/components/artichales/surfaces/editor-preview-surface.tsx` | 500ms debounce exists, blur save missing |
| 5.3 Explicit save-failure alert | Aligned | `src/components/artichales/surfaces/editor-preview-surface.tsx` | Visible `Alert` is shown |
| 6.x Asset type and size limits | Aligned | `src/services/workspace.repository.ts` | 2MB default, 20MB hard cap |
| 9.6 Reference autocomplete rules | Missing/Partial | `src/hooks/use-document.ts`, `src/components/artichales/editor/mdx-editor.tsx` | No target-registry-based completion |
| 10.1 Render only active target | Aligned | `src/components/artichales/surfaces/editor-preview-surface.tsx` | Conditional render by `target` |
| 11.6 Minimum citation styles | Partial | `src/components/artichales/plugins/citation.render.plugin.tsx`, `src/lib/template.ts` | Runtime support exists; schema constraints are weak |
| 12.3 Reference singleton/partial rules | Aligned | `src/lib/article-analysis.ts` | Unkeyed singleton logic is implemented |
| 12.4 Caption behavior | Aligned | `src/lib/article-analysis.ts`, `src/components/artichales/plugins/ref.render.plugin.tsx` | Omitted caption text -> hidden anchor |
| 14.2/14.8 Directive syntax span=column\|page | Partial | `src/lib/article-analysis.ts`, `src/components/artichales/plugins/plotty.parser.plugin.tsx` | Span parsing/validation is incomplete |
| 15.4 Build-time plugin validation | Aligned | `scripts/validate-plugin-config.ts`, `package.json` | Wired into build script |
| 18.x Diagnostic severity and blocking | Aligned | `src/hooks/use-document.ts`, `src/lib/document-pipeline.ts` | error=blocking, warning/info non-blocking |

## 3) Migration Phases

### Phase 1 - Critical SPEC Convergence (P0)

1. **Add blur-save**
   - Files: `src/components/artichales/editor/mdx-editor.tsx`, `src/components/artichales/surfaces/editor-preview-surface.tsx`
   - Approach: Emit editor `blur` to parent; parent immediately calls `workspaceRepository.saveWorkspace`.
   - Acceptance criteria: Save is attempted on blur without waiting for debounce.

2. **Generate reference autocomplete from normalized registry**
   - Files: `src/lib/article-analysis.ts`, `src/lib/document-pipeline.ts`, `src/hooks/use-document.ts`, `src/components/artichales/editor/mdx-editor.tsx`
   - Approach: Add `referenceTargets`/`completionEntries` to analysis output; editor consumes these with `ref:type` and `ref:type:key` rules.
   - Acceptance criteria:
     - Typing `ref:plotty:` suggests only valid keyed targets.
     - `ref:abstract` is suggested only when exactly one unkeyed singleton target exists.

3. **Unify span token (`full` -> `page`)**
   - Files: `src/lib/template.ts`, `src/components/artichales/preview/shared/markdown-content.tsx`, related render plugins
   - Approach: Change `defaultSpan` enum to `column|page`; keep backward-compat mapping for legacy `full`.
   - Acceptance criteria: Template + runtime use a single token set consistently.

### Phase 2 - Semantic and Schema Hardening (P1)

4. **Constrain citation style schema**
   - File: `src/lib/template.ts`
   - Approach: Use enum for `default.citationStyle`: `numeric|ieee|apc` (optionally with temporary `author-year` deprecation warning).
   - Acceptance criteria: Unsupported styles raise schema errors.

5. **Harden directive bracket/argument validation**
   - File: `src/lib/article-analysis.ts` (or parser plugin layer)
   - Approach: Detect and report extra bracket segments beyond single `data_file`.
   - Acceptance criteria: `:::plotty[a.json][b.json]` produces parser/normalization error.

6. **Align default workspace samples with SPEC**
   - Files: `src/workspace/defaults/references.bib`, `src/lib/workspace-default-files.ts`
   - Approach: Provide sample data compatible with supported BibTeX types.
   - Acceptance criteria: A fresh workspace does not start with blocking bibliography errors.

### Phase 3 - UX and Resilience (P2)

7. **Crash-recovery editor text**
   - File: `src/components/artichales/surfaces/editor-preview-surface.tsx`
   - Approach: Keep temporary local-storage snapshot for pending editor text.
   - Acceptance criteria: Reduced data loss when tab/extension is closed unexpectedly.

8. **Increase SPEC coverage regression tests**
   - Files: `src/lib/document-pipeline.test.ts`, `src/lib/template.test.ts`
   - Approach: Add tests for all critical pipeline rules except blur-save behavior.

## 4) Test and Verification Checklist

- [ ] `bun test` passes fully.
- [ ] `bun test src/lib/document-pipeline.test.ts` passes with new singleton/ref/autocomplete tests.
- [ ] `bun run build` succeeds (plugin config validation + TS + Vite build).
- [ ] Invalid `citationStyle` in `template.json` produces expected schema error.
- [ ] Save is triggered on blur; if save fails, UI alert is visible.
- [ ] `ref:` autocomplete targets match the normalized registry built from article content.
- [ ] `span=page` behavior works correctly in both print and web rendering.

## 5) Recommended Implementation Order

1. Deliver all P0 items in the same PR series (highest behavior-regression risk).
2. Ship P1 schema/semantic hardening with migration notes.
3. Complete P2 improvements with performance and UX telemetry checks.

---

This plan minimizes delivery risk on the path to `SPEC.md` alignment: first data integrity + parser semantics, then schema hardening, then UX resilience.

## 6) Execution Update (2026-04-10, Session 10)

Closed in code:
- Added blur-triggered immediate workspace save in editor flow.
- Switched editor reference autocomplete source to normalized target registry (`referenceTargets`), not only already-resolved refs.
- Unified span token to `column|page` across template/runtime types; legacy `full` still accepted and normalized to `page`.
- Constrained template citation style schema to `numeric|ieee|apc` and switched runtime fallback/default to `numeric`.
- Updated default bibliography fixture to supported type set (`@proceedings` instead of `@inproceedings`).
- Added directive bracket validation error when multiple data-file segments are declared.

Verification:
- `bun test src/lib/template.test.ts src/lib/document-pipeline.test.ts` passed.
- `bunx tsc -b` passed.
- `bun run build` passed.
