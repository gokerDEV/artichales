import type React from "react";
import { useState } from "react";
import { DatabaseIcon, SearchCheckIcon, Settings2Icon } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { CheckView } from "./components/check.view";
import { ExtractionsView } from "./components/extractions.view";
import { SettingsView } from "./components/settings.view";

const NAV_ITEMS = [
	{ id: "check", label: "Check", icon: SearchCheckIcon },
	{ id: "extraction", label: "Extraction", icon: DatabaseIcon },
	{ id: "settings", label: "Settings", icon: Settings2Icon },
];

const VIEW_MAP: Record<string, React.ComponentType> = {
	check: CheckView,
	extraction: ExtractionsView,
	settings: SettingsView,
};


// Root component for the side panel entry point.
// All navigation logic and view routing lives in SidepanelSidebar.
export const Sidepanel: React.FC = () => {
	const [activeId, setActiveId] = useState("check");

	const ActiveView = VIEW_MAP[activeId] ?? CheckView;

	return (
		// SidebarProvider is required by the Shadcn sidebar primitives.
		// We fix open=true and disable collapsing since the side panel itself is
		// already a fixed-width chrome surface.
		<SidebarProvider
			open={true}
			className="h-full flex flex-row-reverse overflow-hidden"
		>
			<Sidebar
				side="right"
				collapsible="none"
				className="w-10 border-l bg-muted/40 shrink-0"
			>
				<SidebarContent className="flex flex-col items-center pt-2 gap-1">
					<SidebarMenu className="items-center justify-center">
						{NAV_ITEMS.map(({ id, label, icon: Icon }) => (
							<SidebarMenuItem key={id}>
								<SidebarMenuButton
									tooltip={label}
									isActive={activeId === id}
									onClick={() => setActiveId(id)}
									className={cn(
										"flex flex-col items-center justify-center h-8 w-8 rounded-md p-0",
										"data-[active=true]:bg-sidebar-primary/90 data-[active=true]:text-sidebar-primary-foreground!",
									)}
									aria-label={label}
								>
									<Icon className="size-4 shrink-0" />
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarContent>
			</Sidebar>

			{/* ── Main content area — renders the active view ── */}
			<main className="flex-1 h-full overflow-hidden">
				<ActiveView />
			</main>
		</SidebarProvider>
	);
};
