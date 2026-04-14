# Artichale Component Specs

## Overview

`Artichale` is a distributable, self-contained component system located under `/components/artichale/`.

Its responsibility is limited to:

* parsing raw Artichale inputs into structured data
* rendering structured Artichale data for `web` or `print`
* exposing a reusable React component API
* exposing a print-ready composition component

It is **not** responsible for:

* workspace management
* file tabs
* live preview orchestration
* editor state
* Zustand store
* project-level helpers outside `/components/artichale/`
* importing from `workspace/`, `store/`, `hooks/`, `lib/`, or any project area outside `/components/artichale/`

`Artichale` must remain fully isolated inside `/components/artichale/`.

---

## Core Principles

1. `Artichale` is a reusable component package, not an editor subsystem.
2. Parsing and rendering must work without workspace or store.
3. Server-side rendering must be possible.
4. PDF generation must be possible with server-side rendering plus Puppeteer-like tooling.
5. Type and schema definitions must not be duplicated.
6. Input validation is schema-owned.
7. Internal runtime structures are type-owned.
8. Plugin resolution belongs to core.
9. Plugins are render-only.
10. Frontmatter splitting is internal helper logic, not a dedicated file.
11. Special renders such as title, authors, references, and page rendering are not plugins.
12. Body directives are rendered through plugins.
13. `ArtichaleView` is a print-ready composition component.
14. `ArtichaleView` consumes rendered React nodes, not parse artifacts.
15. File names use singular naming where appropriate, such as `frontmatter.parser.ts`.
16. `Artichale` must not import project internals outside `/components/artichale/`.
17. Parser plugins do not exist in this architecture.
18. Document parsing is unified and directive-first.
19. Render behavior differs by target, so `target` remains part of render behavior.
20. Web view composition belongs to the developer. Print composition belongs to `ArtichaleView`.

---

## External Dependency Libraries

These are acceptable external package dependencies for `Artichale`.
They are package dependencies, not project-internal imports.

### Core runtime dependencies

* `react`

  * component output
  * render result as `ReactNode`
* `react-dom`

  * server-side rendering support through React DOM server APIs
* `unified`

  * markdown processing pipeline foundation
* `remark-parse`

  * markdown parsing
* `remark-directive`

  * AST walking for artifact collection
* `yaml`

  * frontmatter YAML parsing
* `zod`

  * input schema validation
* `pagedjs`

  * print-ready paged rendering

### Plugin-scoped external dependencies

These are allowed only when needed by a specific plugin.

* `plotly.js-dist-min`

  * used by `plotty.plugin.tsx`
* `katex`

  * only if equation rendering requires KaTeX
* other directive-specific visualization libraries when strictly needed by a specific plugin

### Forbidden dependency direction

`Artichale` may depend on external npm packages.
It may not depend on project-internal modules outside `/components/artichale/`.

---

## Public API

## 1. Parse API

```ts
const {
  template,
  bibliography,
  frontmatter,
  ast,
  headings,
  labeledBlocks,
  citations,
  diagnostics,
} = parseArtichale({
  rawTemplate,
  rawBibliography,
  rawMarkdown,
})
```

### Parse output purpose

* `template`

  * resolved template configuration
* `bibliography`

  * strict bibliography entries matched by id
* `frontmatter`

  * validated frontmatter object
* `ast`

  * parsed markdown AST
* `headings`

  * consumer autocomplete and reference preparation
* `labeledBlocks`

  * consumer autocomplete and reference preparation
* `citations`

  * bibliography filtering and ordering input for render
* `diagnostics`

  * all parse diagnostics

## 2. Render API

```ts
const {
  title,
  authors,
  article,
  references,
  diagnostics,
} = await renderArtichale({
  target: "print" | "web",
  fnJSONAssetReader,
  fnAsssetResolver,
  template,
  bibliography,
  frontmatter,
  ast,
  citations,
})
```

### Render output purpose

* `title`

  * rendered React node for the title block
