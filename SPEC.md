# Product Specification

## Overview

Artichales is an offline-first academic writing and publishing system centered on a Markdown-first workflow and delivered primarily as a Chrome extension editor. It uses a shadcn-compatible component architecture and a plugin-based pipeline to produce two render targets from a single source: print (PDF) and web (HTML/React). The initial product is intentionally local-first and focuses on a single current document.

Authoring inputs are a Markdown file, a BibTeX file, and a workspace-level `template.json`. The same Markdown source renders to both print output (templating → PDF) and web output (templating → HTML as a React surface). Visual template behavior is primarily CSS-driven (`templates/classic_web.css`, `templates/classic_print.css`), while `template.json` stores layout-only data that CSS cannot represent (page size/margins, header/footer tokens, print layout options).

Plugin contracts, hook signatures, and directive payload schemas are defined in `PLUGIN_SPEC.md`.
Extension runtime behavior, storage details, and filesystem interactions are defined in `EXTENSION.md`.
Asset embedding, loading, and accessibility rules for artifacts are defined in `ARTIFACT_SPEC.md`.

**Inputs**
- Markdown document body
- gray-matter frontmatter
- BibTeX entries (single `.bib` source)
- `template.json` (layout-only template config for `web` and `print`)
- local assets
- selected template name
- enabled built-in plugins
- selected preview target

**Outputs**
- normalized document model
- document indexes
- full print preview
- full web preview
- partial render fragments
- validated references and citation graph
- normalized render tree for print
- normalized render tree for web
- PDF export
- reusable Artichales components


### `paper.md`
```md
---
title: "A Shared Markdown Pipeline for Print and Web Publishing"
authors:
  - name: "Goker Cebeci"
    affiliation: "KODKAFA"
    orcid: "0000-0002-1825-0097"
keywords:
  - markdown
  - publishing
  - academic writing
template: "classic"
references: 
  - style: "ieee"
  - source: "./refs.bib"
---
:::abstract
Lorem ipsum dolor sit amet.
:::


# Introduction
Lorem ipsum dolor sit amet [cite:knuth1984].

# Methods
Lorem ipsum dolor sit amet.

# Results
Lorem ipsum dolor sit amet.

# Conclusion
Lorem ipsum dolor sit amet.
```

### refs.bib
```
@article{knuth1984,
  author = {Donald E. Knuth},
  title = {Literate Programming},
  journal = {The Computer Journal},
  year = {1984},
  volume = {27},
  number = {2},
  pages = {97--111}
}
```



## Purpose and Scope

Artichales addresses the gap between traditional academic authoring tools and modern component-based writing systems. The goal is to keep Markdown as the canonical source while providing a structured academic pipeline for references, citations, figures, tables, equations, print preview, web preview, and PDF export.

**Solutions**
The system is designed around a shared rendering core and a reusable component layer. The same core must drive:
- editor behavior
- print preview
- web preview
- partial rendering
- PDF export
- Chrome extension application surfaces
- shadcn-installed component usage

**In scope**
- single-document academic authoring
- offline-first editing
- print preview and web preview
- normalized render tree generation
- partial rendering
- controlled BibTeX ingestion and validation
- built-in plugin execution
- PDF export through the browser print pipeline
- shadcn registry-compatible component installation

**Out of scope for the initial version**
- collaborative editing
- multi-document workspace management
- remote publishing
- content injection into third-party pages
- runtime plugin downloading
- arbitrary remote plugin execution


## Goals

- produce stable print and web outputs from the same Markdown source
- use a normalized render tree as the single rendering contract
- preserve academic structures across both targets
- support full-document and partial rendering
- keep the system local-first and usable offline
- provide reusable shadcn-compatible components
- make the Chrome extension use the same components and the same rendering core
- keep plugins built-in, deterministic, and explicit
- export PDF through the print pipeline without introducing a separate PDF authoring model

## Core Principles

Artichales is source-first. Markdown and frontmatter are the canonical authoring inputs.

Artichales is Markdown-first. Standard Markdown remains the base authoring format. Academic extensions are added through directives, parsing, indexing, and plugins.

Artichales is render-tree-first. The shared rendering contract is a normalized render tree. Print preview, web preview, partial render updates, and PDF export all consume this render tree.

