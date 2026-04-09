# Product Specification: Artichales

## 1. Overview

Artichales is an open-source, offline-capable academic writing and publishing system built on a source-first workflow. It is designed around a single canonical authoring source and two rendering targets:

* print preview with PDF export
* web preview

For v1, Artichales ships only as a Chrome extension. The extension provides a local academic writing environment where the user edits source files, manages workspace assets, previews output, and exports the current workspace as `source.zip`.

Although the long-term architectural direction includes reusable React and shadcn-compatible integration surfaces, that integration surface is not a v1 product commitment and should be treated as future work.

## 2. Purpose and Scope

The purpose of Artichales v1 is to provide a strict, offline-first academic editor for a single local workspace.

The system is intentionally narrow in scope:

* one fixed workspace only
* no workspace switching
* no workspace deletion flow
* no workspace reset flow inside the product
* no import flow
* source editing only
* no WYSIWYG editing
* no runtime extension/plugin installation

If the user clears extension storage, the workspace returns to its initial empty state because the stored extension data is removed.

## 3. Core Principles

* **Source-first:** The canonical document is the source file, not the preview.
* **Single-workspace:** The product operates on one fixed workspace only.
* **Template-driven presentation:** Presentation rules come from `template.json`.
* **Deterministic preview-to-print intent:** What the user sees in print preview should be the basis of printed and exported output.
* **Offline-first:** Authoring and rendering must work locally. Fonts may use remote loading where allowed by template and runtime conditions, but the system must retain a bundled fallback path for predictable offline behavior.
* **Strict validation:** Invalid source, bibliography, template, or plugin data must surface explicitly.
* **Constrained v1 scope:** Advanced concerns not needed for v1 should not complicate the core product specification.

## 4. Workspace Model

### 4.1 Fixed Workspace

Artichales v1 operates on exactly one fixed workspace stored by the extension. The user cannot create, delete, switch, import, or reset workspaces from within the product.

### 4.2 Core Files

The workspace always contains exactly three protected core files:

1. `template.json`
2. `article.mda`
3. `references.bib`

These files are always present in the file tree.

### 4.3 Protection Rules

The three core files are editable but not deletable.

The user may manage additional workspace files as assets, subject to supported file type and file size rules.

### 4.4 File Tree Contract

The file tree contains only:

1. `template.json`
2. `article.mda`
3. `references.bib`
4. user-managed asset files

Ordering rules:

1. `template.json`
2. `article.mda`
3. `references.bib`
4. all remaining user-managed files in alphabetical order

There are no folders, multiple projects, hidden workspaces, or workspace variants in v1.

## 5. File Storage and Persistence

### 5.1 Storage Model

Workspace files and user-managed assets must be stored in OPFS.

Lightweight UI continuity state such as active preview target, panel sizing, and preview zoom may be stored separately in `localStorage`.

This is the preferred storage direction for v1.

### 5.2 Autosave Model

Saving is automatic.

The system must persist changes using:

* debounce-based save while the user is editing
* blur-triggered save when the editor loses focus

There is no manual save requirement in the base workflow.

### 5.3 Save Failure Behavior

If a save operation fails, the user must be informed explicitly through a shadcn-based alert.

Save failure must never fail silently.

### 5.4 UI State Persistence

The extension may preserve UI continuity state locally. At minimum, the product should preserve:

* active preview target
* panel sizing state
* preview zoom state where applicable
* crash-recovery editor text when needed

This continuity state is secondary to canonical workspace files and must not silently rewrite them outside normal save flow.

## 6. Asset Model

### 6.1 Supported Asset Types

The v1 supported user-managed file types are limited to:

* JSON files
* SVG images
* PNG images
* JPG images
* JPEG images
* GIF images

### 6.2 File Size Limits

The default asset file size limit is:

* `ASSET_MAX_FILE_SIZE = 2MB`

This value may be overridden through `template.json` at `default.assets.maxFileSize`.

