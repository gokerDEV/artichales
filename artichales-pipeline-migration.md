
# Artichales Pipeline Migration Document v2

## Purpose

This document defines the migration of the current document pipeline to the locked directive-first architecture.

It reflects these decisions:

- plugins are enabled only from `template.json` and app config
- parsing must not write to the store
- parsing must return only minimal, necessary data
- store is a global application concern, not a rendering concern
- rendering must be possible without any store
- render-facing derived data must not be mixed into parse output
- no legacy fallback paths are allowed
- headings and labeled blocks are flat parse outputs
- numbering needed for immediate `:ref[...]` rendering must be computed during the single article indexing pass
- `displayAs` resolution belongs to plugin metadata and is used through a registry-backed lookup map
- bibliography parsing is separate from article parsing
- rendering iterates directives and delegates each directive to its own plugin renderer
- rendering returns rendered article output and rendered references output

---

## 1. Problems in the Current Pipeline

The current pipeline mixes inputs, parse outputs, derived outputs, and render-facing state into one result shape.

Today, `document-pipeline.ts` returns a combined result containing:

- `ast`
- `content`
- `frontmatter`
- `citations`
- `validatedBibEntries`
- `plots`
- `template`
- `resolvedReferences`
- `captions`
- `referenceTargets`
- `activePluginIds`
- `diagnostics`

That result is then posted by the worker to the UI and stored directly in Zustand state. The same mixed structure is also surfaced by `useDocument`.

This causes several architectural problems:

1. Input-derived values are returned as if they were parse artifacts
2. Parse output and render-facing data are mixed
3. The store becomes a dump of pipeline internals instead of a clean global state model
4. Rendering becomes implicitly coupled to Zustand state
5. A developer cannot render an `.mda` file cleanly without dragging store concerns into the codebase

---

## 2. Locked Design Principles

### 2.1 Plugin enablement
Enabled plugins may only come from:

- `template.json`
- app-level config

They must not come from article frontmatter.

### 2.2 Parse purity
Parsing must be pure.

Parsing must:

- read input
- return structured results

Parsing must not:

- write to the store
- mutate UI state
- create render output
- create application-specific cached UI structures

### 2.3 Single-pass article collection
The article pipeline must parse once and collect all required article data in one pass.

No second raw-source analysis pass is allowed.

### 2.4 Minimal output only
The parser must return only the smallest useful set of article artifacts.

Anything that belongs to rendering must be resolved during rendering.

### 2.5 Store is optional for rendering
The store is a global application concern for things such as:

- live preview
- autocomplete
- document browsing
- UI synchronization

It is not a rendering requirement.

A developer must be able to:

1. parse input
2. optionally write parse output to a store
3. render directly from parse output

without any Zustand dependency.

### 2.6 No legacy fallback
The migration must delete legacy behavior rather than keep compatibility branches.

No support must remain for:

- `[cite:...]`
- `[ref:...]`
- `[caption:...]`
- custom directive header rewrites
- duplicate raw-source directive parsing
- AST healing hacks for legacy inline syntax

---

## 3. Final High-Level Flow

The architecture must follow this order:

```txt
parsing -> storing -> rendering
```

### Important clarification

- parsing is pure
- storing is optional and application-specific
- rendering is independent from store

That means the same parsed result can be used in two ways:

### Application mode
```txt
parse -> store -> render preview
```

### Library mode
```txt
parse -> render
```

Both must be supported by the same core contracts.

---

## 4. Final Pipeline Shape

The pipeline must be split into three independent parse phases:

1. Template phase
2. Bibliography phase
3. Article phase

A coordinator/orchestrator may still call all three in a single worker execution, but the outputs must remain logically separated.

---

## 5. Final Output Contracts

## 5.1 Template output

```ts
type ParsedTemplate = {
  template: TemplateFileResolved;
  enabledPluginIds: readonly string[];
  diagnostics: readonly TemplateDiagnostic[];
};
```

### Notes
- `enabledPluginIds` is resolved from template and app config only
- frontmatter cannot affect the enabled plugin list
- plugin metadata maps are derived from this phase

---

## 5.2 Bibliography output