Artichales is component-driven. The editor and preview surfaces are reusable shadcn-compatible components. The Chrome extension uses the same components from the same repository.

Artichales is local-first. The initial version works without a remote backend and uses local persistence.

Artichales is plugin-extensible. Built-in plugins extend parsing, rendering, editor UI, and shared core behavior. Plugin details are defined separately in `PLUGIN_SPEC.md`.

Artichales is artifact-aware. PDF and asset behavior are defined separately in `ARTIFACT_SPEC.md`.

Artichales keeps template scope layout-centric. Feature behavior flags that belong to the feature itself (for example interaction toggles) are not part of template config.

**Detailed features**
- Markdown editor with local persistence
- print preview and web preview
- full render and partial render
- template selection by name (currently `classic`) with CSS template styles plus `template.json` layout config
- plugin registry and plugin lifecycle
- BibTeX import, parse, normalize, validate, and bibliography render
- citation linking and cross-reference indexing (`[cite:...]`, `[ref:...]`)
- figures, tables, captions, equations, and academic blocks
- `plotty` directive rendering with caption + cross-reference anchors
- `datatable` directive rendering with sortable table UI (filter shown in web target only)
- print header/footer and page number token support (`{pageNumber}`)
- embeddable React surfaces
- Chrome extension packaging
- shadcn-compatible component composition

**Input definitions**
- raw Markdown content
- frontmatter metadata
- BibTeX text or normalized reference entries
- template name (string; currently `classic`)
- `template.json` data (print/web layout metadata)
- plugin definitions and plugin configuration
- local assets
- editor interactions
- preview target selection

**Output definitions**
- normalized document model
- document indexes
- full print render
- full web render
- partial rendered fragments
- validated references
- citation map
- bibliography output
- PDF artifact
- HTML artifact
- host-mountable editor and preview surfaces

## Architecture
### Component Architecture

Artichales is organized around four layers:

1. **Core layer**
   - frontmatter parsing
   - Markdown parsing
   - BibTeX parsing and normalization
   - indexing
   - diagnostics
   - partial invalidation
   - normalized render tree generation

2. **Plugin layer**
   - built-in core plugins
   - built-in parser plugins
   - built-in render plugins
   - built-in editor plugins

3. **Component layer**
   - editor components
   - web preview components
   - print preview components
   - panel and surface components
   - shared UI primitives

4. **Application layer**
   - Chrome extension application
   - local persistence
   - file import/export
   - PDF export

The extension application must consume the same Artichales components and the same core logic defined in this repository. No separate extension-only rendering system is allowed.

### Repository Shape

```txt
src/
  artichales.json
  components.json
  components/
    artichales/
      editor/
      preview/
        web/
        print/
      panels/
      surfaces/
      templates/
        classic_print.css
        classic_web.css
      plugins/
        citation.core.plugin.tsx
        citation.parser.plugin.tsx
        citation.render.plugin.tsx
      citation.editor.plugin.tsx
  lib/
  hooks/
  app/
    editor/
      components/
      page.tsx
  types/
```

### Pipelines

#### Document parse pipeline
- read Markdown source and frontmatter
- parse frontmatter with gray-matter
- parse Markdown into an intermediate syntax tree
- run registered parser plugins in a deterministic order
- parse and normalize BibTeX reference input
- validate references against supported schemas
- build the normalized document model
- build document indexes for headings, citations, figures, tables, and cross-references

#### Full render pipeline
- load normalized document model
- resolve render target as print or web
- resolve selected template name into template CSS files
- merge default layout config with workspace `template.json` (`web` / `print`)
- run render plugins
- generate target HTML structure
- attach target styles, assets, and metadata
- return full render result

#### Partial render pipeline
- load normalized document model
- determine affected fragment from editor changes or render request
- resolve fragment dependencies such as citations, numbering, and cross-references
- re-render only the requested fragment or affected render region
- update preview surface or host component
- preserve full-document indexes unless invalidated by structural changes

#### Editor pipeline
- ingest user input
- persist draft locally
- debounce parse requests
- update diagnostics
- perform partial or full preview render
- refresh editor and preview UI state

