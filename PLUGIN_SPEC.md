# PLUGIN_SPEC.md

## Overview

This document defines the Artichales plugin contract for the initial version.
It covers plugin categories, file conventions, registration, execution order,
hook contracts, configuration, syntax ownership, conflict resolution, and diagnostics.

It does not redefine main system architecture, extension behavior, or artifact rules.

---

## Plugin Categories

Artichales supports four built-in plugin categories:

- core
- parser
- render
- editor

### core plugins

Core plugins operate on normalized document data after parsing.
They may enrich document state, indexes, numbering, cross-reference data, and diagnostics.

### parser plugins

Parser plugins recognize and transform owned syntax into normalized document blocks.
They may emit diagnostics for invalid syntax.

### render plugins

Render plugins transform normalized document data into normalized render tree nodes.
They must declare which render targets they support via the `targets` field.
They receive `RenderTarget` as a parameter in the render context and produce target-specific output.
The same plugin may produce different output structures for `print` vs `web` targets.

### editor plugins

Editor plugins provide editor-facing behavior such as commands, panels, quick actions,
and plugin-specific diagnostics.

---

## File Naming Convention

Built-in plugins must use one of the following file names:

- `x.core.plugin.tsx`
- `x.parser.plugin.tsx`
- `x.render.plugin.tsx`
- `x.editor.plugin.tsx`

Where `x` is the feature name.

Examples:

- `citation.core.plugin.tsx`
- `citation.parser.plugin.tsx`
- `citation.render.plugin.tsx`
- `citation.editor.plugin.tsx`
- `table.parser.plugin.tsx`
- `table.render.plugin.tsx`

A feature may implement one or more plugin files.

### Installed Location

Built-in plugins must be installed under:

```txt
components/
  artichales/
    plugins/
```

---

## Registration Rules

Each plugin module must export exactly one plugin definition.

Each plugin definition must declare:

- `id`
- `name`
- `category`
- `order`
- `enabledByDefault`
- `hooks`

A plugin may also declare:

- `version`
- `description`
- `targets`
- `ownsSyntax`
- `configSchema`

Only built-in plugins are supported in the initial version.
No remote loading, runtime installation, or untrusted plugin execution is allowed.

---

## Execution Order

Plugin execution must be deterministic.

### Ordering Rules

1. Plugins are grouped by category.
2. Within a category, plugins are sorted by ascending `order`.
3. If two plugins have the same `order`, they are sorted by ascending `id`.

### Category Order

Pipeline execution order:

1. parser
2. core
3. render
4. editor

---

## Models

### PluginCategory

```ts
export type PluginCategory = "core" | "parser" | "render" | "editor";
```

### RenderTarget

```ts
export type RenderTarget = "print" | "web";
```

### SourceRange

```ts
export interface SourceRange {
  start: number;
  end: number;
}
```

### DiagnosticSeverity

```ts
export type DiagnosticSeverity = "error" | "warning" | "info";
```

### Diagnostic

```ts
export interface Diagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  range?: SourceRange;
  pluginId?: string;
}
```

### PluginConfigValue

```ts
export type PluginConfigValue =
  | string
  | number
  | boolean
  | null
  | PluginConfigValue[]
  | { [key: string]: PluginConfigValue };
```

### PluginConfigMap

```ts
export type PluginConfigMap = Record<string, PluginConfigValue>;
```

### DocumentBlock

```ts
export interface DocumentBlock {
  id: string;
  type: string;
  range: SourceRange;
  data?: Record<string, unknown>;
  children?: DocumentBlock[];
}
```

### RenderTreeNode

```ts
export interface RenderTreeNode {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: RenderTreeNode[];
}
```

### PluginContextBase

```ts
export interface PluginContextBase {
  pluginId: string;
  diagnostics: Diagnostic[];
  config: PluginConfigValue | undefined;
}
```

### ParserPluginContext

```ts
export interface ParserPluginContext extends PluginContextBase {
  markdown: string;
  blocks: DocumentBlock[];
}
```

### CorePluginContext

```ts
export interface CorePluginContext extends PluginContextBase {
  document: unknown;
}
```

### RenderPluginContext

```ts
export interface RenderPluginContext extends PluginContextBase {
  document: unknown;
  target: RenderTarget;
  tree: RenderTreeNode[];
  templateName: string;
}
```

### EditorPluginContext

```ts
export interface EditorPluginContext extends PluginContextBase {
  document: unknown;
  target: RenderTarget;
}
```

### ParserPluginResult

```ts
export interface ParserPluginResult {
  blocks?: DocumentBlock[];
  diagnostics?: Diagnostic[];
}
```

### CorePluginResult

```ts
export interface CorePluginResult {
  document?: unknown;
  diagnostics?: Diagnostic[];
}
```

### RenderPluginResult

```ts
export interface RenderPluginResult {
  tree?: RenderTreeNode[];
  diagnostics?: Diagnostic[];
}
```

### EditorCommand

```ts
export interface EditorCommand {
  id: string;
  label: string;
  run(): void;
}
```

### EditorPanelDefinition

```ts
export interface EditorPanelDefinition {
  id: string;
  title: string;
  slot: "left" | "right" | "bottom";
}
```

### EditorPluginResult

```ts
export interface EditorPluginResult {
  commands?: EditorCommand[];
  panels?: EditorPanelDefinition[];
  diagnostics?: Diagnostic[];
}
```

