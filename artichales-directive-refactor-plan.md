
# Artichales Refactoring Plan — Directive-First, No Legacy Fallback

## Goal

Refactor the authoring, parsing, indexing, rendering, and editor experience around the locked directive-first model:

- `:cite[...]`
- `:ref[...]`
- `:fn[...]`
- `:::plotty[...]`
- `:::datatable[...]`
- `:::section[...]`
- `:::subsection[...]`
- `:::subsubsection[...]`
- `:::figure[...]`
- `:::table[...]`
- `:::equation[...]`
- `:::codesample[...]`

This plan explicitly rejects legacy compatibility layers, syntax rewrites, and fallback parsing paths.

The end state must be:

- one clear syntax model
- one clear parser contract
- one clear plugin metadata contract
- one clear registry/indexing model
- one clear autocomplete model
- no hidden backward-compatibility code

---

## Design Principles

### 1. Syntax must be explicit
The system must align with `remark-directive` syntax directly.  
No custom pre-rewrite syntax is allowed.

### 2. Metadata must be typed
Plugin metadata must not overload unrelated fields.  
`category` must no longer be used as display family.

### 3. Prefix behavior must be explicit
Inline directives and block directives must be modeled explicitly.

### 4. Parsing must be single-pass and deterministic
No duplicate parsing of the same concept in multiple layers.

### 5. Editor behavior must be generated from the registry
Autocomplete must come from plugin metadata, not from hardcoded arrays.

### 6. No legacy fallback
The following must be removed rather than supported in parallel:

- `[cite:...]`
- `[ref:...]`
- `[caption:...]`
- custom bracket rewrites before `remark-directive`
- parser healing hacks for broken legacy inline tokens

---

## Current Problems in the Codebase

The current codebase still mixes multiple models:

- plugin metadata is too limited for directive-first authoring
- plugin registry only partially models directive plugins
- directive parsing still contains rewrite and normalization layers
- cite/ref parsing still relies on legacy token heuristics
- editor-specific plugin integration is not yet a real metadata-driven system

These are visible in the current code seams:

- `plugin.contract.ts`
- `plugin.registry.ts`
- `artichales.utils.ts`
- `document-pipeline.ts`
- `citation.parser.plugin.tsx`
- `ref.render.plugin.tsx`
- `citation.editor.plugin.tsx`

---

## Target Architecture

## A. Plugin metadata becomes the single source of truth

Every directive-capable plugin must declare:

- its directive name
- its directive prefix kind
- its display family
- its indexing behavior
- its autocomplete behavior

### Proposed enums

```ts
export enum DirectiveKind {
  TEXT = "text",       // :
  LEAF = "leaf",       // ::
  CONTAINER = "container", // :::
}

export enum DisplayAs {
  FIGURE = "figure",
  TABLE = "table",
  EQUATION = "equation",
  CODE = "code",
  SECTION = "section",
  ABSTRACT = "abstract",
  NOTE = "note",
}
```

### Proposed plugin metadata shape

```ts
type DirectiveDefinition = {
  name: string
  kind: DirectiveKind
  indexed: boolean
  autocomplete: boolean
}

type PluginDefinition = {
  id: string
  name: string
  category: PluginCategory
  displayAs?: DisplayAs
  directive?: DirectiveDefinition
  version?: string
  description?: string
  configSchema?: ZodType<unknown>
  hooks: PluginHooks
}
```

### Important rule
`category` remains a structural/plugin grouping concept. mark as  deprecated.

`displayAs` becomes the human-readable academic family for numbering and references.

This prevents category overloading and keeps the code readable.

---

## B. Prefix behavior is modeled explicitly

The editor and parser must distinguish these forms by metadata:

- `:` -> inline text directives
- `::` -> leaf directives
- `:::` -> container directives

For the currently locked structure:

### Text directives
- `cite`
- `ref`
- `fn`

### Container directives
- `plotty`
- `datatable`
- `code`
- `section`
- `subsection`
- `subsubsection`
- `figure`
- `table`
- `equation`
- `codesample`
- `abstract`