* `authors`

  * rendered React node for the author block
* `article`

  * rendered React node for the article body
* `references`

  * rendered React node for references
* `diagnostics`

  * render diagnostics

`renderArtichale()` returns rendered React nodes.
It does not create or own the web application layer.
Developers may use the returned nodes in their own web system.

## 3. View API

```tsx
<ArtichaleView
        template={template}
        title={title}
        authors={authors}
        article={article}
        references={references}
/>
```

`ArtichaleView` is the print-ready composition component.
It combines:

* template-driven print structure
* page rendering
* title block
* author block
* article body
* references block

It must not require parse artifacts such as `headings` or `labeledBlocks`.

---

## Canonical Data Model

## Parse output

`parseArtichale(...)` returns:

* `template`
* `bibliography`
* `frontmatter`
* `ast`
* `headings`
* `labeledBlocks`
* `citations`
* `diagnostics`

## Render output

`renderArtichale(...)` returns:

* `title`
* `authors`
* `article`
* `references`
* `diagnostics`

## Asset contracts

```ts
type JSONAssetReadResult<T = unknown> = {
  data: T
  lastModified?: number
}

type JSONAssetReader = <T = unknown>(
        fileName: string,
) => Promise<JSONAssetReadResult<T>>

type AssetResolverResult = {
  fileName: string
  resolvedSrc: string
  mimeType?: string
  lastModified?: number
}

type AssetResolver = (
        fileName: string,
) => Promise<AssetResolverResult | null>
```

`fnJSONAssetReader` is required for JSON-backed plugins such as `plotty` and `datatable`.
It must return parsed JSON objects with optional `lastModified` metadata.

`fnAsssetResolver` is required for file-backed directives such as:

```md
:::figure[sample_a.png]{span=page}
Sample Image Caption
:::
```

This resolver is used for non-JSON assets such as:

* images
* downloadable files
* generic file-backed plugin resources

It is the only accepted generic file resolution mechanism inside `Artichale`.

---

## Architectural Split

## Parse stage

Parsing is responsible for:

* template parsing
* bibliography parsing
* frontmatter parsing
* markdown body parsing
* AST generation
* parse-time artifact extraction
* heading extraction (numbering, stable ids, parent relationships)
* labeled block extraction 
* citation extraction
* diagnostics

Parse-time artifact extraction belongs to the parser pipeline itself.
It is implemented as an internal remark transformer used by `document.parser.ts`.
It is not part of the render plugin system.

Parsing is not responsible for:

* workspace access
* store writes
* React rendering
* asset loading
* preview concerns

## Render stage

Rendering is responsible for:

* title rendering
* author rendering
* article body rendering (plugin-based directive rendering)
* references rendering
* pages rendering for print (<ArtichaleView/>)

Rendering is not responsible for:

* workspace access
* store reads
* raw file management
* editor state

## Editor and workspace

Editor and workspace are separate systems outside `/components/artichale/`.
They may call `parseArtichale(...)` and `renderArtichale(...)`, but `Artichale` itself must not depend on them.

---

## Directive-First Architecture

`Artichale` uses a directive-first content model.
The syntax model must align directly with `remark-directive`.
No legacy compatibility rewrite layer is allowed.
No alternate fallback syntax is allowed.
No parallel old/new directive parsing path is allowed.

### Built-in directive families in current version

The built-in directive families in the current version are:

* `:cite[...]`
* `:ref[...]`
* `:fn[...]`
* `:::abstract[...]`
* `:::plotty[...]`
* `:::datatable[...]`
* `:::figure[...]`
* `:::table[...]`
* `:::equation[...]`
* `:::codesample[...]`
* `:::section[...]`
* `:::subsection[...]`
* `:::subsubsection[...]`

This list describes the current built-in plugin set.
It does not forbid adding new plugins later.

### Directive kinds

```ts
enum DirectiveKind {
  TEXT = "text",
  CONTAINER = "container",
}
```

Current expectations:

* text directives

  * `cite`
  * `ref`
  * `fn`
* container directives

  * `abstract`
  * `plotty`
  * `datatable`
  * `figure`
  * `table`
  * `equation`
  * `codesample`
  * `section`
  * `subsection`
  * `subsubsection`

### Directive authoring model

Text directives:

```md
:cite[key]
:ref[label]
:fn[label]
```

Container directives:

```md
:::plugin_id[data_file]{span=column|page}
Caption or block content
:::
```

Examples:

```md
:::plotty[sales_by_month.json]{span=page}
Monthly Sales
:::
```

```md
:::figure[sample_a.png]{span=page}
Sample Image Caption
:::
```

```md
:::section[introduction]
Introduction
:::
```

Rules:

* `data_file` is the primary asset identity for file-backed directives
* inner content remains plugin-owned content
* plugin decides how to interpret its own node body
* parser only recognizes directive structure and preserves the AST
* parser must not parse plugin-owned asset semantics

### Display family and indexing

Numbering and reference generation are display-family based.
This is resolved through plugin metadata.

Examples:

* `plotty` -> figure family
* `figure` -> figure family
* `datatable` -> table family
* `table` -> table family
* `equation` -> equation family
* `codesample` -> code family
* `section` -> section family
* `subsection` -> subsection family
* `subsubsection` -> subsubsection family
* `ref` -> ref family
* `cite` -> cite family
* `fn` -> link family
* `link` -> link family

This is required for:

* `headings`
* `labeledBlocks`
* numbering
* `:ref[...]` lookup
* consumer autocomplete

---

## Plugin Architecture

Plugins are render-only directive plugins.
No parser plugins.
No editor plugins inside Artichale core.
No workspace access.
No store access.

### Plugin metadata

Every directive-capable plugin must declare metadata that fully describes its directive behavior.
The plugin metadata is the single source of truth for directive modeling, indexing behavior, and autocomplete generation.

```ts
enum DisplayAs {
  ABSTRACT = "abstract",
  FIGURE = "figure",
  TABLE = "table",
  EQUATION = "equation",
  CODE = "code",
  SECTION = "section",
  SUBSECTION = "subsection",
  SUBSUBSECTION = "subsubsection",
  REF = "ref",
  CITE = "cite",
  LINK = "link",
}

type PluginDefinition = {
  id: string
  name: string
  displayAs: DisplayAs
  kind: DirectiveKind
  autocomplete: boolean
  version?: string
  description?: string
  render: (props: PluginRenderProps) => React.ReactNode
}
```

### Plugin contract

```ts
type PluginRenderProps = {
  target: "web" | "print"
  template: TemplateResolved //  displayAs family definitions are resolved from template
  node: DirectiveNode // from remark-directive
  fnJSONAssetReader?: JSONAssetReader
  fnAsssetResolver?: FileResolver
}
```

### Plugin utilities

Plugins may use shared utility helpers inside `/components/artichale/`.
These are small focused helpers, not generic dump files.

if  necessary.  Probably we  don't need  this. 
```ts
parseDirectiveNode(node: DirectiveNode)
```

Extracts directive-level fields such as:

* `label`
* `dataFile`
* `caption`
* `attributes`

```ts
toDirectiveId(pligunId: string, input: string)
```

Builds a stable normalized id from `label` or `data_file`.
This is used by `artifacts.collector.ts` for:

* stable ids
* unique checks
* reference lookup preparation

### Plugin memoization

Each plugin maintains two memoization layers when needed:

* title/caption memoization
* visual/content memoization

Visual/content memoization uses `lastModified` when available from:

* `fnJSONAssetReader`
* `fnAsssetResolver`

### Plugin responsibility classes

#### Data-driven plugins

Examples:

* `plotty`
* `datatable`
* `figure`

Responsibilities:

* use `label` or `data_file` as the asset identity
* read JSON via `fnJSONAssetReader` when the asset is JSON-backed
* read file-backed assets via `fnAsssetResolver` when the asset is not JSON
* render the resolved asset
* render the caption
* emit the correct anchor id

