import { Download, Monitor, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PreviewTarget = "web" | "print";

export type PreviewHeaderProps = {
	target: PreviewTarget;
	onTargetChange: (target: PreviewTarget) => void;
	scale: number;
	onScaleChange: (scale: number) => void;
	onExportPdf: () => void;
};

export function PreviewHeader({
	target,
	onTargetChange,
	scale,
	onScaleChange,
	onExportPdf,
}: PreviewHeaderProps) {
	return (
		<div className="flex h-12 w-full shrink-0 items-center justify-between border-border border-b bg-card px-4">
			<div className="flex items-center gap-3">
				<Tabs
					value={target}
					onValueChange={(v) => onTargetChange(v as PreviewTarget)}
				>
					<TabsList className="h-8">
						<TabsTrigger
							value="web"
							className="flex items-center gap-1.5 px-3 py-1 text-xs"
						>
							<Monitor className="h-3.5 w-3.5" /> Web
						</TabsTrigger>
						<TabsTrigger
							value="print"
							className="flex items-center gap-1.5 px-3 py-1 text-xs"
						>
							<Printer className="h-3.5 w-3.5" /> Print
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			<div className="flex items-center gap-2">
				<Select
					value={String(scale)}
					onValueChange={(val) => onScaleChange(Number(val))}
				>
					<SelectTrigger className="h-8 w-20 font-medium text-xs">
						<SelectValue placeholder="Scale" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="50">50%</SelectItem>
						<SelectItem value="75">75%</SelectItem>
						<SelectItem value="100">100%</SelectItem>
						<SelectItem value="125">125%</SelectItem>
						<SelectItem value="150">150%</SelectItem>
						<SelectItem value="200">200%</SelectItem>
					</SelectContent>
				</Select>

				<div className="mx-1 h-4 w-px bg-border" />

				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-muted-foreground hover:text-foreground"
					onClick={onExportPdf}
				>
					<Download className="h-4 w-4" />
					<span className="sr-only">Download PDF</span>
				</Button>
			</div>
		</div>
	);
}