### Leaf directives
None are required in the locked v1 structure.

---

## C. Registry and indexing become display-family based

The numbering/index system must be driven by `displayAs`, not by `category`.

Examples:

- `plotty` -> `DisplayAs.FIGURE`
- `figure` -> `DisplayAs.FIGURE`
- `datatable` -> `DisplayAs.TABLE`
- `table` -> `DisplayAs.TABLE`
- `equation` -> `DisplayAs.EQUATION`
- `codesample` -> `DisplayAs.CODE`
- `section` -> `DisplayAs.SECTION`

This keeps numbering and reference generation coherent even when different plugins share the same scholarly display family.

---

## D. Autocomplete is generated from plugin metadata

The editor must build its completion model from the plugin registry.

### Rules

#### Trigger `:`
Show only `DirectiveKind.TEXT` plugins.

Must include:
- `cite`
- `ref`
- `fn`

Must not include:
- `plotty`
- `datatable`
- `figure`
- `table`
- `equation`
- `codesample`
- `section`
- `subsection`
- `subsubsection`

#### Trigger `:::`
Show only `DirectiveKind.CONTAINER` plugins.

Must include:
- `plotty`
- `datatable`
- `figure`
- `table`
- `equation`
- `codesample`
- `section`
- `subsection`
- `subsubsection`
- `abstract`

Must not include:
- `cite`
- `ref`
- `fn`

### Important rule
Autocomplete must not be built from hardcoded lists.

It must be derived from the plugin registry at runtime.

---

## Phase 1 — Clean Plugin Metadata and Registry

## Goal
Turn plugin metadata into the canonical definition source for parsing, indexing, display, and editor behavior.

### Tasks

#### 1.1 Add directive enums
Create a new file:

- `src/components/artichales/plugins/plugin.enums.ts`

Add:

- `DirectiveKind`
- `DisplayAs`

#### 1.2 Extend plugin contract
Update:

- `src/components/artichales/plugins/plugin.contract.ts`

Changes:

- add `displayAs?: DisplayAs`
- add `directive?: DirectiveDefinition`
- keep `category` as a plugin grouping field only
- remove any conceptual use of `category` as display family

#### 1.3 Refactor plugin registry
Update:

- `src/components/artichales/plugins/plugin.registry.ts`

Changes:

- stop modeling directive plugins only as a separate hardcoded list
- expose registry helpers such as:
  - `listDirectivePluginsByKind(kind)`
  - `listIndexedPlugins()`
  - `listAutocompletePlugins(kind)`
  - `resolveDisplayFamily(pluginId)`

#### 1.4 Update all existing plugins with explicit metadata
Update existing plugins so each declares:

- `displayAs`
- `directive.kind` when applicable

Examples:

- `plotty` -> `displayAs: DisplayAs.FIGURE`, `directive.kind: CONTAINER`
- `datatable` -> `displayAs: DisplayAs.TABLE`, `directive.kind: CONTAINER`
- `cite` -> no displayAs required, `directive.kind: TEXT`
- `ref` -> no displayAs required, `directive.kind: TEXT`
- `fn` -> no displayAs required, `directive.kind: TEXT`
- `section` -> `displayAs: DisplayAs.SECTION`, `directive.kind: CONTAINER`

### Deliverable
A plugin registry that can drive parser, renderer, registry, and editor behavior without hardcoded special-case lists.

---

## Phase 2 — Remove Legacy Inline Syntax Completely

## Goal
Delete the old `[cite:...]`, `[ref:...]`, and `[caption:...]` parsing model.

### Tasks

#### 2.1 Remove legacy token grammar
Update:

- `src/components/artichales/plugins/citation.parser.plugin.tsx`

Actions:

- delete support for:
  - `[cite:...]`
  - `[ref:...]`
  - `[caption:...]`
- delete AST repair logic for fractured inline tokens
- delete link and linkReference conversion hacks for legacy cite/ref/caption syntax