#### Extension pipeline
- mount shared editor or preview surface inside popup, options page, or content script host
- use shared core for parsing and rendering
- autosave current Markdown, BibTeX, `template.json`, and local data files into extension local storage for offline persistence
- expose export, preview, and insertion actions through extension UI

#### Shadcn integration pipeline
- expose editor and preview primitives as reusable React components
- wrap primitives in host-compatible composable components
- allow host apps to compose Artichales surfaces into their own layouts without forking logic

## Models

### Author

**Fields**
- `name`: string
- `affiliation?`: string
- `email?`: string
- `orcid?`: string
- `url?`: string

### BibliographySource

**Fields**
- `style`: string
- `source`: string

### DocumentFrontmatter

**Fields**
- `title`: string
- `authors`: Author[]
- `keywords?`: string[]
- `template`: string
- `bibliography`: BibliographySource
- `plugins?`: PluginConfigMap

### AssetRef

**Fields**
- `type`: string
- `path`: string

### SourceRange

**Fields**
- `start`: number
- `end`: number

### Diagnostic

**Fields**
- `code`: string
- `message`: string
- `severity`: "error" | "warning" | "info"
- `range?`: SourceRange

### DocumentBlock

**Fields**
- `id`: string
- `type`: string
- `range`: SourceRange
- `data?`: Record<string, unknown>
- `children?`: DocumentBlock[]

### ReferenceEntry

**Fields**
- `id`: string
- `type`: "article" | "book" | "inproceedings" | "online"
- `title`: string
- `authors?`: string[]
- `year`: string
- `fields`: Record<string, string>

### HeadingIndex

**Fields**
- `id`: string
- `level`: number
- `text`: string
- `number?`: string
- `range`: SourceRange

### FigureIndex

**Fields**
- `id`: string
- `label`: string
- `number`: number
- `range`: SourceRange

### TableIndex

**Fields**
- `id`: string
- `label`: string
- `number`: number
- `range`: SourceRange

### CitationIndex

**Fields**
- `id`: string
- `referenceId`: string
- `range`: SourceRange

### CrossReferenceIndex

**Fields**
- `id`: string
- `targetId`: string
- `range`: SourceRange

### FragmentIndex

**Fields**
- `id`: string
- `type`: "document" | "abstract" | "body" | "references" | "section" | "figure" | "table"
- `range`: SourceRange
- `dependsOn`: string[]

### DocumentIndexes

**Fields**
- `headings`: HeadingIndex[]
- `figures`: FigureIndex[]
- `tables`: TableIndex[]
- `citations`: CitationIndex[]
- `crossReferences`: CrossReferenceIndex[]
- `fragments`: FragmentIndex[]

### DocumentSource

**Fields**
- `frontmatter`: DocumentFrontmatter
- `markdown`: string
- `bibtex`: string
- `assets`: AssetRef[]

### DocumentModel

**Fields**
- `frontmatter`: DocumentFrontmatter
- `blocks`: DocumentBlock[]
- `references`: ReferenceEntry[]
- `indexes`: DocumentIndexes
- `diagnostics`: Diagnostic[]

### RenderTarget

See `PLUGIN_SPEC.md` for complete plugin type definitions.

```ts
type RenderTarget = "print" | "web"
```

### RenderTreeNode

**Fields**
- `id`: string
- `type`: string
- `props?`: Record<string, unknown>
- `children?`: RenderTreeNode[]

### RenderRequest

**Fields**
- `target`: RenderTarget
- `mode`: "full" | "partial"
- `fragmentId?`: string
- `templateName`: string
- `pluginOverrides?`: Record<string, unknown>

### RenderResult

**Fields**
- `target`: RenderTarget
- `mode`: "full" | "partial"
- `tree`: RenderTreeNode[]
- `fragments?`: Record<string, RenderTreeNode[]>
- `diagnostics?`: Diagnostic[]

---

## Plugins

Plugin system is fully defined in `PLUGIN_SPEC.md` including:
- Plugin categories (core, parser, render, editor)
- PluginDefinition interface
- PluginHooks interface
- Plugin contexts and result types
- Execution order and conflict resolution
- Syntax ownership rules
- Configuration schema

---

### TemplateDefinition

