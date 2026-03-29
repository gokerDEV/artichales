# ARTIFACT_SPEC.md

## Overview

Artifacts are embedded document resources.

In the initial version, artifacts are limited to:
- images
- table data
- chart data

This specification only defines what an artifact is, how it is represented, and how it is used in print and web rendering.

## Artifact Types

### Image artifact

An image artifact is a visual resource used directly in the document.

Examples:
- png
- jpg
- jpeg
- svg
- webp

### Table artifact

A table artifact is structured table content stored as JSON.

It is used as the source for table rendering.

### Chart artifact

A chart artifact is structured chart content stored as JSON.

It is used as the source for chart rendering.

## Artifact Representation

### Image artifact

Image artifacts are referenced by path.

Example:

```json
{
  "type": "image",
  "path": "./artifacts/figure-1.png"
}
```

### Table artifact

Table artifacts can store data directly as JSON, or act as a pointer using a `path` if the data is too large to keep inline.

Example (Inline):

```json
{
  "type": "table",
  "columns": ["Name", "Score"],
  "rows": [
    ["Alice", 95],
    ["Bob", 88]
  ]
}
```

Example (Path):

```json
{
  "type": "table",
  "path": "./artifacts/table-1-data.json"
}
```

### Chart artifact

Chart artifacts can store data directly as JSON, or act as a pointer using a `path` if the data is too large.

Example (Inline):

```json
{
  "type": "chart",
  "chartType": "bar",
  "labels": ["A", "B", "C"],
  "series": [
    {
      "name": "Scores",
      "data": [10, 20, 30]
    }
  ]
}
```

Example (Path):

```json
{
  "type": "chart",
  "chartType": "bar",
  "path": "./artifacts/chart-1-data.json"
}
```

## Print Behavior

For print and PDF generation:
- image artifacts may be used directly
- table artifacts are rendered to visual output
- chart artifacts are rendered to visual output
- table and chart artifacts are converted to SVG or PNG
- the resulting visual output is embedded into the document

## Web Behavior

For web rendering:
- image artifacts are shown from their saved location
- table artifacts are rendered from their JSON source
- chart artifacts are rendered from their JSON source
- artifacts must remain accessible from their saved location

## Rules

- artifacts are document resources
- table and chart artifacts use JSON
- print uses embedded visual output
- web uses the saved artifact source