```ts
type ParsedBibliography = {
  entriesById: Readonly<Record<string, ValidatedBibEntry>>;
  diagnostics: readonly BibtexDiagnostic[];
};
```

### Notes
- this is input-derived data
- it is not article parse output
- citation autocomplete reads from this structure
- bibliography rendering later filters this structure using article citation usage

---

## 5.3 Article output

```ts
type ParsedArticle = {
  frontmatter: ArticleFrontmatter;
  ast: Root | null;
  headings: readonly HeadingEntry[];
  labeledBlocks: readonly LabeledBlockEntry[];
  citations: readonly string[];
  diagnostics: readonly AppDiagnostic[];
};
```

### Notes
- this is the only article parse output
- it is flat
- it is minimal
- it contains no render-facing objects
- it contains no bibliography entries
- it contains no resolved refs
- it contains no precomputed hrefs
- it contains no nested UI trees

---

## 6. Final Parsed Types

## 6.1 `ArticleFrontmatter`

Frontmatter must not be returned as `Record<string, unknown>`.

It must be returned as a validated, explicit type.

```ts
type ArticleFrontmatter = {
  title: string;
  shortTitle?: string | null;
  authors?: readonly FrontmatterAuthor[];
  keywords?: readonly string[];
  doi?: string | null;
  receivedAt?: string | null;
  acceptedAt?: string | null;
  publishedAt?: string | null;
  versionDate?: string | null;
  type?: string | null;
  license?: FrontmatterLicense;
  journal?: FrontmatterJournal;
  conference?: FrontmatterConference;
  editors?: readonly FrontmatterAuthor[];
};
```

---

## 6.2 `HeadingEntry`

```ts
type HeadingEntry = {
  id: string;
  pluginId: "section" | "subsection" | "subsubsection";
  label: string;
  title: string;
  level: 1 | 2 | 3;
  number: string;
  parentId?: string;
};
```

### Rules

- `id` is canonical and stable
- `id` is built as `pluginId:label`
- `number` is included because `:ref[...]` rendering needs immediate numbering lookup
- `parentId` points to another heading `id`
- `children` must not exist here
- `href` must not exist here
- `selector` must not exist here
- `normalizedLabel` must not exist here

### Why `number` belongs here
Each `:ref[...]` is rendered independently.
That means the renderer must be able to look up numbering in constant time.
Therefore section numbering must already be available in article parse output.

---

## 6.3 `LabeledBlockEntry`

```ts
type LabeledBlockEntry = {
  id: string;
  pluginId: string;
  label: string;
  number: number;
};
```

### Rules

- only labeled blocks appear in this list
- blocks without a label are not referenceable
- this is a ref-target inventory, not a render model
- `number` is included for constant-time ref rendering
- `caption` must not be stored here
- `displayAs` must not be stored here
- `href` must not be stored here
- `normalizedLabel` must not be stored here

### Naming rule
Use `labeledBlocks`, not `captions`.

The purpose of the list is not caption storage.
Its purpose is tracking labeled, referenceable blocks.

---

## 6.4 `citations`

```ts
type ParsedArticle = {
  citations: readonly string[];
};
```

### Rules

- array order is first appearance order in the article
- there is no `order` field
- bibliography rendering later enriches this with bibliography entries and template rules

---

## 7. Numbering Rules

## 7.1 Heading numbering

The article parser/indexer must compute heading numbering during the single-pass article collection.

### Rules
- `section` -> `1`, `2`, `3`
- `subsection` -> `1.1`, `1.2`, `2.1`
- `subsubsection` -> `1.1.1`, `1.1.2`, `2.3.1`

### Validation
- `subsection` without a parent `section` is a diagnostic
- `subsubsection` without a parent `subsection` is a diagnostic
- duplicate heading labels within the same directive identity space are diagnostics

## 7.2 Labeled block numbering

Labeled block numbering must also be computed during the article indexing pass.

However, the meaning of the number depends on plugin metadata.

Examples:

- `plotty` and `figure` share the same display family and therefore the same figure counter
- `datatable` and `table` share the same table counter
- `equation` uses its own counter
- `codesample` uses its own counter

This requires plugin metadata resolution during indexing, but the parse output must still remain minimal.