templates/classic_print.json
```json
{
  "id": "classic_print",
  "target": "print",
  "version": 1,
  "meta": {
    "label": "Classic Print",
    "description": "Academic print layout optimized for PDF export"
  },
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margin": {
      "top": "24mm",
      "right": "20mm",
      "bottom": "24mm",
      "left": "20mm"
    }
  },
  "document": {
    "language": "en",
    "columns": 1,
    "lineHeight": 1.55,
    "fontFamily": {
      "body": "Source Serif 4",
      "heading": "Inter",
      "mono": "JetBrains Mono",
      "math": "KaTeX_Main"
    },
    "fontSize": {
      "body": "11pt",
      "footnote": "9pt",
      "caption": "9.5pt",
      "h1": "20pt",
      "h2": "15pt",
      "h3": "12pt"
    },
    "textAlign": "justify"
  },
  "titleBlock": {
    "enabled": true,
    "align": "center",
    "showAuthors": true,
    "showAffiliations": true,
    "showKeywords": true,
    "spacingAfter": "12mm"
  },
  "abstract": {
    "enabled": true,
    "title": "Abstract",
    "box": false,
    "spacingAfter": "8mm"
  },
  "headings": {
    "numbering": true,
    "h1": {
      "marginTop": "10mm",
      "marginBottom": "4mm",
      "borderBottom": false
    },
    "h2": {
      "marginTop": "7mm",
      "marginBottom": "3mm"
    },
    "h3": {
      "marginTop": "5mm",
      "marginBottom": "2mm"
    }
  },
  "paragraphs": {
    "indentFirstLine": false,
    "spacingAfter": "3.5mm"
  },
  "lists": {
    "spacingAfter": "3mm"
  },
  "equations": {
    "align": "center",
    "numbering": true,
    "numberPosition": "right",
    "spacingBefore": "3mm",
    "spacingAfter": "3mm"
  },
  "figures": {
    "captionPosition": "bottom",
    "captionAlign": "center",
    "numbering": true,
    "maxWidth": "100%",
    "spacingBefore": "5mm",
    "spacingAfter": "5mm"
  },
  "tables": {
    "captionPosition": "bottom",
    "captionAlign": "center",
    "numbering": true,
    "cellPadding": "6px",
    "headerBold": true,
    "borderStyle": "horizontal-only",
    "spacingBefore": "5mm",
    "spacingAfter": "5mm"
  },
  "citations": {
    "style": "numeric",
    "linkable": true
  },
  "references": {
    "enabled": true,
    "title": "References",
    "style": "numeric",
    "hangingIndent": "8mm",
    "spacingBetweenItems": "2mm"
  },
  "headerFooter": {
    "enabled": true,
    "header": {
      "left": "",
      "center": "",
      "right": "{title}"
    },
    "footer": {
      "left": "",
      "center": "{pageNumber}",
      "right": ""
    }
  },
  "pageBreakRules": {
    "avoidBreakInside": [
      "figure",
      "table",
      "blockquote",
      "code"
    ],
    "keepHeadingWithNext": true,
    "orphans": 2,
    "widows": 2
  },
  "pdf": {
    "enabled": true,
    "printBackground": true,
    "preferCSSPageSize": true,
    "displayHeaderFooter": false
  }
}
```

templates/classic_web.json
```json
{
  "id": "classic_web",
  "target": "web",
  "version": 1,
  "meta": {
    "label": "Classic Web",
    "description": "Readable web article layout rendered as a React surface"
  },
  "container": "article",
  "headings": {
    "numbering": true,
    "anchorLinks": true,
    "scrollOffset": "96px"
  },
  "equations": {
    "align": "center",
    "numbering": true,
    "inlineOverflow": "scroll"
  },
  "figures": {
    "captionPosition": "bottom",
    "captionAlign": "left",
    "numbering": true,
    "zoomable": true,
    "maxWidth": "100%"
  },
  "tables": {
    "captionPosition": "bottom",
    "captionAlign": "left",
    "numbering": true,
    "overflowX": "auto",
    "stickyHeader": false
  },
  "citations": {
    "style": "numeric",
    "linkable": true,
    "previewOnHover": false
  },
  "references": {
    "enabled": true,
    "title": "References",
    "style": "numeric",
    "backLinksToCitations": true
  }
}
```