Regardless of template configuration, the system must enforce a hard security ceiling:

* `SECURITY_MAX_FILE_SIZE = 20MB`

No template may raise the effective maximum above `SECURITY_MAX_FILE_SIZE`.

The effective runtime file-size limit is:

* `min(default.assets.maxFileSize, SECURITY_MAX_FILE_SIZE)` when template override is present
* otherwise `ASSET_MAX_FILE_SIZE`

### 6.3 File Operations

The file tree must support:

* drag-and-drop file insertion
* context-menu rename for user-managed assets
* context-menu delete for user-managed assets
* `Download Source` action for exporting `source.zip`

There is no import flow.

### 6.4 Rename Effects

Renaming an asset does not trigger automatic source rewriting.

If source content still references the old asset name, the mismatch is handled later by rendering and diagnostics.

## 7. Authoring Model

### 7.1 Source File Format

The canonical article source file is `article.mda`.

Artichales does not use MDX in v1. JSX is not supported. Raw HTML is blocked. The language is a controlled academic authoring format built on Markdown-style structure plus Artichales-specific syntax.

### 7.2 Supported Source Concepts

The base source model supports:

* frontmatter
* headings
* paragraphs
* emphasis and strong text
* inline code and fenced code blocks
* blockquotes
* lists
* links
* images
* tables
* citations
* references
* captions
* plugin directives
* limited display math blocks in supported form

### 7.3 Unsupported v1 Concepts

The following are out of scope for v1:

* JSX
* arbitrary HTML
* footnotes
* runtime user-defined components
* multiple data bindings in a single directive

## 8. Usage Flow

The v1 authoring lifecycle is intentionally simple:

1. The user opens the extension.
2. The user edits `template.json`, `article.mda`, and `references.bib`.
3. The user adds, renames, or deletes supported asset files.
4. The system autosaves changes locally.
5. The system renders the currently active preview target.
6. The system surfaces validation results in the preview diagnostics area.
7. The user exports PDF from print preview or exports the full workspace as `source.zip`.

## 9. Editor Experience

### 9.1 Editor Philosophy

The editor is a code-oriented academic source editor powered by CodeMirror 6.

It is not a visual editor.

### 9.2 Layout

The v1 workspace uses a three-column layout:

1. file tree
2. source editor
3. preview surface

The editor and preview areas should use shadcn-compatible resizable panel composition.

### 9.3 Header Controls

The header must provide a target switch with:

* `print`
* `web`

The default active preview target is `print`.

When `print` is active, PDF export is available. Web preview is preview-only and does not need its own PDF-oriented control state.

### 9.4 Alignment Controls

The resizable handle between editor and preview must provide two directional alignment controls:

* source to preview
* preview to source

Alignment should use AST block mapping rather than simple line matching.

### 9.5 Syntax Assistance

The editor must provide syntax highlighting and completion for at least:

* frontmatter
* Markdown headings
* citations
* references
* captions
* directives

The `.bib` file has its own separate schema and editing behavior.

### 9.6 Autocomplete Rules

Reference autocomplete must work from indexed referencable targets.

This includes both:

* keyed caption-defined targets
* directive-defined targets

Examples of expected behavior:

* when the user types `ref:`, the system should allow selecting from known targets
* when the user types a scoped keyed form such as `ref:plotty:`, the system should offer matching keyed targets owned by that directive type
* when the user types `ref:abstract`, the system should resolve that only when parsing and normalization determine that exactly one unkeyed `abstract` target exists in the normalized reference registry
* keyed targets of the same type do not make `ref:abstract` valid and do not satisfy its singleton condition
* captions do not use singleton short-form autocomplete because caption syntax is always keyed as `[caption:type:key]`

### 9.7 Undo and Redo

Undo and redo are scoped only to the currently open file.

Workspace-level history is out of scope for v1.

## 10. Preview Experience

### 10.1 General Behavior

Only the active preview target should render live. The inactive target must not continue live rendering in the background.

### 10.2 Print Preview

