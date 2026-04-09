# PLUGIN_SPEC.md

## Overview

This document defines the Artichales plugin contract and runtime behavior.
The system is category-based and template-driven.


---

## Plugin Categories

Artichales supports four categories:

- `core`
- `editor`
- `parser`
- `render`

### core

Builds shared document state (indexes, numbering, diagnostics).

### editor

Provides editor-facing behavior (commands, panels, diagnostics).

### parser

Parses owned markdown/directive syntax and emits normalized nodes.

### render

Produces target-specific output by receiving `target: "web" | "print"` in render context.
A render plugin must handle both targets through the same hook contract.


---

## File Naming

Built-in plugins live under:

```txt
src/components/artichales/plugins/
```

Expected file naming:

- `x.core.plugin.tsx`
- `x.editor.plugin.tsx`
- `x.parser.plugin.tsx`
- `x.render.plugin.tsx`

---

## Plugin Definition Contract

```ts
export type PluginCategory = "core" | "editor" | "parser" | "render";

export type PluginHooks = {
  setup?: () => void;
  parse?: unknown;
  process?: unknown;
  render?: unknown;
  editor?: unknown;
};

export type PluginDefinition = {
  id: string;
  name: string;
  category: PluginCategory;
  version?: string;
  description?: string;
  ownsSyntax?: string[];
  configSchema?: unknown;
  hooks: PluginHooks;
};
```

Required fields:

- `id`
- `name`
- `category`
- `hooks`

---

## Registry Source of Truth

Plugin loading is controlled by `template.json`.
Registry order in that array is authoritative.

Example:

```json
{
  "plugins": [
     "abstract",
     "citation",
     "ref",
     "plotty",
     "datatable"
  ]
}
```

Rules:

- entries are applied in listed order
- unknown plugins are ignored (log  as  console.warnning)
- duplicate keep the first occurrence
- if `plugins` is missing/empty, do nothing 

---

## Execution Model

1. registry is loaded from `template.json.plugins`
2. plugins are filtered by `category`
3. category pipeline runs in fixed stage order:
   - `parser`
   - `core`
   - `render`
   - `editor`

Within a category, execution order equals registry order from `template.json.plugins`.

---

## Hook Responsibilities

### setup

Optional local setup.
Must not mutate source content.

### parse

Parser plugins only.
Transforms source syntax into normalized blocks + diagnostics.

### process

Core plugins only.
Enriches normalized document state.

### render

Render plugins only.
Receives `target` parameter and returns target-specific render tree output.
No separate `targets` field is used in plugin definitions.

### editor

Editor plugins only.
Adds editor commands/panels/diagnostics.

---

## Configuration

Plugin-specific settings can be provided by `template.json` surfaces.
If a plugin declares `configSchema`, resolved config must be validated before execution.

Validation failure rules:

- emit diagnostics
- skip only the invalid plugin
- keep other plugins operational

---

## Syntax Ownership

A plugin may declare `ownsSyntax`.
If no enabled plugin owns used syntax, emit a diagnostic.

Examples:

- `[cite:knuth1984]`
- `[cite:knuth1984, cite:goker]`
- `[ref:plotty:plot_1]`
- `:::plotty[plot_1.json]`
- `:::datatable[datatable_1.json]`

---

## Diagnostics

Plugins can emit diagnostics for:

- invalid syntax
- invalid config
- unresolved references
- unsupported payloads

Severity guidance:

- `error`: correctness is not guaranteed
- `warning`: recoverable issue
- `info`: non-blocking notice

Failure isolation:

- one plugin failure must not crash unrelated plugins

---

## Acceptance Criteria

- plugins use `category` (no `kind`)
- plugin definitions do not include `targets`
- plugin definitions do not include `enabledByDefault`
- registry order is driven by `template.json.plugins`
- enable/disable is resolved by registry load
- render plugins handle `web` and `print` via render context target
