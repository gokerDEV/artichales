# Product Specification

## 1. Overview

Artichales is a local-first academic authoring system with one canonical Markdown source and one workspace-local template source.
The system renders `web` and `print` targets from the same document model and plugin pipeline.

## 2. Workspace Contract

Each workspace must include:

1. `template.json`
2. `article.mdx`
3. `references.bib`

File tree ordering:

1. `template.json`
2. `article.mdx`
3. `references.bib`
4. all remaining files alphabetically

No frontmatter template selection is required or used.

## 3. Canonical Inputs and Outputs

Inputs:

- `article.mdx`
- `references.bib`
- `template.json`
- local data/assets (`*.json`, media)

Outputs:

- web preview
- paginated print preview
- PDF export from the same paginated print structure

## 4. Template Architecture

Single template file per workspace: `template.json`.
No multi-template switching and no per-journal hardcoded renderer branches.

Top-level schema:

- `version`
- `journal`
- `default`
- `print`
- `web`

### 4.1 `default`

Reusable cross-target defaults:

- typography (font family, sizes, line height, alignment)
- colors
- component defaults:
  - figure (`captionPosition`, `defaultSpan`, spacing)
  - table (`captionPosition`, `defaultSpan`, spacing)
- optional utility class mapping
- default citation style

### 4.2 `print`

Print-only layout:

- page size/orientation/margins
- first-page and default-page column layout
- repeated header/footer with token replacement (`{title}`, `{pageNumber}`)
- title block behavior

### 4.3 `web`

Web preview overrides:

- container width
- container classes
- content classes

## 5. Rendering Pipeline

1. Parse markdown + frontmatter.
2. Parse bibliography.
3. Parse and validate `template.json`.
4. Resolve template by merging shared defaults with target-specific config.
5. Run parser/render plugins from semantic nodes + resolved template values.
6. Render target:
   - web: standard preview flow
   - print: paginated page model

## 6. Print Pagination Model

Print pagination is internal and target-specific.
Core internal types:

- `Page`
- `PageRegion`
- `PaginatedPageTree`

Rules:

- header/footer render for every page
- body flow is isolated from page chrome
- first page may use different column count from default pages
- figure/table nodes support layout hints:
  - `span: "column" | "page"`
  - `breakBefore: "auto" | "page"`
  - `breakAfter: "auto" | "page"`
- in multi-column documents, `span: "page"` breaks out to full width and flow resumes with default columns

## 7. Plugin Rules

- Plugins must render semantic nodes plus resolved template config.
- Plugins must not hardcode journal-specific styles/branches.
- Template defaults define figure/table caption position, span defaults, and spacing.

## 8. Content Rules

- Markdown remains canonical source of content.
- Template-driven defaults are preferred over author-authored layout commands.
- Node-level overrides are supported as optional hints, not required for baseline layout.

## 9. Non-goals

- no nested markdown layout directives
- no template marketplace
- no multiple template files per workspace
- no IEEE/journal-specific hardcoded renderer branches

## 10. Compatibility Policy

Backward compatibility is only preserved when it does not introduce meaningful complexity.
When legacy behavior conflicts with the single-template architecture, clean cut migration is preferred.
