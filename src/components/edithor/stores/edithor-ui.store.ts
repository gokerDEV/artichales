import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { WORKSPACE_UI_STATE_KEY } from "@/lib/workspace";

type EdithorUiState = {
	panelSizes: number[];
	isDraggingAssets: boolean;
	isLivePreviewEnabled: boolean;
	setPanelSizes: (sizes: number[]) => void;
	setDraggingAssets: (value: boolean) => void;
	setLivePreviewEnabled: (value: boolean) => void;
};

export const useEdithorUiStore = create<EdithorUiState>()(
	persist(
		(set) => ({
			panelSizes: [16, 44, 40],
			isDraggingAssets: false,
			isLivePreviewEnabled: true,
			setPanelSizes: (sizes) => set({ panelSizes: sizes }),
			setDraggingAssets: (value) => set({ isDraggingAssets: value }),
			setLivePreviewEnabled: (value) => set({ isLivePreviewEnabled: value }),
		}),
		{
			name: WORKSPACE_UI_STATE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				isLivePreviewEnabled: state.isLivePreviewEnabled,
			}),
		},
	),
);