#### 2.2 Replace it with directive-first inline parsing
Introduce a new parser plugin or rename the existing one.

Suggested new file:

- `src/components/artichales/plugins/inline-directive.parser.plugin.tsx`

Responsibilities:

- detect `textDirective` nodes only
- support:
  - `:cite[...]`
  - `:ref[...]`
  - `:fn[...]`
- map them to normalized inline node metadata
- do not support legacy tokens in any form

#### 2.3 Remove caption token logic from inline parsing
Caption is now block-level semantics only.

Therefore:

- no inline `caption` directive
- no `data-caption-type`
- no `data-caption-key`
- no `data-caption-title`

### Deliverable
A small, readable inline directive parser with no compatibility hacks.

---

## Phase 3 — Remove Directive Rewrite and Multi-Representation Normalization

## Goal
Use `remark-directive` directly, without pre-rewrite or duplicated data serialization.

### Tasks

#### 3.1 Delete rewrite logic
Update:

- `src/lib/artichales.utils.ts`
- `src/lib/document-pipeline.ts`

Delete:

- `normalizeExtendedDirectiveSyntax(...)`
- any pre-parse rewrite step before `remarkDirective`

#### 3.2 Delete generic attribute overengineering
Update:

- `src/lib/artichales.utils.ts`

Delete:

- synthetic param serialization for:
  - `data-directive-params`
  - `data-directive-param-*`
- generic fallback attribute plumbing that exists only to compensate for rewrite-based parsing

#### 3.3 Replace with one normalized directive extractor
Create a new file:

- `src/lib/directive-normalizer.ts`

Responsibilities:

- read `containerDirective`, `leafDirective`, and `textDirective` nodes directly
- extract:
  - `pluginId`
  - `label`
  - `kind`
  - `attributes`
  - `body`
- produce one normalized directive object
- hand that object to downstream systems

### Deliverable
One clear directive normalization layer, with no syntax rewrite and no duplicated parameter storage.

---

## Phase 4 — Introduce a Dedicated Inline Model for Cite, Ref, and Footnote

## Goal
Make `:cite`, `:ref`, and `:fn` first-class inline directives.

### Tasks

#### 4.1 Define inline normalized shapes
Create a new file:

- `src/lib/inline-directives.ts`

Suggested types:

```ts
type NormalizedCitation = {
  pluginId: "cite"
  ids: string[]
}

type NormalizedReference = {
  pluginId: "ref"
  selector: string
  family: string
  key: string
}

type NormalizedFootnote = {
  pluginId: "fn"
  text: string
  order: number
}
```

#### 4.2 Implement `:cite`
Rules:

- label contains one or more bibliography ids
- split by comma
- trim ids
- preserve ordering

#### 4.3 Implement `:ref`
Rules:

- label contains canonical selector
- format: `family:key`
- resolve through the reference registry

#### 4.4 Implement `:fn`
Rules:

- label contains note text
- no manual numbering
- numbering is assigned by first appearance order
- final rendering shows superscript in text and generated notes list at the end

### Deliverable
A first-class inline directive model that matches the locked authoring syntax exactly.

---

## Phase 5 — Move Referenceable Blocks from Render Hooks to Directive Hooks

## Goal
Referenceable academic blocks must be directive-driven, not render-hook-driven.

### Tasks

#### 5.1 Keep only non-referenceable renderer behavior in render plugins
Current render plugins should only handle:

- inline code
- non-referenceable native fallback rendering
- citations and refs as inline renderers
- core document render pieces

#### 5.2 Create directive plugins for all referenceable blocks
Add or refactor plugins for:

- `section`
- `subsection`
- `subsubsection`
- `figure`
- `table`
- `equation`
- `codesample`
- `plotty`
- `datatable`
- `abstract`

#### 5.3 Keep heading and scholarly block semantics in directive plugins
Each directive plugin must:

- read normalized directive input
- compute anchor id
- render caption at the top
- expose indexing metadata
- remain readable and self-contained