### PluginHooks

```ts
export interface PluginHooks {
  setup?(): void;
  parse?(context: ParserPluginContext): ParserPluginResult;
  process?(context: CorePluginContext): CorePluginResult;
  render?(context: RenderPluginContext): RenderPluginResult;
  editor?(context: EditorPluginContext): EditorPluginResult;
}
```

### PluginDefinition

```ts
export interface PluginDefinition {
  id: string;
  name: string;
  category: PluginCategory;
  order: number;
  enabledByDefault: boolean;
  version?: string;
  description?: string;
  targets?: RenderTarget[];
  ownsSyntax?: string[];
  configSchema?: unknown;
  hooks: PluginHooks;
}
```

---

## Hook Contract

### setup

Optional one-time local setup for the plugin module.

Rules:
- must not perform network access
- must not mutate source content

### parse

Used by parser plugins.

Responsibilities:
- parse owned syntax
- emit normalized document blocks
- emit syntax diagnostics

Rules:
- must not produce final render output
- should preserve source ranges where possible

### process

Used by core plugins.

Responsibilities:
- enrich normalized document data
- build or update shared academic state
- emit diagnostics

Rules:
- must not produce target-specific render nodes
- must not mutate source markdown

### render

Used by render plugins.

Responsibilities:
- transform normalized document data into normalized render tree nodes
- support `print` and `web` targets where needed
- produce target-specific output based on the `target` parameter in context

Rules:
- must return normalized render tree nodes
- must not return raw HTML as the canonical result
- may produce different tree structures depending on `context.target`
- must only process targets declared in plugin `targets` field

### editor

Used by editor plugins.

Responsibilities:
- provide commands
- provide panels
- provide editor-facing diagnostics and quick actions

Rules:
- must not redefine parsing or render contracts
- must not silently rewrite source content

---

## Configuration

Plugin configuration may be provided through frontmatter.

Example:

```yaml
plugins:
  citation: true
  tables:
    numbering: true
    overflowX: auto
  references:
    enabled: true
    title: References
```

### Resolution Order

Resolved plugin configuration is built from:

1. built-in defaults
2. application-level overrides
3. document frontmatter overrides

### Validation

If a plugin declares `configSchema`, the resolved configuration must be validated
before execution.

Invalid configuration must:
- emit diagnostics
- prevent execution of the invalid plugin
- leave the rest of the system operational

---

## Syntax Ownership

A plugin may declare `ownsSyntax`.
If it does, that plugin is responsible for parsing and validating the declared syntax.

Examples:

- `cite`
- `abstract`
- `table`
- `figure`
- `equation`

If no enabled plugin owns a syntax token used in the document, the system must emit a diagnostic.

### Citation Syntax

Single citation:

```md
[cite:knuth1984]
```

Multiple citations:

```md
[cite:knuth1984, cite:brown2022]
```

### Directive Syntax

General form:

```md
:::name
payload
:::
```

Variant form:

```md
:::name[variant]
payload
:::
```

Examples:

```md
:::abstract
This paper presents...
:::
```

```md
:::table[tabularx]
...table payload...
:::
```

---

## Conflict Resolution

Conflicts must be resolved deterministically.

### Syntax ownership conflict

If two enabled plugins claim the same syntax:
- the lower `order` wins
- if `order` is equal, the lower lexical `id` wins
- the losing plugin must be skipped for that syntax
- a warning diagnostic must be emitted

### Render ownership conflict

If two render plugins attempt to own the same normalized block type:
- the same ordering rule applies
- the losing plugin must be skipped for that block type
- a warning diagnostic must be emitted

---

## Diagnostics

Plugins may emit diagnostics for:

- invalid syntax
- unsupported directive variant
- invalid configuration
- missing reference ids
- unresolved cross-references
- invalid payload structure
- ownership conflicts

### Severity Guidance

Use:
- `error` when output correctness cannot be guaranteed
- `warning` when behavior is recoverable but incomplete
- `info` for non-blocking notices

### Failure Rules

- one plugin failure must not crash unrelated plugin execution
- a plugin with invalid configuration must be skipped
- diagnostics should remain attached to source ranges where possible

---

## Built-in Default Plugin Set

The initial version should ship with these built-in plugins:

- citation
- references
- figures
- tables
- equations
- abstract
- sections

Expected files may include:

- `citation.core.plugin.tsx`
- `citation.parser.plugin.tsx`
- `citation.render.plugin.tsx`
- `citation.editor.plugin.tsx`
- `references.core.plugin.tsx`
- `references.render.plugin.tsx`
- `table.parser.plugin.tsx`
- `table.render.plugin.tsx`
- `figure.parser.plugin.tsx`
- `figure.render.plugin.tsx`
- `equation.parser.plugin.tsx`
- `equation.render.plugin.tsx`
- `abstract.parser.plugin.tsx`
- `abstract.render.plugin.tsx`
- `section.core.plugin.tsx`
- `section.render.plugin.tsx`

A feature is not required to implement all four categories.

---

## Acceptance Criteria

The plugin system is correctly defined when:

- built-in plugins use the required naming convention
- plugin discovery is local and deterministic
- parser, core, render, and editor plugins execute in stable order
- syntax ownership is explicit
- invalid configuration produces diagnostics
- render plugins produce normalized render tree nodes
- editor plugins extend UX without bypassing canonical source behavior
