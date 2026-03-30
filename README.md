# Artichales

Artichales is an offline-first academic writing and publishing system built around a Markdown-first workflow. A single Markdown source renders to both print (PDF) and web (HTML/React) targets via a shared normalized render tree. The initial product ships as a Chrome extension editor and keeps everything local-first.

## Key Features

- Markdown-first authoring with frontmatter and BibTeX inputs
- Shared render tree powering print and web outputs
- Switchable print preview and web preview
- Deterministic, built-in plugin pipeline (core, parser, render, editor)
- Template-based layouts for print and web (`templates/<name>_print.json`, `templates/<name>_web.json`)
- Offline-first, single-document workflow
- Shadcn-compatible component distribution under `components/artichales/`

## Tech Stack

- **Runtime / Tooling**: Bun, TypeScript, Vite, React
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI, clsx, tailwind-merge, lucide-react
- **Quality**: Biome
- **Extension**: @crxjs/vite-plugin, MV3 Manifest

## Project Structure

```
src/
  app/
    editor/
      page.tsx
  components/
    artichales/
      editor/
      preview/
        web/
        print/
      panels/
      surfaces/
      templates/
      plugins/
  hooks/
  lib/
```

## Development

### Prerequisites

- Bun (v1.0+)
- Node.js (v20+)

### Setup

```bash
bun install
bun dev
```

### Load the extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

## Specs & References

- `SPEC.md` — product specification and architecture
- `PLUGIN_SPEC.md` — plugin contracts and hooks
- `ARTIFACT_SPEC.md` — asset embedding and artifact rules

## Contributing

- Follow Conventional Commits
- Keep changes aligned with the spec docs
- Run lint/format/build before PR (`bun lint`, `bun format`, `bun build`)

## License

MIT License. See `LICENSE`.