### Deliverable
All referenceable academic blocks live in the directive path, not in ad hoc render behavior.

---

## Phase 6 — Rebuild the Reference Registry Around `displayAs`

## Goal
Make indexing, numbering, selectors, anchors, and cross references consistent.

### Tasks

#### 6.1 Create a dedicated registry module
Create a new file:

- `src/lib/reference-registry.ts`

Responsibilities:

- collect indexed directive entries
- normalize labels
- compute selectors
- compute `href`
- assign numbering by `displayAs`
- expose lookup maps for renderers

#### 6.2 Separate `category` from display family
Rules:

- `category` is not used for display numbering
- `displayAs` is the only numbering and human label family

#### 6.3 Add footnote indexing
Footnotes must have their own ordered collection:

- independent from figure/table/equation numbering
- resolved by appearance order

#### 6.4 Remove duplicated analysis logic
Update:

- `src/lib/article-analysis.ts`

Remove duplicate parsing behavior that tries to read directive syntax directly from raw source text.

Replace it with analysis over normalized directive/index data.

### Deliverable
One clean registry that drives references, anchors, numbering, and notes.

---

## Phase 7 — Rebuild `ref` Rendering on Top of the New Registry

## Goal
Make `:ref[...]` rendering simple and registry-driven.

### Tasks

#### 7.1 Simplify ref rendering
Update:

- `src/components/artichales/plugins/ref.render.plugin.tsx`

Remove old assumptions around legacy span metadata such as:

- `data-caption-type`
- `data-caption-key`
- `data-caption-title`

Ref rendering should use:

- canonical selector
- resolved registry entry
- final `label`
- final `href`

#### 7.2 Keep rendering logic tiny
`ref-render` should not generate selectors or guess ids.

It should only consume:

- a normalized ref selector
- a lookup result from the registry

### Deliverable
A minimal ref renderer with no compatibility baggage.

---

## Phase 8 — Add Footnote Rendering and Notes Section Generation

## Goal
Make `:fn[...]` a first-class generated notes system.

### Tasks

#### 8.1 Create footnote renderer
Create a new plugin:

- `src/components/artichales/plugins/footnote.render.plugin.tsx`

Responsibilities:

- render inline superscript note call
- render correct back-reference behavior if desired
- read ordered notes from the registry

#### 8.2 Add notes section generation
Add a document-level renderer or core renderer for notes.

Suggested file:

- `src/components/artichales/plugins/footnotes.render.plugin.tsx`

Responsibilities:

- render ordered notes list at the end of the article
- emit stable anchors for note calls and note entries

#### 8.3 Decide placement
For v1:

- notes are rendered at the end of the article body
- no page-bottom paged footnote placement logic yet

### Deliverable
Simple, fast, inline-authored notes with automatic numbering.

---

## Phase 9 — Rebuild Editor Autocomplete from Plugin Metadata

## Goal
Autocomplete must reflect the locked syntax model exactly and separate `:` from `:::` cleanly.

### Tasks

#### 9.1 Create a completion source module
Create a new file:

- `src/editor/directive-completions.ts`

Responsibilities:

- read the plugin registry
- filter by `DirectiveKind`
- generate completion items
- expose helper methods for:
  - `getTextDirectiveCompletions()`
  - `getContainerDirectiveCompletions()`

#### 9.2 Trigger separation
Rules:

- `:` only suggests `TEXT` directives
- `:::` only suggests `CONTAINER` directives
- `:` must not show `:::` directives
- `:::` must not show `:` directives

#### 9.3 Snippet generation
Each completion should generate the correct shape.

Examples:

### `:cite`
```txt
:cite[$1]
```

### `:ref`
```txt
:ref[$1:$2]
```

### `:fn`
```txt
:fn[$1]
```

### `:::plotty`
```txt
:::plotty[$1]{span=$2}
$3
:::
```

### `:::section`
```txt
:::section[$1]
$2
:::
```

#### 9.4 Remove hardcoded completion data
If any hardcoded completion lists exist, delete them.

