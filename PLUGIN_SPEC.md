# PLUGIN_SPEC.md

## Normative Source

`SPEC.md` is the only normative source.  
This file is an implementation-aligned summary for plugin behavior in v1.

## v1 Scope

- No runtime plugin installation.
- No community plugin loading.
- Only build-bundled plugins are allowed.
- Registry source: `template.json.plugins`.

## Plugin Categories

- `parser`
- `core`
- `render`
- `editor`

Responsibilities:

- `parser`: parse owned syntax and emit normalized nodes.
- `core`: build shared state (indexes, numbering, diagnostics).
- `render`: render `web` or `print` output from shared state.
- `editor`: editor-oriented assistance (completion/diagnostics integration).

## Contract

Implemented plugin contract:

```ts
export type PluginDefinition = {
  id: string;
  name: string;
  category: "core" | "editor" | "parser" | "render";
  version?: string;
  description?: string;
  ownsSyntax?: string[];
  configSchema?: ZodType<unknown>;
  hooks: {
    setup?: () => void;
    parse?: unknown;
    process?: unknown;
    render?: unknown;
    editor?: unknown;
  };
};
```

`configSchema` is validated during plugin-processing stage.

## Registry Behavior

- Registry order is authoritative where order matters.
- Unknown plugin ids are ignored.
- Duplicate ids keep the first occurrence.
- `enabled: false` disables that plugin.
- If template registry is missing/empty, built-in registry is used.

## Pipeline Binding

Plugin behavior is bound to the v1 pipeline:

1. validate template
2. validate bibliography
3. parse article
4. normalize document
5. build registry/numbering/diagnostics
6. plugin-processing
7. render active target

## Config Validation

Plugin config input is read from article frontmatter `plugins` map.

Validation rules:

- frontmatter `plugins` must be an object map keyed by plugin id
- if a plugin declares `configSchema`, config must pass validation
- validation errors are plugin-attributed diagnostics
- plugin config error severity: `error` (blocking)
- plugin failures are isolated; unrelated plugins continue

## Reference Semantics

Reference behavior is determined after parse/normalization, not predeclared:

- keyed form: `[ref:type:key]`
- short form: `[ref:type]` only for singleton unkeyed targets
- keyed targets (including directives with `data_file`) never satisfy singleton short-form rules
- captions use keyed identity via `[caption:type:key]`

## Diagnostics

Diagnostics severities:

- `error` (blocking)
- `warning` (non-blocking)
- `info` (non-blocking)

Diagnostics should identify source attribution:

- parser/core/plugin/renderer where applicable
- plugin id for plugin-owned failures
