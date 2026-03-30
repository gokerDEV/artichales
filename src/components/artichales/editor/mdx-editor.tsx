import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type MdxEditorProps = {
	value: string;
	onChange: (value: string) => void;
	className?: string;
	label?: string;
};

export function MdxEditor({
	value,
	onChange,
	className,
	label = "MDX",
}: MdxEditorProps) {
	const id = React.useId();

	return (
		<div className={cn("flex h-full flex-col gap-3", className)}>
			<div className="flex h-[48px] w-full shrink-0 items-center justify-between border-border border-b bg-card px-4">
				<Label
					htmlFor={id}
					className="text-muted-foreground text-xs uppercase tracking-wide"
				>
					{label}
				</Label>
			</div>
			<Textarea
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-full resize-none rounded-none border-none bg-card font-mono text-sm"
				placeholder="Write your paper.md here..."
			/>
		</div>
	);
}
