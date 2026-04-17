# Edithor Spec

This document defines how `Edithor` logic is separated and what each module owns.

## Target split

- `use-edithor`
  - Owns UI/workspace state for `Edithor`.
  - Keeps selected file id.
  - Persists panel layout (`localStorage`).
  - Delegates file actions to adapter (`upload`, `rename`, `delete`).

- `edithor.utils`
  - Pure helper functions only.
  - Examples: date formatting, bytes formatting, extension/language helpers, file-name helpers.
  - Must stay side-effect free.

- `edithor.validator`
  - Validation rules only.
  - Validates filename, per-file size, workspace size, max file count.
  - Accepts optional custom validator from config.

- `file-tree`
  - Left panel UI only.
  - Renders file list, drag-drop area, context menu, rename/delete UI.
  - Must not implement storage/business rules directly; call handlers from `use-edithor`.

- `editor`
  - Center panel UI only.
  - Loads file content with adapter `onReadFile`.
  - Auto-saves with adapter `onSave`.
  - Adds language + autocomplete extensions.

- `auto-completer`
  - Builds CodeMirror completion extension from `AutocompleteRule[]`.
  - Converts domain items into CodeMirror completion options.

- `types`
  - Shared contracts/interfaces.
  - `EdithorFile`, `EdithorAdapter`, `EdithorConfig`, viewer-related types.

- `index`
  - Composition root of `Edithor`.
  - Wires `FileTree + Editor + Preview`.
  - Calls `use-edithor` and passes handlers to child components.

## Adapter must stay separate

`file.adapter` is infra/persistence logic and should not live inside UI files.

- UI layer: `src/components/edithor/*`
- Hook layer: `src/hooks/use-edithor.ts`
- Validation/util layer: `src/lib/edithor.validator.ts`, `src/lib/edithor.utils.ts`
- Adapter layer: `src/lib/file.adapter.ts`

### `file.adapter` sample (separate module)

```ts
import type { EdithorAdapter } from "@/components/edithor/types";
import { useWorkspaceStore } from "@/store/workspace.store";

export const workspaceFileAdapter: EdithorAdapter = {
  onReadFile: async (fileId) => {
    const raw = useWorkspaceStore.getState().rawFiles[fileId];
    if (raw === undefined) throw new Error(`File not found: ${fileId}`);
    return raw;
  },
  onSave: async (fileId, content) => {
    useWorkspaceStore.getState().updateFile(fileId, content);
  },
  onDelete: async (fileId) => {
    // delete rules + persistence
  },
  onRename: async (fileId, newName) => {
    // rename rules + persistence
  },
  onUpload: async (files) => {
    // upload validation + persistence
  },
};
```

## Usage sample 

```tsx
"use client";

import { useMemo } from "react";
import { Edithor } from "@/components/edithor";
import { workspaceFileAdapter } from "@/lib/file.adapter";
import { useWorkspaceStore } from "@/store/workspace.store";
import { getCoreFileNames } from "@/services/workspace.repository";
import { Viewers } from "./viewers";

export default function WorkspacePage() {
  const workspaceFiles = useWorkspaceStore((s) => s.workspaceFiles);

  const files = useMemo(() => {
    const coreFiles = Object.values(getCoreFileNames());
    return workspaceFiles.map((f) => ({
      id: f.name,
      name: f.name,
      lastModified: f.lastUpdated,
      deletable: !coreFiles.includes(f.name),
      editable: true,
      pinned: coreFiles.includes(f.name),
    }));
  }, [workspaceFiles]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <Edithor
              openFileId='article.mda'
              config={{
                maxFileSize: 5 * 1024 * 1024, // 5MB
                maxTotalSize: 50 * 1024 * 1024, // 50MB
                maxFileCount: 20,
                customValidator: (file) => {
                  if (!file.name.endsWith(".txt")) {
                    return "Only .txt files are allowed";
                  }
                  return null;
                },
              }}
        files={files}
        adapter={workspaceFileAdapter}
        previewContent={<Viewers mode="print" tab="viewer" />}
      />
    </div>
  );
}
```