**Template resolution (initial version)**
- the selected template name is a string and must resolve to two files under `templates/`
  - `templates/<name>_print.json`
  - `templates/<name>_web.json`
- all PDF-relevant layout requirements must be defined by the print template

```ts
const printTemplate = resolveTemplate("classic", "print");
const webTemplate = resolveTemplate("classic", "web");

const printRender = renderDocument({
  source: markdownSource,
  bibtex: bibtexSource,
  target: "print",
  template: printTemplate
});

const pdfArtifact = exportPdf(printRender);

const {title, authors, abstract, body, references} = renderDocument({
  source: markdownSource,
  bibtex: bibtexSource,
  target: "web",
  template: webTemplate
});
```


## Plugins

### Plugin Categories

Artichales supports four built-in plugin categories in the initial version:

- core plugins
- parser plugins
- render plugins
- editor plugins

### File Naming Convention

Built-in plugins must follow these file naming conventions under `components/artichales/plugins/`:

- `x.core.plugin.tsx`
- `x.parser.plugin.tsx`
- `x.render.plugin.tsx`
- `x.editor.plugin.tsx`

A feature may provide one or more of these files depending on its scope.

### Plugin Loading Rules

- plugins are built-in only
- plugins are loaded from this repository
- execution order must be deterministic
- plugin configuration must be explicit
- plugin contract details are defined in `PLUGIN_SPEC.md`

### Initial Authoring Syntax

**Citations**
- single citation: `[cite:knuth1984]`
- multiple citations: `[cite:knuth1984, cite:brown2022]`

**Tables**
- tables are expressed using directive blocks and routed to table plugins
- `:::table` routes to the default table plugin
- `:::table[tabularx]` routes to the tabularx table plugin
- table data payload format will be specified later in `PLUGIN_SPEC.md`

**Examples**

```md
:::table
...table data...
:::

:::table[tabularx]
...table data...
:::
```

**Academic directives**
- directive-based extensions are allowed for academic authoring
- supported directive contracts are defined by built-in plugins
- detailed syntax and payload contracts are defined in `PLUGIN_SPEC.md`

## User Flows

### Author editing flow
- open or create the current document
- edit frontmatter, Markdown content, and references
- switch between print preview and web preview
- continue editing with immediate preview updates
- export PDF when ready

### Reference flow
- import BibTeX
- validate normalized entries
- insert citation identifiers into content
- inspect references in preview
- resolve validation errors

### Plugin flow
- enable or disable built-in plugins
- configure plugin options
- trigger re-parse or re-render when needed
- inspect diagnostics if configuration is invalid

### Component installation flow
- run `npx shadcn@next add <registry>/artichales.json`
- install Artichales components under `components/artichales/`
- use the installed editor and preview components in the application
- use the same components inside the extension application

### System flows

#### Parse flow
- read source
- parse frontmatter
- parse Markdown
- run parser plugins
- parse BibTeX
- validate models
- build indexes
- store diagnostics

#### Preview flow
- determine target and fragment scope
- resolve template
- generate the normalized render tree
- update UI surfaces

#### Plugin flow
- load registry
- resolve enabled plugins
- validate plugin configuration
- run hooks in declared order
- attach results to parse, render, editor, or core flow



## Technical stack

### Runtime & build
- Bun
- TypeScript
- Vite
- React

### UI & utilities
- Tailwind CSS v4
- shadcn/ui-compatible component composition
- Radix UI primitives
- class-variance-authority
- clsx
- tailwind-merge
- lucide-react
- tw-animate-css

### Code quality
- Biome (@biomejs/biome)

### Extension tooling
- @crxjs/vite-plugin
- @types/chrome

### Distribution
- shadcn registry-compatible distribution
- `artichales.json` registry entry
- install target: `components/artichales/`

### Core libraries
- gray-matter
- unified
- remark-parse
- remark-gfm
- remark-math
- remark-directive
- remark-rehype
- rehype-katex
- a BibTeX parser and validator
- a local persistence layer
- a render invalidation layer
- a normalized render tree mapper
- a browser print pipeline for PDF export
