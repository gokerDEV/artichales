export type PrintJobTarget = "print";

export type PrintJob = {
	id: string;
	createdAt: number;
	target: PrintJobTarget;
	files: Record<string, string>;
	options?: {
		autoPrint?: boolean;
	};
};
