import { create } from "zustand";

type EdithorUiState = {
	panelSizes: number[];
	isDraggingAssets: boolean;
	isLivePreviewEnabled: boolean;
	setPanelSizes: (sizes: number[]) => void;
	setDraggingAssets: (value: boolean) => void;
	setLivePreviewEnabled: (value: boolean) => void;
};

export const useEdithorUiStore = create<EdithorUiState>()((set) => ({
	panelSizes: [16, 44, 40],
	isDraggingAssets: false,
	isLivePreviewEnabled: true,
	setPanelSizes: (sizes) => set({ panelSizes: sizes }),
	setDraggingAssets: (value) => set({ isDraggingAssets: value }),
	setLivePreviewEnabled: (value) => set({ isLivePreviewEnabled: value }),
}));
