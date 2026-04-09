const CRC32_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i += 1) {
		let c = i;
		for (let j = 0; j < 8; j += 1) {
			c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const b of bytes) {
		crc = CRC32_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function encodeDosDateTime(date: Date): { dosTime: number; dosDate: number } {
	const year = Math.max(1980, date.getFullYear());
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = Math.floor(date.getSeconds() / 2);
	return {
		dosTime: (hours << 11) | (minutes << 5) | seconds,
		dosDate: ((year - 1980) << 9) | (month << 5) | day,
	};
}

function decodeDataUrl(dataUrl: string): Uint8Array | null {
	const match = dataUrl.match(/^data:.*?;base64,([a-z0-9+/=]+)$/i);
	if (!match) return null;
	const binary = atob(match[1]);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function toFileBytes(content: string): Uint8Array {
	const fromDataUrl = decodeDataUrl(content);
	if (fromDataUrl) return fromDataUrl;
	return new TextEncoder().encode(content);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

export function createZipFromWorkspaceFiles(
	files: Record<string, string>,
): Blob {
	const now = new Date();
	const { dosDate, dosTime } = encodeDosDateTime(now);
	const localRecords: Uint8Array[] = [];
	const centralRecords: Uint8Array[] = [];
	let offset = 0;

	for (const [name, content] of Object.entries(files)) {
		const nameBytes = new TextEncoder().encode(name);
		const dataBytes = toFileBytes(content);
		const fileCrc = crc32(dataBytes);
		const localHeader = new Uint8Array(
			30 + nameBytes.length + dataBytes.length,
		);
		const localView = new DataView(localHeader.buffer);

		localView.setUint32(0, 0x04034b50, true);
		localView.setUint16(4, 20, true);
		localView.setUint16(6, 0, true);
		localView.setUint16(8, 0, true);
		localView.setUint16(10, dosTime, true);
		localView.setUint16(12, dosDate, true);
		localView.setUint32(14, fileCrc, true);
		localView.setUint32(18, dataBytes.length, true);
		localView.setUint32(22, dataBytes.length, true);
		localView.setUint16(26, nameBytes.length, true);
		localView.setUint16(28, 0, true);

		localHeader.set(nameBytes, 30);
		localHeader.set(dataBytes, 30 + nameBytes.length);
		localRecords.push(localHeader);

		const centralHeader = new Uint8Array(46 + nameBytes.length);
		const centralView = new DataView(centralHeader.buffer);
		centralView.setUint32(0, 0x02014b50, true);
		centralView.setUint16(4, 20, true);
		centralView.setUint16(6, 20, true);
		centralView.setUint16(8, 0, true);
		centralView.setUint16(10, 0, true);
		centralView.setUint16(12, dosTime, true);
		centralView.setUint16(14, dosDate, true);
		centralView.setUint32(16, fileCrc, true);
		centralView.setUint32(20, dataBytes.length, true);
		centralView.setUint32(24, dataBytes.length, true);
		centralView.setUint16(28, nameBytes.length, true);
		centralView.setUint16(30, 0, true);
		centralView.setUint16(32, 0, true);
		centralView.setUint16(34, 0, true);
		centralView.setUint16(36, 0, true);
		centralView.setUint32(38, 0, true);
		centralView.setUint32(42, offset, true);

		centralHeader.set(nameBytes, 46);
		centralRecords.push(centralHeader);
		offset += localHeader.length;
	}

	const centralSize = centralRecords.reduce(
		(sum, part) => sum + part.length,
		0,
	);
	const endRecord = new Uint8Array(22);
	const endView = new DataView(endRecord.buffer);
	endView.setUint32(0, 0x06054b50, true);
	endView.setUint16(4, 0, true);
	endView.setUint16(6, 0, true);
	endView.setUint16(8, centralRecords.length, true);
	endView.setUint16(10, centralRecords.length, true);
	endView.setUint32(12, centralSize, true);
	endView.setUint32(16, offset, true);
	endView.setUint16(20, 0, true);

	const blobParts: BlobPart[] = [
		...localRecords.map(toArrayBuffer),
		...centralRecords.map(toArrayBuffer),
		toArrayBuffer(endRecord),
	];

	return new Blob(blobParts, {
		type: "application/zip",
	});
}
