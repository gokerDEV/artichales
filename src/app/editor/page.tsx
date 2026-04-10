import { EditorPreviewSurface } from "@/components/artichales/surfaces/editor-preview-surface";

export function EditorPage() {
	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			<EditorPreviewSurface />
		</div>
	);
}