Therefore the indexer may use a plugin metadata lookup map while building `labeledBlocks`, but it must store only:

- `id`
- `pluginId`
- `label`
- `number`

---

## 8. Plugin Metadata Resolution

The article parser/indexer needs fast access to plugin metadata, but parse output must not store render-facing metadata.

Therefore the template/config phase must build reusable metadata maps.

## 8.1 Required plugin metadata

Each plugin must define:

- `id`
- `directive.kind`
- `displayAs`

Example:

```ts
type PluginMetadata = {
  id: string;
  displayAs?: DisplayAs;
  directive?: {
    name: string;
    kind: DirectiveKind;
    indexed: boolean;
    autocomplete: boolean;
  };
};
```

## 8.2 Required lookup maps

The template/config stage must build fast lookup maps such as:

```ts
type PluginRegistryMaps = {
  byId: ReadonlyMap<string, PluginMetadata>;
  displayAsByPluginId: ReadonlyMap<string, DisplayAs>;
  directiveKindByPluginId: ReadonlyMap<string, DirectiveKind>;
};
```

### Why this matters
During the article indexing pass we need fast conversion from:

- `pluginId`

to

- `displayAs`

without storing `displayAs` inside every heading or labeled block entry.

This keeps parse output small while keeping the indexing pass efficient.

---

## 9. What Must Be Removed from Current Parse Output

The following fields must be removed from article parse output:

- `content`
- `validatedBibEntries`
- `plots`
- `resolvedReferences`
- `referenceTargets`
- `captions`
- `activePluginIds`

### Why

#### `content`
This is raw input, not parse output.

#### `validatedBibEntries`
Bibliography parsing is a separate phase.

#### `plots`
Data-driven plugins must read their own workspace files.

#### `resolvedReferences`
This is a render artifact, not parse output.

#### `referenceTargets`
This is derivable from `headings` and `labeledBlocks`.

#### `captions`
Wrong abstraction and wrong name. Use `labeledBlocks`.

#### `activePluginIds`
Plugin resolution belongs to template/config processing, not article parse output.

---

## 10. What the Article Parser Must Do

The article parser must:

1. parse and validate frontmatter
2. parse markdown with `remark-directive`
3. build the article AST
4. walk the AST exactly once
5. collect headings
6. collect labeled blocks
7. collect citation usage
8. compute heading numbering
9. compute labeled block numbering
10. emit diagnostics

The article parser must not:

- re-read raw article source later
- run a second regex-based directive analysis pass
- parse workspace asset files
- resolve bibliography entries
- compute href strings
- create nested outline trees
- write to the store

---

## 11. Outline and Ref Data Strategy

## 11.1 `headings`
Used for:

- file outline panel
- quick navigation
- section ref lookup

This stays as a flat array.

UI may derive tree shape later if needed.

## 11.2 `labeledBlocks`
Used for:

- `:ref[...]` autocomplete
- block ref lookup

This also stays as a flat array.

### Important rule
Tree-shaped data such as `children` must not be stored in parse output.

Nested UI shape is a render/UI concern, not a parse concern.

---

## 12. Store Architecture

## 12.1 Parsing must not mutate store
Parsing functions must return data only.

They must not:

- call store setters
- mutate Zustand state
- write partial pipeline state

## 12.2 Coordinator applies store updates
A coordinator layer may assemble the three outputs and then write them to the store.

Example:

```ts
const parsedTemplate = parseTemplate(...)
const parsedBibliography = parseBibliography(...)
const parsedArticle = parseArticle(...)

applyPipelineResultToStore({
  template: parsedTemplate,
  bibliography: parsedBibliography,
  article: parsedArticle
})
```

This separation must be strict.

## 12.3 Store purpose
The store exists for application-level needs such as:

- live preview
- autocomplete
- active file state
- diagnostics panels
- synchronized UI interactions

The store should not required by the render engine.

---

## 13. Rendering Pipeline

The render layer is not a global cache layer and not a store concern.

Rendering is a separate consumer of parse output.

A developer who wants to parse or render an `.mda` file should be able to do so without any store in the codebase.

## 13.1 Rendering contract

Rendering consumes:

- `ParsedTemplate`
- `ParsedBibliography`
- `ParsedArticle`
- `PluginRegistryMaps`
- target (`web` or `print`)

and returns rendered output.

### Proposed render input

```ts
type RenderInput = {
  template: ParsedTemplate;
  bibliography: ParsedBibliography;
  article: ParsedArticle;
  pluginRegistry: PluginRegistryMaps;
  target: "web" | "print";
};
```

### Proposed render output

```ts
type RenderedDocument<ViewNode = unknown> = {
  body: ViewNode;
  references: ViewNode | null;
  diagnostics: readonly RenderDiagnostic[];
};
```

## 13.2 Rendering responsibility

Rendering must:

1. iterate parsed directives from the AST
2. dispatch each directive to its own plugin renderer
3. render inline directives such as:
    - `:cite[...]`
    - `:ref[...]`
    - `:fn[...]`
4. render container directives such as:
    - `:::plotty[...]`
    - `:::datatable[...]`
    - `:::section[...]`
    - `:::table[...]`
    - `:::equation[...]`
5. build the rendered references section from:
    - `article.citations`
    - `bibliography.entriesById`
    - template citation rules

## 13.3 Rendering must not depend on store

This is a strict rule.

The renderer must not require:

- Zustand
- app UI state
- preview panels
- file tabs
- autocomplete state

It may be used from the app, but it must not be coupled to the app.

## 13.4 References rendering

The bibliography/references section is not parse output.

It is rendered output.

It must be built during rendering by combining:

- the ordered citation usage list from the article
- parsed bibliography entries
- template citation style / formatting rules

Therefore the renderer returns:

- `body`
- `references`

not bibliography parse state.

---

## 14. Required Ref Lookup Strategy

Because `:ref[...]` rendering is local and independent, lookup must be fast.

The renderer must be able to resolve a ref target through:

- `HeadingEntry.id -> HeadingEntry.number`
- `LabeledBlockEntry.id -> LabeledBlockEntry.number`

And then combine that with `displayAs` from plugin metadata.

That means the render lookup path is:

1. parse output provides `id` and `number`
2. plugin registry map provides `displayAs`
3. render combines them into final text such as:
    - `Section 2.1`
    - `Figure 3`
    - `Table 4`

This is the correct split of responsibilities.

---

## 15. Final Store Shape

It must not keep raw file contents.

```ts
type WorkspaceFileEntry = {
  name: string;
  mime: string;
  lastUpdated: Date;
};

type WorkspaceState = {
  files: readonly WorkspaceFileEntry[];
  currentOpenFileName: string | null;

  parsedTemplate: ParsedTemplate | null;
  parsedBibliography: ParsedBibliography | null;
  parsedArticle: ParsedArticle | null;

  diagnostics: readonly AppDiagnostic[];
  isPipelineRunning: boolean;
};
```

### Notes

* the store must not keep raw file `data`
* the store must not keep an oversized merged pipeline result object
* the store must not keep render output
* the store must not keep plugin execution trace data in persistent article state
* the store keeps only file descriptors and parsed results
* file contents must be accessed through the file/workspace system, not duplicated into global state

### File access rule

Parsing and plugin rendering may need to read file contents, especially for JSON-backed assets.

That must be handled through a dedicated file access layer, not through the store shape itself.

Example:

```ts
type WorkspaceFileReader = {
  readText(fileName: string): Promise<string>;
  readJson<T = unknown>(fileName: string): Promise<T>;
};
```

This allows:

* parsers to read the currently relevant source file
* directive plugins to read their own asset files
* the store to stay small and stable

### Current open file rule

Only the currently open file needs to be actively edited.

Its content may live in editor-local state or in the file access layer during editing, but it must not be duplicated into the global parsed state model.

After parsing completes, the parsed result is already in the store as:

* `parsedTemplate`
* `parsedBibliography`
* `parsedArticle`

### Asset invalidation rule

When an asset file changes:

* its `lastUpdated` value changes in `files`
* memoized directive plugins detect that change
* the plugin re-reads the file through the file access layer
* the plugin re-renders

This keeps asset rendering reactive without polluting global store state with raw asset payloads.

### Architectural consequence