Print preview must be paginated and visually ready for print.

Each page should render according to the active template, including relevant page structure such as:

* headers
* footers
* page numbering

The user should be able to zoom the print preview.

### 10.3 Web Preview

Web preview is a responsive preview surface intended to show how the article may appear in a web-oriented publishing surface.

The user does not control web layout behavior directly. The web preview exists to provide a template-driven preview of likely web presentation.

Web preview does not require zoom support in v1.

## 11. Template System

### 11.1 Single Template File

Each workspace uses exactly one template file: `template.json`.

There is no template picker, template marketplace, or multi-template runtime selection in v1.

### 11.2 Template Philosophy

The template is a constrained configuration object, not a free-form styling surface.

Arbitrary HTML, arbitrary script, and unconstrained style injection are out of scope.

### 11.3 Top-Level Structure

The template schema should support the following top-level areas:

* `version`
* `publisher`
* `default`
* `print`
* `web`
* `plugins`

Detailed versioning strategy beyond v1 is intentionally not specified here.

### 11.4 Merge Rules

Template resolution follows this model:

* `default` provides shared defaults
* `print` applies as a shallow merge over `default` for print target behavior
* `web` applies as a shallow merge over `default` for web target behavior
* array fields append rather than replace

### 11.5 Constrained Configuration

Template values must come from explicitly supported schema fields and allowed token sets.

The system should prefer enumerated or schema-constrained values over open-ended styling freedom.

### 11.6 Citation Style Configuration

The v1 template must support at least the following citation styles:

* `numeric`
* `ieee`
* `apc`

Citation formatting is handled through the plugin system in the current architecture.

### 11.7 Reference Label Mapping

The template may define label mappings for reference targets. If a target type is not mapped, label rendering falls back to `?` followed by the resolved number when available.

Example behavior:

* mapped target: `Table 1`
* unmapped target: `? 1`

For singleton short-form references that resolve to an unkeyed target, rendering omits numbering. In that case, the mapped label renders by itself, such as `Abstract`, and implementations may treat the singleton numbering value as an empty string.

### 11.8 Language and Character Support

The template may declare a language value such as `lang: "en"`.

The rendering model is UTF-8 based. In practice, visible output depends on the selected font supporting the required characters.

For v1, the expected baseline is Latin Extended support.

## 12. Source Syntax Rules

### 12.1 Frontmatter

Frontmatter is required and is validated through schema rules.

Base fields are defined by product and template expectations. Template rules may further constrain required fields and field limits.

### 12.2 Citations

Base citation syntax:

```txt
[cite:bib_id]
[cite:bib_id1, cite:bib_id2]
```

Grouped citations normalize into separate citation nodes.

### 12.3 References

Base reference syntax supports both forms:

```txt
[ref:target_type:target_key]
[ref:target_type]
[ref:target_type:target_key, ref:other_type]
```

The keyed form `[ref:target_type:target_key]` may be used for any valid keyed target.

The short form `[ref:target_type]` is allowed only for unkeyed targets.

In practice, for directives this means the target must have no `data_file`.

The short form is valid only when parsing and normalization determine that exactly one unkeyed target with that `target_type` exists in the normalized reference registry.

Short-form eligibility is computed over the unkeyed subset of the registry for that type. Keyed targets of the same type neither satisfy nor invalidate that singleton condition.

Captions are always keyed because caption syntax is `[caption:type:key]`. Captions therefore do not use the singleton short reference form.

For singleton cases, the target type itself is sufficient for reference resolution.

If the count of unkeyed targets for that type is greater than `1`, the short form `[ref:target_type]` is a parser/normalization error because it cannot be mapped uniquely.

If there are `0` unkeyed targets for that type, the short form is also invalid and the keyed form is required when a keyed target exists.

Successful singleton references render without numbering.

Example:

```txt
[ref:abstract] -> Abstract
```

not:

```txt
Abstract 1
```

Implementation note: singleton numbering may be represented as an empty string.

