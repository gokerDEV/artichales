# Artichales

Artichales is an offline-first, Markdown-first academic publishing editor.
Each workspace is driven by one canonical content file (`article.mda`) and one canonical template file (`template.json`), with references in `references.bib`.

## Core Model

- Single content source: `article.mda`
- Single template source: `template.json`
- Single bibliography source: `references.bib`
- One render pipeline for both `web` and `print`
- Paginated print preview used by PDF export

## Workspace Files

Pinned in file tree (always first):

1. `template.json`
2. `article.mda`
3. `references.bib`

All remaining assets (plots, tables, data/media files) are listed alphabetically after pinned files.

## Template Format

`template.json` is the only layout/style config source and supports:

- `version`
- `journal`
- `default`
- `print`
- `web`

It includes typography, colors, component defaults (figure/table caption + span + spacing), page settings, columns, header/footer tokens, and web layout overrides.

Template validation is explicit:

- invalid or malformed `template.json` shows visible diagnostics in preview
- preview is blocked until template errors are fixed
- fallback defaults are never applied silently

## Print Preview

Print uses an internal paginated page tree:

- `Page`
- `PageRegion`
- `PaginatedPageTree`

Supported behavior:

- multi-page preview
- per-page header/footer
- repeated page numbers
- first-page columns vs default-page columns
- full-width (`span: page`) figure/table flow breaks inside multi-column layouts

## Features

- Citation tokens: `[cite:knuth1984, goker]` (click each citation separately)
- Reference tokens: `[ref:plot_1]` and `[ref: plot_1]`
- Citation style is resolved from `template.json` (`default.citationStyle`)
- Plot directive: `:::plotty[file.json]`
- Datatable directive: `:::datatable[file.json]` (sortable; filter hidden in print)
- Math equations (KaTeX)
- Code rendering (inline + fenced)

## Development

```bash
bun install
bun dev
bun lint
bun build
```

## Specs

- `SPEC.md`
- `PLUGIN_SPEC.md`
- `ARTIFACT_SPEC.md`