The store is a global coordination layer.

It is **not**:

* a raw file content cache
* a rendering cache
* a plugin-internal data store

The rendering system and plugins must obtain file contents through the file access mechanism, while the store keeps only the minimum state needed for the application shell.


---

## 16. Migration Tasks

## Phase 1 — Remove plugin resolution from article frontmatter
- delete frontmatter plugin config support
- resolve enabled plugins only from template/config
- expose `enabledPluginIds` from template phase

## Phase 2 — Split the pipeline output types
- remove the oversized `PipelineResult`
- introduce:
    - `ParsedTemplate`
    - `ParsedBibliography`
    - `ParsedArticle`

## Phase 3 — Replace loose frontmatter output with typed frontmatter
- validate against explicit schema
- return typed `ArticleFrontmatter`

## Phase 4 — Replace `captions` with `labeledBlocks`
- delete `captions`
- delete `referenceTargets`
- return flat `labeledBlocks`

## Phase 5 — Move numbering into the single article indexing pass
- compute heading numbering in the article pass
- compute labeled block numbering in the same pass
- use plugin registry metadata maps during that pass

## Phase 6 — Remove asset parsing from article pipeline
- delete `plots`
- stop parsing arbitrary JSON assets in the article parser
- leave workspace file loading to directive plugins

## Phase 7 — Remove resolved refs from parse output
- delete `resolvedReferences`
- delete any pre-render ref resolution payloads
- keep only minimal ref target inventories

## Phase 8 — Refactor worker payload and store shape
- worker returns separate logical outputs
- coordinator writes them to store
- store keeps only parsed state

## Phase 9 — Introduce a standalone rendering pipeline
- add `renderDocument(input)` API
- make it work without any store dependency
- iterate directives and dispatch to plugin renderers
- return rendered body and rendered references

---

## 17. Acceptance Criteria

The migration is complete when all of the following are true:

1. plugin enablement comes only from template/config
2. article frontmatter cannot define enabled plugins
3. article parse output is exactly:
    - typed frontmatter
    - AST
    - flat headings
    - flat labeledBlocks
    - citations array
    - diagnostics
4. bibliography parse output is separate
5. template parse output is separate
6. `content` is no longer returned as parse output
7. `plots` are no longer returned
8. `resolvedReferences` are no longer returned
9. `referenceTargets` are no longer returned
10. `captions` no longer exists as pipeline output
11. parse functions do not write to store
12. store writes happen only in the coordinator layer
13. heading numbering exists directly in `headings`
14. labeled block numbering exists directly in `labeledBlocks`
15. `:ref[...]` rendering can resolve number immediately through flat parse outputs
16. display family resolution is performed through plugin registry maps
17. rendering can be executed without any store
18. rendering returns rendered body and rendered references separately

---

## 18. Final Locked Schemas

```ts
type ParsedTemplate = {
  template: TemplateFileResolved;
  enabledPluginIds: readonly string[];
  diagnostics: readonly TemplateDiagnostic[];
};

type ParsedBibliography = {
  entriesById: Readonly<Record<string, ValidatedBibEntry>>;
  diagnostics: readonly BibtexDiagnostic[];
};

type HeadingEntry = {
  id: string;
  pluginId: "section" | "subsection" | "subsubsection";
  label: string;
  title: string;
  level: 1 | 2 | 3;
  number: string;
  parentId?: string;
};

type LabeledBlockEntry = {
  id: string;
  pluginId: string;
  label: string;
  number: number;
};

type ParsedArticle = {
  frontmatter: ArticleFrontmatter;
  ast: Root | null;
  headings: readonly HeadingEntry[];
  labeledBlocks: readonly LabeledBlockEntry[];
  citations: readonly string[];
  diagnostics: readonly AppDiagnostic[];
};

type RenderInput = {
  template: ParsedTemplate;
  bibliography: ParsedBibliography;
  article: ParsedArticle;
  pluginRegistry: PluginRegistryMaps;
  target: "web" | "print";
};

type RenderedDocument<ViewNode = unknown> = {
  body: ViewNode;
  references: ViewNode | null;
  diagnostics: readonly RenderDiagnostic[];
};
```