### Deliverable
A dynamic autocomplete system generated entirely from plugin metadata.

---

## Phase 10 — Rename and Normalize Plugin Set

## Goal
Bring names into line with the locked directive vocabulary.

### Tasks

#### 10.1 Normalize block naming
Decide final directive ids and use them consistently.

Recommended locked names:

- `codesample` for inline-authored code blocks
- `codefile` for workspace-backed code blocks

Avoid reusing plain `code` for two different meanings.

#### 10.2 Update the spec and code together
Every plugin id must match:

- directive syntax
- registry selector prefix
- anchor prefix strategy
- autocomplete snippet id

### Deliverable
A vocabulary that is stable, explicit, and not overloaded.

---

## Phase 11 — Delete Dead Compatibility Code

## Goal
Remove all legacy compatibility code permanently.

### Must be deleted

- support for `[cite:...]`
- support for `[ref:...]`
- support for `[caption:...]`
- rewrite-based directive header parsing
- old parameter serialization layers
- caption fallback hacks in ref rendering
- legacy inline token AST repair code

### Important rule
Do not keep feature flags.
Do not keep hidden fallback branches.
Do not keep deprecated parsing paths.

Delete them.

### Deliverable
A crystal-clear codebase with one syntax model and one parsing path.

---

## Phase 12 — Tests and Fixtures

## Goal
Protect the new model with direct, readable tests.

### Tasks

#### 12.1 Add parser fixtures
Create fixture sets for:

- `:cite[...]`
- `:ref[...]`
- `:fn[...]`
- `:::plotty[...]`
- `:::datatable[...]`
- `:::section[...]`
- `:::figure[...]`
- `:::table[...]`
- `:::equation[...]`
- `:::codesample[...]`

#### 12.2 Add registry tests
Verify:

- selector generation
- label normalization
- anchor generation
- numbering by `displayAs`
- footnote ordering

#### 12.3 Add autocomplete tests
Verify:

- `:` suggests only text directives
- `:::` suggests only container directives
- generated snippets match the locked syntax

#### 12.4 Add rendering tests
Verify:

- captions appear at the top
- references resolve correctly
- footnotes render in order
- notes section is generated

### Deliverable
A test suite that locks the new model in place and prevents regression.

---

## Recommended Execution Order

1. Phase 1 — Clean Plugin Metadata and Registry
2. Phase 2 — Remove Legacy Inline Syntax Completely
3. Phase 3 — Remove Directive Rewrite and Multi-Representation Normalization
4. Phase 4 — Introduce a Dedicated Inline Model for Cite, Ref, and Footnote
5. Phase 5 — Move Referenceable Blocks from Render Hooks to Directive Hooks
6. Phase 6 — Rebuild the Reference Registry Around `displayAs`
7. Phase 7 — Rebuild `ref` Rendering on Top of the New Registry
8. Phase 8 — Add Footnote Rendering and Notes Section Generation
9. Phase 9 — Rebuild Editor Autocomplete from Plugin Metadata
10. Phase 10 — Rename and Normalize Plugin Set
11. Phase 11 — Delete Dead Compatibility Code
12. Phase 12 — Tests and Fixtures

---

## Acceptance Criteria

The refactor is complete when all of the following are true:

1. `remark-directive` is the only directive syntax source
2. `:cite[...]`, `:ref[...]`, and `:fn[...]` are fully supported
3. `:` autocomplete never shows `:::` directives
4. `:::` autocomplete never shows `:` directives
5. autocomplete items are built from the plugin registry dynamically
6. `category` is no longer used as display family
7. `displayAs` exists as a typed enum and drives numbering
8. directive kind/prefix is explicit in plugin metadata
9. all referenceable academic blocks are directive plugins
10. old `[cite:]`, `[ref:]`, and `[caption:]` syntax is fully removed
11. no rewrite-based directive preprocessing remains
12. footnotes are inline-authored and automatically numbered
13. the codebase has no hidden compatibility fallback paths
14. the resulting parser and plugin flow is readable without historical knowledge
