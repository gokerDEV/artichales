import type React from "react";
import { useEffect, useState } from "react";
import { DatabaseIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Extractions } from "@/lib/types/engine";
import type {
	GET_CACHED_EXTRACTIONS_MESSAGE,
	GET_CACHED_EXTRACTIONS_RESPONSE,
} from "@/services/messaging";

const SESSION_TAB_KEY = "match_last_tab_id";

const fetchActiveTab = async (): Promise<{ tabId: number; url: string } | null> => {
	try {
		const result = await chrome.storage.session.get(SESSION_TAB_KEY);
		const tabId = result[SESSION_TAB_KEY];
		if (typeof tabId !== "number") return null;
		const tab = await chrome.tabs.get(tabId);
		if (tab?.id && tab.url) return { tabId: tab.id, url: tab.url };
		return null;
	} catch {
		return null;
	}
};

const getCachedExtractions = async (url: string): Promise<Extractions | null> => {
	try {
		const response = await chrome.runtime.sendMessage<
			GET_CACHED_EXTRACTIONS_MESSAGE,
			GET_CACHED_EXTRACTIONS_RESPONSE
		>({
			type: "GET_CACHED_EXTRACTIONS",
			payload: { url },
		});
		if (response?.success && response.data) {
			return response.data;
		}
		return null;
	} catch {
		return null;
	}
};

// Helper to safely get a string value from Extractions
const getString = (val: unknown): string | undefined => {
	if (typeof val === "string") return val;
	return undefined;
};

// Helper to safely get a number value from Extractions
const getNumber = (val: unknown): number | undefined => {
	if (typeof val === "number") return val;
	return undefined;
};

interface ExtractionSectionProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
}

const ExtractionSection: React.FC<ExtractionSectionProps> = ({
	title,
	icon,
	children,
}) => (
	<div className="rounded-md border bg-card">
		<div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/40">
			{icon}
			<h3 className="text-xs font-semibold">{title}</h3>
		</div>
		<div className="p-3 flex flex-col gap-2">{children}</div>
	</div>
);

interface ExtractionFieldProps {
	label: string;
	value: string | number | null | undefined;
}

const ExtractionField: React.FC<ExtractionFieldProps> = ({ label, value }) => {
	const displayValue =
		value !== null && value !== undefined && typeof value !== "boolean"
			? String(value)
			: "—";
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</span>
			<span className="text-xs font-medium break-all">{displayValue}</span>
		</div>
	);
};

