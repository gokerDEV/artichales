import { useCallback, useEffect, useState } from "react";
import {
	type AppSettings,
	DEFAULT_APP_SETTINGS,
	settingsService,
} from "@/services/storage";

interface UseSettingsReturn {
	settings: AppSettings;
	loading: boolean;
	saving: boolean;
	updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
	const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		settingsService.getSettings().then((s) => {
			if (!cancelled) {
				setSettings(s);
				setLoading(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
		setSaving(true);
		try {
			await settingsService.updateSettings(patch);
			setSettings((prev) => ({
				...prev,
				...patch,
				ux: patch.ux ? { ...prev.ux, ...patch.ux } : prev.ux,
			}));
		} finally {
			setSaving(false);
		}
	}, []);

	return { settings, loading, saving, updateSettings };
}
