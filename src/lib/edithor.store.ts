import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const EDITHOR_STORE_KEY = "edithor-store-";

const defaultLayout = {
	"edithor-file-tree": 20,
	"edithor-editor": 40,
	"editor-preview": 40,
};

function normalizeLayout(
	layout: Record<string, number>,
): Record<string, number> {
	const next = { ...layout };
	if (typeof next["edithor-view"] === "number") {
		next["editor-preview"] = next["edithor-view"];
		delete next["edithor-view"];
	}
	return {
		...defaultLayout,
		...next,
	};
}

type EdithorState = {
	layout: Record<string, number>;
	panelSizes: number[];
	isDraggingAssets: boolean;
	isLivePreviewEnabled: boolean;
	activeFileId: string | null;
	setLayout: (layout: Record<string, number>) => void;
	setPanelSizes: (sizes: number[]) => void;
	setDraggingAssets: (value: boolean) => void;
	setLivePreviewEnabled: (value: boolean) => void;
	setActiveFileId: (value: string | null) => void;
};

export const useEdithorStore = create<EdithorState>()(
	persist(
		(set) => ({
			layout: defaultLayout,
			panelSizes: [16, 44, 40],
			isDraggingAssets: false,
			isLivePreviewEnabled: true,
			activeFileId: null,
			setLayout: (layout) => set({ layout: normalizeLayout(layout) }),
			setPanelSizes: (sizes) => set({ panelSizes: sizes }),
			setDraggingAssets: (value) => set({ isDraggingAssets: value }),
			setLivePreviewEnabled: (value) => set({ isLivePreviewEnabled: value }),
			setActiveFileId: (value) => set({ activeFileId: value }),
		}),
		{
			name: EDITHOR_STORE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				layout: state.layout,
				isLivePreviewEnabled: state.isLivePreviewEnabled,
				activeFileId: state.activeFileId,
				panelSizes: state.panelSizes,
			}),
		},
	),
);

export const edithorDefaultLayout = defaultLayout;
