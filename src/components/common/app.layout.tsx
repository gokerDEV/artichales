import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useSettings } from "@/hooks/use-settings";
import { AppLoader } from "./app.loader";
import { AppSidebar } from "./app.sidebar";
import { Credits } from "./credits";
import { Header } from "./header";
import { SystemProvider } from "./system.context";

export default function Layout() {
	const { settings, loading, updateSettings } = useSettings();

	// Wait for settings before committing to loader behaviour
	if (loading) return null;

	const skip = !settings.showCredits;

	return (
		<SystemProvider initialLoading={settings.showCredits}>
			<AppLoader timeout={settings.loaderTimeout} skip={skip}>
				<SidebarProvider
					className="h-svh overflow-hidden"
					open={!settings.ux.sidebarCollapsed}
					onOpenChange={(open) =>
						updateSettings({
							ux: { ...settings.ux, sidebarCollapsed: !open },
						})
					}
				>
					<AppSidebar />
					<SidebarInset className="min-h-0 overflow-hidden">
						<Header />
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
							<div className="min-h-0 flex-1 overflow-auto">
								<Outlet />
							</div>
						</div>
					</SidebarInset>
				</SidebarProvider>
				<Credits brand="goker" origin={{ x: "0%", y: "0%" }} />
				<Toaster />
			</AppLoader>
		</SystemProvider>
	);
}