#### Inline scholarly block plugins

Examples:

* `table`
* `equation`
* `codesample`

Responsibilities:

* interpret their own node body
* render their own node body
* render the caption
* emit correct anchor id

#### Heading plugins

Examples:

* `section`
* `subsection`
* `subsubsection`

Responsibilities:

* render heading text from node content
* emit heading anchor
* cooperate with numbering and reference lookup

### Plugin rules

Each plugin must:

* accept render context only
* consume the raw directive node directly
* never import workspace
* never import store
* never import from project-level helpers outside `/components/artichale/`
* never import hooks outside `/components/artichale/`
* use `fnJSONAssetReader` when structured JSON input is required
* use `fnAsssetResolver` when generic file-backed assets are required
* keep memoized rendering behavior where necessary for performance
* emit correct anchor ids for indexed/referenceable directives

### Consumer autocomplete rule

Autocomplete generation must come from plugin metadata, not hardcoded directive lists.
`Artichale` itself is not the editor layer, but its plugin metadata must be sufficient for an external consumer to generate correct completions.

### Compatibility rule

The following must not remain in the codebase:

* `[cite:...]`
* `[ref:...]`
* `[caption:...]`
* rewrite-based directive header parsing
* parallel legacy syntax paths
* compatibility fallback hacks inside directive rendering

---

## Directory Structure

```txt
/components/artichale/
  index.ts
  ArtichaleView.tsx

  base/
    base.template.print.css
    base.template.web.css
    print.mechanics.css

  core/
    artichale.parser.ts
    artichale.render.ts
    artichale.util.ts
    plugin.registry.ts
    artifacts.collector.ts
    reference.lookup.ts
    diagnostic.ts

  parser/
    template.parser.ts
    bibliography.parser.ts
    frontmatter.parser.ts
    document.parser.ts

  render/
    document.render.tsx
    title.render.tsx
    author.render.tsx
    bibliography.render.tsx
    page.render.tsx

  plugins/
    abstract.plugin.tsx
    cite.plugin.tsx
    codesample.plugin.tsx
    datatable.plugin.tsx
    equation.plugin.tsx
    figure.plugin.tsx
    fn.plugin.tsx
    plotty.plugin.tsx
    ref.plugin.tsx
    section.plugin.tsx
    subsection.plugin.tsx
    subsubsection.plugin.tsx
    table.plugin.tsx

  schema/
    template.schema.ts
    frontmatter.schema.ts

  types/
    article.types.ts
    pipeline.types.ts
    plugin.types.ts
    reference.types.ts
    render.types.ts
    template.types.ts

```

---

## File Responsibilities

## Root

### `index.ts`

Public export surface only.
Exports:

* `parseArtichale`
* `renderArtichale`
* `ArtichaleView`
* public types required by consumers

### `ArtichaleView.tsx`

Final print-ready composition component.
Consumes:

* `template`
* `title`
* `authors`
* `article`
* `references`

---

## Base

### `base/base.template.print.css`

Base print template styles.

### `base/base.template.web.css`

Base web template styles.

### `base/print.mechanics.css`

Base print mechanics styles, including:

* page breaks
* page flow rules
* page margin structures
* print-specific mechanics

---

## Core

### `core/artichale.parser.ts`

Single public parse facade.
Responsibilities:

* split frontmatter internally with a private helper
* call template parser
* call bibliography parser
* call frontmatter parser
* call document parser
* call artifact collector
* merge diagnostics
* return canonical parse result

This file is orchestration only.
It must not contain schema definitions.
It must not contain large parsing implementations.

### `core/artichale.render.ts`

Single public render facade.
Responsibilities:

* prepare render context
* resolve plugin registry from `template.plugins`
* build reference lookup
* call title render
* call author render
* call document body render
* call bibliography render
* assemble final output

This file is orchestration only.

### `core/plugin.registry.ts`

