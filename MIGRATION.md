# Migration Plan (SPEC.md as Single Source of Truth)

This plan defines how to migrate the current codebase to full v1 compliance with `SPEC.md`.

Policy:
- `SPEC.md` is the only normative source.
- `PLUGIN_SPEC.md` and `ARTIFACT_SPEC.md` must be aligned to `SPEC.md`, not vice versa.
- Any behavior conflicting with `SPEC.md` is treated as migration debt.

---

## 1. Migration Goals

By the end of migration:
- The canonical workspace files are exactly:
  - `template.json`
  - `article.mda`
  - `references.bib`
- Workspace content and assets are stored in OPFS.
- Rendering follows the required pipeline:
  1. template validation
  2. bibliography validation/normalization
  3. article parsing
  4. document normalization
  5. index/reference registry/numbering/diagnostics build
  6. plugin-owned processing
  7. render active target
- Diagnostics and blocking rules match `SPEC.md` (including file-switch lock behavior).
- Plugin architecture and artifact rules are consistent with `SPEC.md` sections 6, 14, 15, 17, and 18.

---

## 2. Current-State Gap Summary

## 2.1 Critical (P0)

1. Canonical source file mismatch:
- Current: `article.mdx`
- Required: `article.mda`

2. Storage model mismatch:
- Current: workspace files in `localStorage`
- Required: OPFS for workspace files/assets; `localStorage` only for UI continuity state

3. Editor mismatch:
- Current: textarea editor
- Required: CodeMirror 6 code-oriented editor with syntax assistance and completion

4. Pipeline mismatch:
- Current: render-centric path without strict normalized document model
- Required: strict parse/normalize/process pipeline with deterministic state

5. Diagnostics mismatch:
- Current: partial diagnostics (mainly template)
- Required: unified error/warning/info diagnostics with blocking semantics

6. Blocking UX mismatch:
- Current: file switching remains enabled under blocking errors
- Required: file-tree switching lock when currently open file is blocking

## 2.2 High Priority (P1)

1. Syntax handling gaps:
- Missing full `ref:type:key` and `ref:type` semantics from spec
- Missing caption syntax model `[caption:type:key]`
- Missing singleton short-reference logic on unkeyed target sets

2. Bibliography validation gaps:
- Weak parser and rule checks
- Missing strict blocking behavior for `.bib` schema/syntax/duplicates

3. Plugin execution consistency gaps:
- Registry and stage execution not fully modeled as spec pipeline
- Plugin validation and failure isolation incomplete

4. Template schema drift:
- Current schema uses fields diverging from spec language and structure
- Merge behavior is not fully verified with conformance tests

5. Asset lifecycle gaps:
- Missing complete file operations and constraints from spec
- Missing `Download Source` zip flow
- Missing size/type enforcement model

## 2.3 Medium Priority (P2)

1. Print stack direction:
- Current custom pagination service
- Required direction: Paged.js + Chrome-native print/PDF behavior

2. Page limit:
- Missing `PAGE_LIMIT = 40` enforcement

3. Editor-preview alignment controls:
- AST-based source/preview alignment controls are missing

---

## 3. Phase-by-Phase Delivery Plan

## Phase 0: Baseline, Controls, and Safety Net

Objective:
- Freeze behavior and create measurable migration checkpoints.

Scope:
- Build a spec compliance checklist from `SPEC.md`.
- Capture baseline snapshots of current behavior.
- Define golden documents (valid + invalid) for template, bib, directives, and references.

Implementation steps:
1. Create machine-readable compliance checklist (`/docs/spec-checklist.md` or equivalent).
2. Add baseline smoke tests for editor load, preview switching, and current diagnostics.
3. Add golden test fixtures for:
   - valid singleton short ref
   - ambiguous short ref
   - duplicate directive identity
   - invalid template schema
   - duplicate BibTeX key

Acceptance criteria:
- Baseline tests pass consistently.
- Golden fixtures are versioned and runnable in CI.

Dependencies:
- None.

Risks:
- Hidden behavior differences not captured in baseline tests.

---

## Phase 1: Canonical Workspace and OPFS Migration

Objective:
- Enforce spec workspace model and move canonical content storage to OPFS.

Scope:
- Introduce OPFS repository layer.
- Rename canonical article file to `article.mda`.
- Keep one-time compatibility migration from old `article.mdx`.

Implementation steps:
1. Implement `WorkspaceRepository` abstraction with OPFS backend.
2. Initialize fixed workspace with protected core files:
   - `template.json`
   - `article.mda`
   - `references.bib`
3. On first launch after update:
   - if `article.mda` missing and `article.mdx` exists, migrate content once.
4. Keep `localStorage` only for UI continuity:
   - active target
   - panel sizing
   - preview zoom
   - crash-recovery buffer

