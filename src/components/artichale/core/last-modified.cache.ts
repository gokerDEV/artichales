const DEFAULT_LAST_MODIFIED_CACHE_SIZE = 32;

export class LastModifiedLruCache<T> {
	private readonly entries = new Map<string, T>();

	constructor(private readonly maxSize = DEFAULT_LAST_MODIFIED_CACHE_SIZE) {}

	get(lastModified: string): T | undefined {
		const cached = this.entries.get(lastModified);
		if (cached === undefined) return undefined;

		this.entries.delete(lastModified);
		this.entries.set(lastModified, cached);
		return cached;
	}

	set(lastModified: string, value: T): void {
		if (this.entries.has(lastModified)) {
			this.entries.delete(lastModified);
		} else if (this.entries.size >= this.maxSize) {
			const oldestKey = this.entries.keys().next().value;
			if (oldestKey !== undefined) {
				this.entries.delete(oldestKey);
			}
		}

		this.entries.set(lastModified, value);
	}

	clear(): void {
		this.entries.clear();
	}
}

export function createLastModifiedCache<T>(
	maxSize = DEFAULT_LAST_MODIFIED_CACHE_SIZE,
): LastModifiedLruCache<T> {
	return new LastModifiedLruCache<T>(maxSize);
}