Render plugin registry only.
Responsibilities:

* register all built-in render plugins
* resolve enabled plugin list from template
* expose lookup maps
* provide the render entrypoint expected from each plugin

This file is core infrastructure.
It must not live under `plugins/` as registry logic.

### `core/artifacts.collector.ts`

Parse-time artifact collector logic used by `document.parser.ts`.
This is an internal parser transformer implementation.
It is not part of the render plugin system.

Responsibilities:

* walk the directive-bearing markdown AST during parser execution
* collect `headings`
* collect `labeledBlocks`
* collect `citations`
* perform numbering
* build stable ids from `label` or `data_file`
* perform duplicate detection
* perform parent relationship detection
* perform unique id checks
* emit parse diagnostics related to collected artifacts

This file is not a renderer.
This file is not a render plugin.
This file belongs to the parser layer, even though it is stored under `core/` as shared parser infrastructure.

### `core/reference.lookup.ts`

Creates render-time reference lookup from parse artifacts.
Responsibilities:

* resolve heading refs
* resolve labeled block refs
* prepare fast lookup maps

### `core/diagnostic.ts`

Shared diagnostic helpers.
Responsibilities:

* consistent diagnostic creation
* offsets and location helpers
* diagnostic normalization

---

## Parser

### `parser/template.parser.ts`

Parses raw template input.
Responsibilities:

* schema validation
* default resolution
* template diagnostics

### `parser/bibliography.parser.ts`

Parses raw bibliography input.
Responsibilities:

* bibliography validation
* normalized bibliography structure
* bibliography diagnostics

### `parser/frontmatter.parser.ts`

Parses raw frontmatter input only.
Responsibilities:

* YAML object parsing
* schema validation
* frontmatter normalization
* frontmatter diagnostics

It must not split markdown.
It receives raw frontmatter only.

### `parser/document.parser.ts`

Parses raw markdown body only.
Responsibilities:

* parse markdown body into AST
* register the internal artifact collector transformer
* return AST plus parse artifacts produced during parser execution
* no render
* no workspace
* no render plugin runtime logic

Plugins are not parser plugins.
This parser creates the canonical document AST and runs the internal artifact collector in the same parser pipeline.

---

## Render

### `render/document.render.tsx`

Renders the AST body.
Responsibilities:

* walk AST
* resolve render plugin for each directive
* render body nodes
* use `fnJSONAssetReader` for plugin asset needs
* use `fnAsssetResolver` for generic file-backed directives

This file handles plugin-driven body rendering only.

### `render/title.render.tsx`

Renders the title block.
Responsibilities:

* title
* title-level frontmatter presentation
* title layout according to template

### `render/author.render.tsx`

Renders the author block.
Responsibilities:

* author list
* affiliations
* ORCID
* corresponding author presentation

### `render/bibliography.render.tsx`

Renders the references section.
Responsibilities:

* filter bibliography by `citations`
* order entries according to `template.bibliography`
* output final references block

### `render/page.render.tsx`

Renders page composition structure for target output.
Responsibilities:

* print page wrappers
* page chrome

---

## Plugins

Plugins are render-only directive plugins.
No parser plugins.
No editor plugins inside Artichale core.
No workspace access.
No store access.

### `plugins/abstract.plugin.tsx`

Renders abstract directives.

### `plugins/cite.plugin.tsx`

Renders `:cite[...]` directives.

### `plugins/codesample.plugin.tsx`

Renders code sample directives.

### `plugins/datatable.plugin.tsx`

Renders datatable directives using `fnJSONAssetReader`.

### `plugins/equation.plugin.tsx`

Renders equation directives.

### `plugins/figure.plugin.tsx`

Renders figure directives using `fnAsssetResolver`.

### `plugins/fn.plugin.tsx`

Renders `:fn[...]` directives.

### `plugins/plotty.plugin.tsx`

Renders plot directives using `fnJSONAssetReader`.

### `plugins/ref.plugin.tsx`