Acceptance criteria:
- Core files always exist.
- Core files are editable but undeletable.
- Workspace content is persisted in OPFS.
- Legacy `article.mdx` is migrated once and not reintroduced.

Dependencies:
- Phase 0 completed.

Risks:
- Data loss during one-time migration.
Mitigation:
- Read-before-write + backup key + migration idempotency marker.

---

## Phase 2: File Tree Contract and Asset Lifecycle

Objective:
- Implement exact workspace file management behavior from spec.

Scope:
- File tree ordering and protection rules.
- Asset add/rename/delete operations.
- Type and size policy enforcement.
- Source zip export.

Implementation steps:
1. Enforce pinned order:
   1. `template.json`
   2. `article.mda`
   3. `references.bib`
2. List all user-managed assets alphabetically after pinned files.
3. Add drag-and-drop asset insertion.
4. Add context rename/delete for assets only.
5. Enforce allowed asset types:
   - `.json`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`
6. Enforce file size policy:
   - default 2MB
   - optional template override `default.assets.maxFileSize`
   - hard ceiling 20MB
7. Add `Download Source` action exporting `source.zip`.
8. Keep rename behavior non-rewriting (no automatic source rewrite).

Acceptance criteria:
- Invalid file type or size triggers explicit user-facing error.
- Core files cannot be deleted.
- Exported zip includes full current workspace.

Dependencies:
- Phase 1 completed.

Risks:
- Inconsistent validation across drag-drop and programmatic writes.
Mitigation:
- Centralize validation in repository/service layer.

---

## Phase 3: Editor Upgrade to CodeMirror 6

Objective:
- Replace textarea with a spec-aligned source editor experience.

Scope:
- CodeMirror 6 integration.
- Per-file editing mode and syntax support.
- Completion support foundations.

Implementation steps:
1. Replace current editor component with CM6.
2. Add mode/config by active file:
   - `article.mda`: markdown + Artichales syntax extensions
   - `template.json`: JSON mode + schema diagnostics hooks
   - `references.bib`: BibTeX mode + validation hooks
3. Add syntax assistance for:
   - frontmatter
   - headings
   - citations
   - references
   - captions
   - directives
4. Preserve per-file undo/redo boundaries.

Acceptance criteria:
- CM6 editor is stable for all core files.
- Syntax highlighting and completion are available for required constructs.
- Undo/redo remains scoped to active file.

Dependencies:
- Phase 1 completed.

Risks:
- Parser plugins and CM6 tokenization diverge.
Mitigation:
- Share grammar tokens/config constants across parser and editor layers.

---

## Phase 4: Parsing, Normalization, and Core State Pipeline

Objective:
- Implement deterministic spec pipeline with a strict normalized document model.

Scope:
- Parsing and normalization engine.
- Reference registry and numbering.
- Directive identity and uniqueness rules.

Implementation steps:
1. Build pipeline orchestrator with explicit stages:
   1. validate template
   2. validate/normalize bibliography
   3. parse article source
   4. normalize into shared document model
   5. build indexes/registry/numbering/diagnostics
   6. run plugin-owned processing
   7. render active target
2. Add required normalized node types:
   - citation node
   - reference node
   - caption node
   - plugin directive node
3. Include source locations:
   - line/column range
   - absolute offsets
4. Enforce directive identity uniqueness:
   - `plugin_id` for unkeyed directives
   - `plugin_id + data_file` for keyed directives
5. Implement short-form reference rules on unkeyed targets only.

Acceptance criteria:
- All reference resolution semantics follow spec.
- Duplicate directive identity raises blocking error.
- Numbering is assigned in core processing stage (not render stage).

Dependencies:
- Phase 1 and Phase 3 completed.

Risks:
- Breaking existing render behavior while pipeline changes.
Mitigation:
- Run both legacy and new pipeline under feature flags during transition.

---

## Phase 5: Unified Diagnostics and Blocking UX Enforcement

Objective:
- Make diagnostics behavior fully spec-compliant and user-visible.

Scope:
- Central diagnostics model.
- Tabbed diagnostics presentation.
- Blocking state behavior in navigation.

Implementation steps:
1. Add centralized diagnostics store:
   - severities: `error`, `warning`, `info`
   - source attribution: parser/core/plugin/renderer
   - source ranges
2. Implement diagnostics tabs in preview:
   - errors/render log
   - warnings
   - info
3. Enforce blocking rules:
   - errors block rendering when required by spec section
   - file switch disabled when currently open file is blocking
4. Add explicit save failure alerts via shadcn alert pattern.

Acceptance criteria:
- Blocking and non-blocking severities behave exactly as spec.
- File-tree lock is enforced on blocking open-file states.
- Save failures are never silent.

Dependencies:
- Phase 4 completed.

Risks:
- Over-blocking from misclassified diagnostics.
Mitigation:
- Maintain strict diagnostic code-to-severity mapping table with tests.

---

## Phase 6: Plugin Architecture Consolidation

Objective:
- Make plugin behavior deterministic and fully aligned to spec pipeline.

Scope:
- Plugin lifecycle and stage execution.
- Registry behavior and validation.
- Plugin failure isolation.

Implementation steps:
1. Ensure all plugin categories are handled:
   - `parser`
   - `core`
   - `render`
   - `editor`
2. Bind hook execution to pipeline stages.
3. Enforce registry order where order is authoritative.
4. Validate plugin config against `configSchema` before execution.
5. On plugin failure:
   - emit diagnostic with plugin attribution
   - isolate failure without crashing unrelated plugins
6. Ensure all active plugin features are represented in registry/contract (including datatable render behavior).

Acceptance criteria:
- Plugin order and stage execution are deterministic.
- One plugin failure does not collapse unrelated output paths.
- Diagnostics identify failing plugin clearly.

Dependencies:
- Phase 4 and Phase 5 completed.

Risks:
- Silent behavior drift due to implicit plugin defaults.
Mitigation:
- Add plugin activation trace logs in development mode.

---

## Phase 7: Print/Web Rendering Compliance and Export Hardening

Objective:
- Align rendering and export behavior with spec print/web expectations.

Scope:
- Active target rendering behavior.
- Print stack and page limits.
- PDF output consistency.

Implementation steps:
1. Ensure only active preview target renders live.
2. Enforce `PAGE_LIMIT = 40` in print pipeline.
3. Evaluate migration from custom pagination to Paged.js-compatible flow.
4. Validate header/footer/page numbering behavior across first/default pages.
5. Verify print preview to PDF fidelity under Chrome print flow.

Acceptance criteria:
- Live rendering is single-target only.
- Page limit behavior is enforced and user-visible.
- Print-to-PDF output is consistent with preview intent.

Dependencies:
- Phase 4 completed.

Risks:
- Browser print engine differences.
Mitigation:
- Keep deterministic render model + visual regression snapshots for print pages.

---

## Phase 8: Spec Document Synchronization and Cleanup

Objective:
- Remove cross-document ambiguity and finalize spec-aligned docs.

Scope:
- Update secondary specs and README.
- Remove legacy naming and migration toggles where safe.

Implementation steps:
1. Update `PLUGIN_SPEC.md` to explicitly match `SPEC.md` plugin model.
2. Update `ARTIFACT_SPEC.md` to match asset and directive rules from `SPEC.md`.
3. Update README:
   - canonical file names
   - pipeline summary
   - diagnostics and blocking behavior
4. Remove deprecated `article.mdx` references and legacy compatibility code after migration window.

Acceptance criteria:
- No conflicting normative statements across project docs.
- User-facing docs match shipped behavior.

Dependencies:
- All prior phases completed.

Risks:
- Old examples reintroducing invalid syntax.
Mitigation:
- Add doc lint checks against known forbidden patterns.

---

## 4. Cross-Phase Quality Gates

These gates must remain green after each phase:
- Type safety and lint quality.
- No silent fallback that violates explicit spec failures.
- Feature-flagged rollout path available for high-risk phase changes.
- Backward compatibility only where intentionally temporary and documented.

---

## 5. Testing Strategy

## 5.1 Test Layers

1. Unit tests:
- template schema + merge rules
- bib validation rules
- directive identity logic
- short-form reference eligibility and resolution

2. Integration tests:
- end-to-end pipeline stage ordering
- plugin execution order and isolation
- diagnostics generation and severity mapping

3. E2E tests (extension runtime):
- OPFS persistence and reload
- file-tree lock behavior on blocking errors
- asset validation and operations
- source zip export
- print/web switching and PDF flow

## 5.2 Golden Scenarios

Required fixture coverage:
- valid singleton short ref (`[ref:abstract]`)
- ambiguous short ref (blocking error)
- duplicate directive identity (blocking error)
- missing plugin-required data file (plugin error)
- duplicate BibTeX keys (blocking error)
- invalid template schema (blocking error)

---

## 6. Rollout Plan

Use feature flags for controlled rollout:
- `opfsWorkspace`
- `editorCM6`
- `pipelineV2`
- `diagnosticsV2`
- `printStackV2`

Rollout sequence:
1. Internal development default on
2. Controlled beta cohort
3. Full enablement
4. Legacy path removal

Rollback:
- Each phase must remain individually switchable until full stabilization.

---

## 7. Definition of Done

Migration is complete only when all are true:
- Runtime behavior conforms to `SPEC.md`.
- Canonical source file is `article.mda` everywhere.
- OPFS is the persistence source for workspace files and assets.
- Diagnostics and blocking UX are fully spec-compliant.
- Plugin architecture is deterministic and failure-isolated.
- `PLUGIN_SPEC.md` and `ARTIFACT_SPEC.md` are fully synchronized to `SPEC.md`.
- No remaining production code path depends on deprecated pre-migration behavior.
