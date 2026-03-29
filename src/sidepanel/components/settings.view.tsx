import type React from "react";

export const SettingsView: React.FC = () => {
	return (
		<div className="p-4 flex h-full flex-col gap-4 bg-background">
			<div className="flex flex-col gap-1">
				<h2 className="text-sm font-semibold">Settings</h2>
				<p className="text-xs text-muted-foreground">
					Configure extension behaviour and preferences here.
				</p>
			</div>
			<div className="flex flex-1 items-center justify-center rounded-md border border-dashed">
				<p className="text-xs text-muted-foreground">Coming soon</p>
			</div>
		</div>
	);
};