Grouped references normalize into separate reference nodes.

Reference resolution is performed against the normalized reference registry produced after parsing and core processing.

The initial parse and normalization process is therefore sufficient to know whether the short form `[ref:target_type]` is valid for that document.

If a reference remains unresolved at render time despite being syntactically valid, the rendered output falls back to `?` behavior and a warning diagnostic must be emitted.

### 12.4 Captions

Caption syntax supports both forms:

```txt
[caption:type:key]
[caption:type:key](Human readable title)
```

A caption is an explicit anchor declaration located exactly where the user writes it.

If caption text is provided, it may render visibly according to template and target rules.

If caption text is omitted, the caption still participates in anchor identity, numbering, and reference resolution, but only a hidden anchor is rendered at the source location. This avoids rendering a secondary visible title where the surrounding content already provides its own visible heading or title.

The system does not infer ownership between captions and surrounding blocks. There is no adjacency binding rule, no parent-child ownership rule, and no automatic attachment to the next or previous block.

A caption may be used for any target type, including custom targets such as sections.

Example:

```txt
## Section header
[caption:section:unique_section_cap]
```

A caption participates in:

* anchor identity
* numbering
* reference resolution
* visible caption rendering when caption text exists
* hidden anchor rendering when caption text is omitted

For keyed caption targets, the `type:key` pair must be unique within the workspace document.

Because caption syntax is always keyed, captions participate only in keyed reference form such as `[ref:type:key]`. They are not eligible for singleton short-form references such as `[ref:type]`.

### 12.5 Display Math

v1 supports limited display math in basic block form such as:

```txt
$$
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
$$
```

and

```txt
$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$
```

Formal standardization of the math rendering engine is deferred to v2.

## 13. Bibliography Rules

### 13.1 Source File

Bibliography input is provided only through `references.bib`.

Accepted format is BibTeX only.

### 13.2 Supported Entry Types

The initial supported BibTeX entry types are:

* `book`
* `article`
* `proceedings`
* `online`

Strict field requirements must be enforced by schema.

For example:

* duplicate BibTeX keys are blocking errors
* missing required fields are validation failures
* syntax errors are validation failures
* `online` entries must require an access date through schema

### 13.3 Sorting

Default bibliography ordering is citation order.

The template may configure alternative ordering modes, including:

* `citation-order`
* `name`
* `year`

### 13.4 Blocking Validation Behavior

Bibliography validation is strict.

If `references.bib` contains syntax errors, schema errors, or duplicate keys:

* the state is blocking
* preview rendering is blocked
* the user must not be allowed to switch to another file from the file tree until the blocking issue is resolved

The same file-switch lock rule applies to any currently open file that contains a blocking syntax or schema error, including `template.json`, `article.mda`, and schema-validated structured asset files.

Blocking bibliography output must be surfaced in the preview diagnostics area through the render log / error tab model.

## 14. Directive Model

### 14.1 Directive Purpose

Directives allow plugin-owned content to be declared in the source document while keeping data-heavy configuration outside the main article source.

### 14.2 Base Syntax

Directive syntax may appear in either of these forms:

```txt
:::plugin_id[span=column|page]
Inner content
:::
```

```txt
:::plugin_id[data_file][span=column|page]
Inner content
:::
```

The data-file segment is optional at the base grammar level.

### 14.3 Data File Rules

A directive does not require a data file at the base syntax level.

However, a specific plugin may require one and may raise an error later in plugin-owned processing if the required data file is missing.

Only a single data file binding is allowed per directive.

A directive without `data_file` may become a valid unkeyed reference target if parsing and normalization produce exactly one unkeyed target for that type.

Example:

```txt
:::abstract
Abstract
:::
```

A single valid unkeyed target of this form may support `[ref:abstract]`.

A directive with `data_file` participates as a keyed target and therefore does not use the singleton short reference form.

### 14.4 Supported Data Inputs

Directive-related asset use is limited to the supported workspace asset set:

* JSON
* SVG
* PNG
* JPG
* JPEG
* GIF

### 14.5 Directive Identity and Uniqueness

Directive identity is based on:

* `plugin_id` when no `data_file` is present
* `plugin_id + data_file` when `data_file` is present

This identity is the uniqueness basis used by node parsing and normalization.

As a result:

* two directives with the same `plugin_id` and no `data_file` are invalid
* two directives with the same `plugin_id` and the same `data_file` are invalid
* the same `data_file` may be reused across different plugin types
* only the same `plugin_id + data_file` combination is forbidden when `data_file` is present
* a directive identity must map uniquely during node parsing

Examples:

```txt
:::plotty
:::
:::plotty
:::
```

is a parser/normalization error because the directive identity collides under `plugin_id`.

Likewise:

```txt
:::plotty[data.json]
:::
:::plotty[data.json]
:::
```

is also a parser/normalization error because the directive identity collides under `plugin_id + data_file`.

By contrast:

```txt
:::plotty[data.json]
:::
:::chartsmith[data.json]
:::
```

is valid because the shared `data_file` is reused across different plugin types.

### 14.6 Inner Content Rules

Directive inner content renders as title content by default.

A plugin may additionally parse that inner content for plugin-specific behavior, but that does not change the base document contract.

If a plugin expects title content and none is provided, the plugin may emit a warning.

### 14.7 Parse vs Plugin Error Boundary

The base parser and normalization stages are responsible for:

* directive syntax recognition
* node creation
* directive identity construction
* uniqueness validation
* normalized reference-registry construction

A directive such as:

```txt
:::plotty
:::
```

is syntactically valid at the base parser level even if the owning plugin later requires a `data_file`.

In such a case:

* base parsing succeeds
* the plugin may later emit an error because `data_file` is required for that plugin
* the plugin may also emit a warning if expected title/inner content is missing

This separation ensures that generic node parsing and plugin-specific validation remain distinct.

### 14.8 Placement Hints

The only base placement hint currently in scope is:

* `span=column|page`

No additional placement-hint system is defined for v1.

## 15. Plugin Architecture

### 15.1 v1 Plugin Scope

Artichales v1 does not support runtime plugin installation, community plugin loading, or extension-time plugin injection by end users.

Only plugins bundled at build time as part of the shipped extension may be used.

### 15.2 Plugin Categories

The base plugin categories are:

* `core`
* `editor`
* `parser`
* `render`

### 15.3 Responsibilities

* **core plugins** build shared state, numbering, indexes, and diagnostics
* **editor plugins** provide editor-specific behavior such as completion or diagnostics integration
* **parser plugins** parse owned syntax and emit normalized nodes
* **render plugins** render target-specific output for `web` or `print`

### 15.4 Build-Time Validation

Plugin configuration should be validated at compile time.

### 15.5 Reference Participation

Plugins that participate in reference behavior may define `baseRef` and use template label mapping during rendering.

Whether a target can be referenced in short form is not declared ahead of time. It is determined after parsing and normalization based on whether exactly one unkeyed target of that type exists in the normalized reference registry.

Targets backed by `data_file` remain keyed targets and do not participate in singleton short-form references.

### 15.6 Failure Model

Plugin failures must be associated with the relevant `plugin_id` in diagnostics.

Blocking or non-blocking behavior depends on severity:

* error: blocking
* warning: non-blocking
* info: informational

Generic parse/normalization failures and plugin-owned failures must remain distinguishable in diagnostics.

## 16. Normalized Document Model

The normalized document model must remain strict, diagnostics-friendly, and indexable.

### 16.1 Identity Policy

Persistent unique IDs are not required for every ordinary text node.

Stable semantic identity is required for nodes that participate in indexing, numbering, references, or plugin-owned rendering.

### 16.2 Required Special Nodes

The base model must explicitly support at least:

* citation node
* reference node
* caption node
* plugin directive node

### 16.3 Source Location

