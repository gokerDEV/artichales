import type React from "react";
import type { Metrics } from "@/lib/types/engine";
import { metricDescriptions } from "@/lib/engine/plan";
import { MetricRow } from "./metric.row";

interface Props {
	metrics: Metrics | null;
}

const METRIC_IDS = ["metadata_precision", "title_length", "meta_length"];

export const MetaTab: React.FC<Props> = ({ metrics }) => (
	<div className="flex flex-col gap-1">
		{METRIC_IDS.map((id) => (
			<MetricRow
				key={id}
				id={id}
				value={metrics?.[id]?.normalized ?? null}
				description={metricDescriptions[id] ?? ""}
			/>
		))}
	</div>
);