Renders `:ref[...]` directives.

### `plugins/section.plugin.tsx`

Renders section directives.

### `plugins/subsection.plugin.tsx`

Renders subsection directives.

### `plugins/subsubsection.plugin.tsx`

Renders subsubsection directives.

### `plugins/table.plugin.tsx`

Renders table directives.

---

## Schema

### `schema/template.schema.ts`

Schema for raw template input.
Type is derived from schema.

### `schema/frontmatter.schema.ts`

Schema for raw frontmatter input.
Type is derived from schema.

### Schema rule

Input models must not be manually duplicated as separate type definitions.
For validated input shapes, schema is the single source of truth.

---

## Types

### `types/article.types.ts`

Internal article structures:

* `HeadingEntry`
* `LabeledBlockEntry`
* AST-related supporting internal types if needed

### `types/pipeline.types.ts`

Top-level parse and render result types.

### `types/plugin.types.ts`

Plugin metadata and registry maps.

### `types/reference.types.ts`

Reference lookup and resolved ref types.

### `types/render.types.ts`

Render input/output contracts.

### `types/template.types.ts`

Resolved template types only.
No duplicated raw input type definitions.

---

## Utilities

### `core/artichale.util.ts`

Id utility helpers. its  for  (anchor) stable id generation from directive inputs.
Responsibilities:

* `toDirectiveId(pluginId, input)`
* building stable ids from `pluginId` and, `label` or `data_file`
* supporting unique checks
* supporting artifacts collector and reference lookup

---

## Import Rules

Files inside `/components/artichale/` must not import from:

* `/lib/`
* `/workspace/`
* `/store/`
* `/hooks/`
* `/components/editor/`
* any project area outside `/components/artichale/`

Allowed imports are:

* internal imports from within `/components/artichale/`
* external npm package imports such as React, Unified, Remark, Zod, YAML, Paged.js, and plugin-scoped libraries

---

## Naming Rules

* Directory name is `artichale`
* Public component name is `ArtichaleView`
* File names use singular naming where appropriate
* Parser files use `*.parser.ts`
* Render files use `*.render.tsx`
* Plugin files use `plugin_id.plugin.tsx`
* Collector file uses `artifacts.collector.ts`

Examples:

* `frontmatter.parser.ts`
* `template.parser.ts`
* `bibliography.parser.ts`
* `document.parser.ts`
* `section.plugin.tsx`
* `subsection.plugin.tsx`
* `subsubsection.plugin.tsx`
* `page.render.tsx`

---

## Explicit Non-Goals

The following do not belong inside `/components/artichale/`:

* editor UI
* workspace file browser
* live preview coordination
* persistent store state
* file tab state
* raw workspace file source of truth
* application-level hooks

These belong elsewhere, such as `/components/editor/` and other app-specific layers.

---

## Final Rule Set

1. `Artichale` is a self-contained component package.
2. Parser and renderer must run without workspace or store.
3. Plugins are render-only.
4. Frontmatter splitting is internal helper logic, not a dedicated file.
5. Special renders are not plugins.
6. Body directives are plugin-rendered.
7. Base styles are part of the architecture.
8. No project-internal imports from outside `/components/artichale/`.
9. No duplicated input type and schema definitions.
10. `ArtichaleView` consumes render output, not parse helper artifacts.
11. `renderArtichale()` returns rendered React nodes for `title`, `authors`, `article`, and `references`.
12. `ArtichaleView` is print-ready composition only.
13. `target` remains part of render behavior because plugin rendering and page composition differ between `web` and `print`.
14. Parser plugins do not exist.
15. Plugin metadata is the single source of truth for directive behavior and indexing behavior.
16. File-backed directives use `fnAsssetResolver`.
17. JSON-backed directives use `fnJSONAssetReader`.
18. Bibliography render filters strict bibliography entries by cited ids.
19. Web view composition belongs to the consuming developer.
20. Print-ready composition belongs to `ArtichaleView`.