Nodes used for diagnostics or editor navigation must carry:

* line and column range
* absolute start and end offsets

### 16.4 Numbering

Numbering is assigned during core processing after parse completion, not during final rendering.

All downstream consumers, including references, diagnostics, and render plugins, must read from the same resolved numbering state.

For singleton short-form references to unkeyed targets, the resolved numbering value may be the empty string.

## 17. Parsing, Normalization, and Rendering Pipeline

The execution pipeline is:

1. validate `template.json`
2. validate and normalize `references.bib`
3. parse `article.mda` into nodes
4. normalize parsed nodes into the shared document model
5. build indexes, directive identities, reference registry, numbering, and diagnostics
6. allow plugin-owned parsing or processing for nodes that require it
7. render the active target

Registry order is authoritative where plugin order matters.

This means base parsing happens before final plugin-owned rendering.

Some nodes may therefore be accepted by the base parser but still fail later when a plugin applies stricter semantic requirements.

Print and web are separate rendering outputs. Only the active preview target should be rendered live.

## 18. Diagnostics Model

### 18.1 Severity Levels

Diagnostics use three severity levels:

* `error`
* `warning`
* `info`

### 18.2 Blocking Rules

Errors are blocking.

Warnings and info messages do not block rendering unless explicitly escalated by a stricter rule defined elsewhere in the product.

When the currently open file is in a blocking state because of syntax or schema failure, file-tree switching must be disabled until that file is corrected.

### 18.3 Presentation

Diagnostics must appear in the preview area through tabbed diagnostic views, including separate views for:

* errors / render log
* warnings
* info

Diagnostics should be displayed as lists and should identify the responsible parser, renderer, or plugin when applicable.

### 18.4 Examples

* unresolved reference: warning
* ambiguous short-form reference such as `[ref:type]` resolving to more than one unkeyed target: error
* duplicate directive identity under `plugin_id`: error
* duplicate directive identity under `plugin_id + data_file`: error
* plugin-required `data_file` missing on an otherwise syntactically valid directive: error
* missing mapped label fallback: warning if rendering can continue
* save failure alert: explicit UI alert, not a silent background event
* duplicate BibTeX key: error
* invalid template schema: error

## 19. Print and PDF Export

### 19.1 Preview-to-Print Intent

The v1 goal is straightforward: the system should print what the user sees in print preview as closely as practical within the Chrome-extension rendering environment.

### 19.2 Print Stack

The print implementation direction is:

* Paged.js for paginated layout behavior
* Chrome-native print/PDF behavior for final printing/export flow

### 19.3 Page Rules

Print output may support:

* repeated headers
* repeated footers
* page numbering
* different first-page and default-page behavior

### 19.4 Page Limit

The initial fixed page limit is:

* `PAGE_LIMIT = 40`

Whether this becomes template-configurable later is future work.

## 20. Font Strategy

Google Fonts support is allowed.

The font strategy may use both:

* runtime Google Fonts loading when network conditions allow it
* bundled freely licensed font files included at build time

When remote font loading is unavailable or inappropriate, rendering must fall back to bundled fonts.

The font strategy should prioritize predictable rendering without expanding the scope of v1 unnecessarily.

## 21. Accessibility and Language Constraints

### 21.1 Language Direction

RTL support is out of scope for v1.

### 21.2 Content Encoding

The system should operate with UTF-8 content handling.

### 21.3 Accessibility Scope

Keyboard support should be implemented as far as practical in v1, but a formal accessibility conformance target is not defined in this specification.

Full screen-reader-specific product scope is out of scope for v1.

## 22. Future Work Explicitly Deferred

The following topics are intentionally deferred from this specification unless later promoted into scope:

* workspace import
* multi-workspace management
* runtime community plugins
* formal public integration API
* advanced version migration policy
* exhaustive testing strategy
* external package contract for publisher integrations
* RTL support
* broader accessibility commitments
* formal math rendering engine standardization
* v2 distribution and component packaging details
