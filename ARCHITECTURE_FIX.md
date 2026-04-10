# Architecture Fix Plan

## Core Direction

- Keep the project simple. The document flow should remain: references.bib and template are resolved first, markdown is parsed once, directives are normalized once, and render components receive only ready-to-render data.
- Avoid moving parsing, lookup, or template selection work into the render layer.
- Avoid fragmented context objects and directive-specific prop contracts when the shape is fundamentally the same.

## Agreed Constraints

- `source` MUST NOT be used in the render layer.
- Directive plugins SHOULD receive `raw` and `params` as separate inputs.
- Directive plugins MAY resolve their own `data_file` content internally for memoization purposes, but they MUST NOT receive broad raw asset maps from the render runtime.
- `category` is plugin metadata. It belongs to the registry layer and MUST NOT leak into render props.
- Template MUST NOT be passed wholesale to directive renderers. 
- Template resolution must happen before render, and only the resolved config relevant to the directive `category` should be passed down.
- The project has only a few shared special structures: `caption`, `ref`, and `cite`. Everything else should stay direct and predictable.

## Main Problems Identified

- Render components still perform resolution work that should happen during normalization.
- Directive render inputs are inconsistent and duplicated across plugins.
- The current render context still carries directive-specific maps such as `plotFiles`, `plotIndexById`, and `datatableIndexById`.
- Registry resolution and render dispatch are mixed with markdown rendering concerns.
- Template component configuration is still partially hardcoded around `figure` and `table`, instead of being category-driven.
- Caption and label behavior has been spread across several places instead of being resolved once.
- Hook-based runtime collection adds another abstraction layer without simplifying the actual data flow.
- Asset lifecycle state is not modeled explicitly enough for correct `data_file` memoization.
- The workspace asset list does not yet behave like a stable render input with `lastUpdated` metadata.

## Required Architectural Changes

- Introduce a strict directive category model at the registry level.
- Each plugin must declare its category in plugin metadata.
- Registry resolution must map `directive -> plugin -> category`.
- Template config must stay normalized in memory and must not be duplicated per directive instance.
- When a directive renderer is invoked, the already available category should be used to select the relevant config and pass it down.
- After resolution, renderers must receive a single normalized `config` object, not separate `templateDefaults`, `referenceLabels`, and utility fragments.
- Directive renderers must receive normalized directive structure, including `raw` and `params` as separate fields.
- Manual caption data should be treated as the only caption source when present. Visual payloads should not invent captions from layout data.
- Number, label, and caption logic must be removed from directive visual plugins.
- Directive visual plugins should not receive `number` once caption/label responsibility is extracted out of the directive itself.
- Reference behavior should use a minimal ref registry instead of passing large resolved structures into unrelated directive renderers.
- Asset state must expose `lastUpdated` per `data_file` so heavy directive visuals can re-render only when the bound file actually changes.
- Workspace assets should be stored as a list of records with stable file identity and `lastUpdated`.
- Common directive behavior should be handled through shared utilities and shared hooks only where the abstraction is genuinely common.

## Target Data Flow

1. Resolve and normalize template.
2. Parse markdown into AST.
3. Normalize directive nodes.
4. Resolve plugin ownership from registry.
5. Resolve directive category from plugin metadata.
6. Keep normalized template config in memory.
7. Build per-asset workspace state including `lastUpdated`.
8. Resolve directive data payload.
9. At directive invocation time, select the relevant category config from normalized template state.
10. Render the isolated visual component.

## Target Render Model

- A directive renderer should receive one normalized model.
- That model should contain only:
  - `directive`
  - `config`
  - `params` <- parsed directive params such as `:::directive_id[param1][param2][param3]`
  - `raw` <- parsed directive body/content
  - `target` <- print | web
  - `lastUpdated` <- bound `data_file` update marker used to invalidate memoization when file contents change without file name changes

- It should not contain:
  - `category` 
  - raw template objects
  - `source`
  - `number`
  - `label`
  - `caption`
  - unrelated reference state

## Asset State Direction

- Asset records in workspace state should include at least:
  - `name`
  - `kind`
  - `lastUpdated`

- The preview/render layer should not receive a giant ad hoc asset object map as its primary contract.
- Instead, directive plugins should be able to resolve the bound `data_file` through a narrow asset access path keyed by file identity.
- The key render invalidation input for a `data_file`-bound directive is `lastUpdated`, not only the file name.

## Directive Data Resolution

- `raw` and `params` should remain separate.
- Directive plugins may interpret `raw` and `params` internally.
- `data_file` loading and decoding can live inside the directive plugin boundary if the goal is to memoize by file identity and `lastUpdated`.
- However, this must be done through a narrow asset input contract, not through broad render-context maps like `plotFiles`.
- The heavy visual component should depend on:
  - parsed directive `params`
  - parsed directive `raw`
  - resolved `data_file` content
  - `lastUpdated`

## Template Shape Direction

- Category-level template config should be defined once and resolved centrally.
- Each category should support:
  - `captionPosition`
  - `defaultSpan`
  - `spacingBefore`
  - `spacingAfter`

- The template layer should eventually support all declared directive categories consistently:
  - `abstract`
  - `table`
  - `figure`
  - `map`
  - `equation`
  - `code`

## Render Layer Rules

- The render layer MUST NOT choose template categories.
- The render layer MUST NOT resolve directive ownership.
- The render layer MUST NOT infer labels from fallback business logic beyond the already resolved config.
- Heavy visuals must remain isolated and memoized.
- The render layer MUST NOT receive broad asset lookup maps if a narrower asset contract can be used.

## Simplicity Rules

- If two directive renderers take the same kind of input, they must share one common render model.
- If a value can be resolved earlier, do not push it down the tree.
- If a hook exists only to repair an already fragmented contract, the contract should be simplified instead.
- Prefer one explicit normalized object over multiple partial maps and ad hoc lookups.
- Shared directive utilities are acceptable only for truly common logic.
- Shared directive hooks are acceptable only for truly common render behavior.
- Do not invent extra intermediate objects unless they remove more complexity than they add.

## Questions To Resolve Before Final Refactor

- Should directive body override parsing happen in parser plugins or in a single normalization stage after parsing?
- Should caption text be fully manual-only, or should there be any supported derived fallback at all?
- Should ref rendering consume a dedicated minimal registry structure instead of the current resolved reference map?
- Should asset access in directive plugins be modeled as a small asset reader interface instead of direct store objects or raw file maps?
