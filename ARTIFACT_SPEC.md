# ARTIFACT_SPEC.md

## Normative Source

`SPEC.md` is the only normative source.  
This file summarizes v1 asset/artifact behavior aligned to `SPEC.md`.

## Workspace Asset Model (v1)

Artifacts are user-managed workspace files stored in OPFS.

Supported asset file types:

- `.json`
- `.svg`
- `.png`
- `.jpg`
- `.jpeg`
- `.gif`

Unsupported formats (including `webp`) are out of scope for v1.

## File Size Policy

- Default limit: `2MB`
- Optional template override: `default.assets.maxFileSize`
- Hard security ceiling: `20MB`

Effective runtime limit:

- `min(default.assets.maxFileSize, 20MB)` when override exists
- otherwise `2MB`

## File Operations

Supported workspace operations:

- drag-and-drop insert
- file-picker insert
- rename (assets only)
- delete (assets only)
- `Download Source` export as `source.zip`

Core files are protected and not deletable:

- `template.json`
- `article.mda`
- `references.bib`

## Directive-Related Asset Usage

Directive syntax:

- `:::plugin_id[span=column|page]`
- `:::plugin_id[data_file][span=column|page]`

Rules:

- only one `data_file` binding per directive
- base grammar allows missing `data_file`
- plugin may still require `data_file` and emit plugin error later
- directive identity uniqueness:
  - unkeyed: `plugin_id`
  - keyed: `plugin_id + data_file`

## Captions and References

Caption syntax:

- `[caption:type:key]`
- `[caption:type:key](Title)`

Reference syntax:

- `[ref:type:key]`
- `[ref:type]` (singleton unkeyed targets only)

Captions are always keyed and do not participate in singleton short-form reference eligibility.

## Rename Behavior

Renaming an asset does not rewrite source references automatically.
Broken references are handled later by diagnostics/rendering.

## Diagnostics and Blocking

Asset-related errors are explicit diagnostics (never silent).

Examples:

- unsupported file type
- file size limit exceeded
- invalid JSON asset parse
- plugin-required `data_file` missing

Blocking behavior follows severity:

- `error` blocks rendering and triggers file-switch lock when current file is blocking
- `warning` and `info` are non-blocking