export const ExtractionsView: React.FC = () => {
	const [extractions, setExtractions] = useState<Extractions | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tabUrl, setTabUrl] = useState<string>("");

	const loadExtractions = async () => {
		setLoading(true);
		setError(null);
		try {
			const tab = await fetchActiveTab();
			if (!tab) {
				throw new Error("No active tab found");
			}
			setTabUrl(tab.url);
			const data = await getCachedExtractions(tab.url);
			if (data) {
				setExtractions(data);
			} else {
				throw new Error("No cached extractions found. Please run analysis first.");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load extractions");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadExtractions();
	}, []);

	const ogTags = Array.isArray(extractions?.ogTags)
		? (extractions.ogTags as Array<{ property: string; content: string }>)
		: [];
	const twitterTags = Array.isArray(extractions?.twitterTags)
		? (extractions.twitterTags as Array<{ name: string; content: string }>)
		: [];
	const h1List = Array.isArray(extractions?.h1List)
		? (extractions.h1List as string[])
		: [];
	const perfData = extractions?.performance as
		| { ttfb: number; domInteractive: number; fcp: number; resourceCount: number }
		| undefined;

	return (
		<div className="p-4 flex h-full flex-col gap-4 bg-background">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<h2 className="text-sm font-semibold">Extractions</h2>
					<p className="text-xs text-muted-foreground">
						Raw signals extracted from the active page
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={loadExtractions}
					disabled={loading}
					className="h-8 gap-1"
				>
					<RefreshCwIcon
						className={`size-3 ${loading ? "animate-spin" : ""}`}
					/>
					<span className="text-xs">Refresh</span>
				</Button>
			</div>

			{tabUrl && (
				<div className="rounded-md border bg-muted/40 px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase">
						Current URL
					</span>
					<p className="text-xs font-medium truncate">{tabUrl}</p>
				</div>
			)}

			{loading && !extractions && (
				<div className="flex flex-1 items-center justify-center">
					<div className="flex flex-col items-center gap-2 text-muted-foreground">
						<RefreshCwIcon className="size-4 animate-spin" />
						<span className="text-xs">Extracting signals...</span>
					</div>
				</div>
			)}

			{error && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
					<p className="text-xs text-destructive">{error}</p>
					<p className="text-xs text-destructive mt-1">
						Please run analysis from the Check tab first.
					</p>
				</div>
			)}

			{!loading && !extractions && !error && (
				<div className="flex flex-1 items-center justify-center rounded-md border border-dashed">
					<div className="flex flex-col items-center gap-2 text-muted-foreground">
						<DatabaseIcon className="size-4" />
						<p className="text-xs">No data yet</p>
					</div>
				</div>
			)}

			{extractions && (
				<div className="flex flex-1 flex-col gap-4 overflow-y-auto">
					{/* DOM Signals */}
					<ExtractionSection
						title="DOM Signals"
						icon={<DatabaseIcon className="size-3 text-muted-foreground" />}
					>
						<ExtractionField label="Title" value={getString(extractions.title)} />
						<ExtractionField
							label="Meta Description"
							value={getString(extractions.metaDescription)}
						/>
						<ExtractionField label="Canonical URL" value={getString(extractions.canonicalUrl)} />
						<ExtractionField label="HTML Lang" value={getString(extractions.htmlLang)} />
						<ExtractionField
							label="Viewport"
							value={getString(extractions.viewportMeta)}
						/>
						{h1List.length > 0 && (
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
									H1 Headings ({h1List.length})
								</span>
								<ul className="text-xs space-y-1">
									{h1List.map((h1, i) => (
										<li key={i} className="font-medium break-all">
											{h1 || "—"}
										</li>
									))}
								</ul>
							</div>
						)}
						<div className="grid grid-cols-2 gap-2">
							<ExtractionField
								label="DOM Elements"
								value={getNumber(extractions.domElementCount)}
							/>
							<ExtractionField label="DOM Depth" value={getNumber(extractions.domDepth)} />
						</div>
						<div className="grid grid-cols-3 gap-2">
							<ExtractionField label="Main" value={getNumber(extractions.countMain)} />
							<ExtractionField
								label="Articles"
								value={getNumber(extractions.countArticle)}
							/>
							<ExtractionField
								label="Sections"
								value={getNumber(extractions.countSection)}
							/>
						</div>
						<div className="grid grid-cols-4 gap-2">
							<ExtractionField label="H2" value={getNumber(extractions.countH2)} />
							<ExtractionField label="H3" value={getNumber(extractions.countH3)} />
							<ExtractionField label="H4" value={getNumber(extractions.countH4)} />
							<ExtractionField label="P" value={getNumber(extractions.countP)} />
						</div>
						<div className="grid grid-cols-2 gap-2">
							<ExtractionField label="Header" value={getNumber(extractions.countHeader)} />
							<ExtractionField label="Footer" value={getNumber(extractions.countFooter)} />
						</div>
					</ExtractionSection>

					{/* Open Graph Tags */}
					{ogTags.length > 0 && (
						<ExtractionSection
							title={`Open Graph Tags (${ogTags.length})`}
							icon={<DatabaseIcon className="size-3 text-muted-foreground" />}
						>
							{ogTags.map((tag, i) => (
								<div key={i} className="flex flex-col gap-0.5">
									<span className="text-[10px] text-muted-foreground">
										{tag.property}
									</span>
									<span className="text-xs font-medium break-all">
										{tag.content || "—"}
									</span>
								</div>
							))}
						</ExtractionSection>
					)}

					{/* Twitter Cards */}
					{twitterTags.length > 0 && (
						<ExtractionSection
							title={`Twitter Cards (${twitterTags.length})`}
							icon={<DatabaseIcon className="size-3 text-muted-foreground" />}
						>
							{twitterTags.map((tag, i) => (
								<div key={i} className="flex flex-col gap-0.5">
									<span className="text-[10px] text-muted-foreground">
										{tag.name}
									</span>
									<span className="text-xs font-medium break-all">
										{tag.content || "—"}
									</span>
								</div>
							))}
						</ExtractionSection>
					)}

					{/* Accessibility Signals */}
					<ExtractionSection
						title="Accessibility Signals"
						icon={<DatabaseIcon className="size-3 text-muted-foreground" />}
					>
						<div className="grid grid-cols-2 gap-2">
							<ExtractionField
								label="Axe Passes"
								value={getNumber(extractions.axePasses)}
							/>
							<ExtractionField
								label="Axe Violations"
								value={getNumber(extractions.axeViolations)}
							/>
						</div>
					</ExtractionSection>

					{/* Technical Signals */}
					<ExtractionSection
						title="Technical Signals"
						icon={<DatabaseIcon className="size-3 text-muted-foreground" />}
					>
						{perfData ? (
							<>
								<div className="grid grid-cols-2 gap-2">
									<ExtractionField
										label="TTFB (ms)"
										value={Math.round(perfData.ttfb)}
									/>
									<ExtractionField
										label="DOM Interactive (ms)"
										value={Math.round(perfData.domInteractive)}
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<ExtractionField
										label="First Contentful Paint (ms)"
										value={Math.round(perfData.fcp)}
									/>
									<ExtractionField
										label="Resource Count"
										value={perfData.resourceCount}
									/>
								</div>
							</>
						) : (
							<p className="text-xs text-muted-foreground">
								No performance data available
							</p>
						)}
					</ExtractionSection>
				</div>
			)}
		</div>
	);
};
