import { Button } from "@/components/ui/button";

export type ViewerMode = "web" | "print";
export type ViewerTab = "viewer" | "diagnostics";

type ViewerModeSwitchProps = {
	mode: ViewerMode;
	tab: ViewerTab;
	onModeChange: (mode: ViewerMode) => void;
	onTabChange: (tab: ViewerTab) => void;
};

export function ViewerModeSwitch({
	mode,
	tab,
	onModeChange,
	onTabChange,
}: ViewerModeSwitchProps) {
	return (
		<div className="flex items-center gap-1">
			<Button
				type="button"
				variant={mode === "web" ? "default" : "outline"}
				size="sm"
				className="h-7 px-2 text-xs"
				onClick={() => onModeChange("web")}
			>
				Web
			</Button>
			<Button
				type="button"
				variant={mode === "print" ? "default" : "outline"}
				size="sm"
				className="h-7 px-2 text-xs"
				onClick={() => onModeChange("print")}
			>
				Print
			</Button>
			<Button
				type="button"
				variant={tab === "diagnostics" ? "default" : "outline"}
				size="sm"
				className="h-7 px-2 text-xs"
				onClick={() => onTabChange("diagnostics")}
			>
				Diagnostics
			</Button>
		</div>
	);
}
