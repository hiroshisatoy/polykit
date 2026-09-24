import crypto from "node:crypto";
import { dirname, fromFileUrl, join, relative } from "@std/path";
import JSZip from "jszip";

const EXCLUDE_PREFIXES = ["__", ".", "tests"];
const EXCLUDE_BASENAMES = new Set([
	"pack-ext.js",
	"pack-ext.py",
	"deno.json",
	"deno.lock",
	"README.md",
	"ISSUE_TEMPLATE.md",
	"key.pem",
]);
const EXCLUDE_SUFFIXES = [".xpi", ".zip", ".crx", ".pem"];
const CRX_ID_ALPHABET = "abcdefghijklmnop";

/**
 * @param {string} name
 * @param {boolean} isDirectory
 * @returns {boolean}
 */
export function shouldSkip(name, isDirectory) {
	if (EXCLUDE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
		return true;
	}
	if (EXCLUDE_BASENAMES.has(name)) {
		return true;
	}
	return !isDirectory && EXCLUDE_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

/**
 * @param {string} dir
 * @param {string} root
 * @param {{ path: string; archivePath: string }[]} files
 * @returns {Promise<void>}
 */
async function collectFiles(dir, root, files) {
	for await (const entry of Deno.readDir(dir)) {
		if (shouldSkip(entry.name, entry.isDirectory)) {
			continue;
		}
		const path = join(dir, entry.name);
		if (entry.isDirectory) {
			await collectFiles(path, root, files);
			continue;
		}
		if (entry.isFile) {
			files.push({ path, archivePath: relative(root, path) });
		}
	}
}

/**
 * @param {string} root
 * @param {Record<string, Uint8Array | string>} [overrides] archivePath ごとの差し替え内容。
 * @returns {Promise<Uint8Array>}
 */
async function zipdir(root, overrides = {}) {
	const files = [];
	await collectFiles(root, root, files);
	const zip = new JSZip();

	for (const file of files) {
		zip.file(
			file.archivePath,
			overrides[file.archivePath] ?? await Deno.readFile(file.path),
		);
	}

	return await zip.generateAsync({
		type: "uint8array",
		compression: "DEFLATE",
	});
}

/**
 * Firefox は MV3 の background.service_worker を未サポート（イベントページの scripts を使う）。
 * Chrome は background.scripts を拒否するため、Firefox 向け差分は .xpi 生成時にのみ適用する。
 *
 * @param {Record<string, unknown>} manifest
 * @returns {string}
 */
function buildFirefoxManifest(manifest) {
	const firefox = structuredClone(manifest);
	firefox.background = {
		scripts: [manifest.background.service_worker],
	};
	firefox.browser_specific_settings = {
		gecko: {
			id: "polykit@hiroshisatoy.github.io",
		},
	};
	return JSON.stringify(firefox, null, "  ") + "\n";
}

/**
 * @param {number} value
 * @returns {Uint8Array}
 */
function encodeVarint(value) {
	const bytes = [];
	let remaining = value;
	while (remaining > 0x7f) {
		bytes.push((remaining & 0x7f) | 0x80);
		remaining = Math.floor(remaining / 128);
	}
	bytes.push(remaining);
	return new Uint8Array(bytes);
}

/**
 * @param {...Uint8Array} parts
 * @returns {Uint8Array}
 */
function concatBytes(...parts) {
	const length = parts.reduce((sum, part) => sum + part.length, 0);
	const output = new Uint8Array(length);
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
}

/**
 * @param {number} value
 * @returns {Uint8Array}
 */
function uint32LE(value) {
	const bytes = new Uint8Array(4);
	new DataView(bytes.buffer).setUint32(0, value, true);
	return bytes;
}

/**
 * @param {number} fieldNumber
 * @param {Uint8Array} value
 * @returns {Uint8Array}
 */
function encodeBytesField(fieldNumber, value) {
	return concatBytes(
		encodeVarint((fieldNumber << 3) | 2),
		encodeVarint(value.length),
		value,
	);
}

/**
 * @param {Uint8Array} crxId
 * @returns {string}
 */
export function extensionIdFromCrxId(crxId) {
	let id = "";
	for (const byte of crxId) {
		id += CRX_ID_ALPHABET[(byte >> 4) & 0x0f];
		id += CRX_ID_ALPHABET[byte & 0x0f];
	}
	return id;
}

/**
 * Chrome 用 ZIP に CRX3 署名を付ける。
 * 署名対象は "CRX3 SignedData\\0" + 署名ヘッダ長 + 署名ヘッダ + ZIP。
 *
 * @param {Uint8Array} zipBytes
 * @param {string} privateKeyPem
 * @returns {{ bytes: Uint8Array; extensionId: string }}
 */
export function buildCrx(zipBytes, privateKeyPem) {
	const privateKey = crypto.createPrivateKey(privateKeyPem);
	const publicKey = crypto.createPublicKey(privateKey).export({
		type: "spki",
		format: "der",
	});
	const crxId = crypto.createHash("sha256").update(publicKey).digest().subarray(0, 16);
	const signedHeaderData = encodeBytesField(1, crxId);
	const signedPayload = concatBytes(
		new TextEncoder().encode("CRX3 SignedData\0"),
		uint32LE(signedHeaderData.length),
		signedHeaderData,
		zipBytes,
	);
	const signature = crypto.sign("sha256", signedPayload, {
		key: privateKey,
		padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
		saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
	});
	const verified = crypto.verify(
		"sha256",
		signedPayload,
		{
			key: crypto.createPublicKey(privateKey),
			padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
			saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
		},
		signature,
	);
	if (!verified) {
		throw new Error("CRX signature verification failed");
	}

	const proof = concatBytes(
		encodeBytesField(1, publicKey),
		encodeBytesField(2, signature),
	);
	const header = concatBytes(
		encodeBytesField(2, proof),
		encodeBytesField(10000, signedHeaderData),
	);
	return {
		bytes: concatBytes(
			new TextEncoder().encode("Cr24"),
			uint32LE(3),
			uint32LE(header.length),
			header,
			zipBytes,
		),
		extensionId: extensionIdFromCrxId(crxId),
	};
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizePem(value) {
	let pem = value.trim();
	if (!pem.includes("\n") && pem.includes("\\n")) {
		pem = pem.replaceAll("\\n", "\n");
	}
	if (!pem.endsWith("\n")) {
		pem += "\n";
	}
	return pem;
}

/**
 * @param {string} root
 * @returns {Promise<{ privateKeyPem: string; created: boolean }>}
 */
async function loadCrxPrivateKey(root) {
	const fromEnv = Deno.env.get("CRX_PRIVATE_KEY");
	if (fromEnv && fromEnv.trim()) {
		return { privateKeyPem: normalizePem(fromEnv), created: false };
	}

	const keyPath = join(root, "key.pem");
	if (await Deno.stat(keyPath).then((stat) => stat.isFile).catch(() => false)) {
		return { privateKeyPem: normalizePem(await Deno.readTextFile(keyPath)), created: false };
	}

	if (Deno.env.get("GITHUB_ACTIONS") === "true") {
		console.error(
			"CRX の署名鍵がありません。拡張機能 ID を固定するため、secret CRX_PRIVATE_KEY に key.pem の内容を設定してください。",
		);
		Deno.exit(1);
	}

	const { privateKey } = crypto.generateKeyPairSync("rsa", {
		modulusLength: 2048,
		publicKeyEncoding: { type: "spki", format: "pem" },
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
	});
	await Deno.writeTextFile(keyPath, privateKey, { mode: 0o600 });
	return { privateKeyPem: privateKey, created: true };
}

async function main() {
	const scriptDir = dirname(fromFileUrl(import.meta.url));
	const packPath = Deno.args[0] ?? scriptDir;

	console.log("PolyKit extension packager");
	console.log("Usage: deno task pack  |  deno run -A pack-ext.js [path]");

	const manifestPath = join(packPath, "manifest.json");

	if (!(await Deno.stat(packPath).then((s) => s.isDirectory).catch(() => false))) {
		console.error("Path not found");
		Deno.exit(1);
	}

	if (!(await Deno.stat(manifestPath).then((s) => s.isFile).catch(() => false))) {
		console.error("Manifest not found: " + manifestPath);
		Deno.exit(1);
	}

	const data = JSON.parse(await Deno.readTextFile(manifestPath));
	const name = data.name.replaceAll(" ", "-") + "_v" + data.version;
	const { privateKeyPem, created } = await loadCrxPrivateKey(packPath);
	if (created) {
		console.log("- Created signing key: key.pem");
		console.log("  拡張機能 ID を維持するため、このファイルを保管し、GitHub の secret CRX_PRIVATE_KEY に登録してください。");
	}

	const chromeZip = await zipdir(packPath);
	await Deno.writeFile(join(packPath, name + ".zip"), chromeZip);
	console.log("- Chrome package done: " + name + ".zip");

	const crx = buildCrx(chromeZip, privateKeyPem);
	await Deno.writeFile(join(packPath, name + ".crx"), crx.bytes);
	console.log("- Chrome package done: " + name + ".crx (" + crx.extensionId + ")");

	const firefoxZip = await zipdir(packPath, {
		"manifest.json": buildFirefoxManifest(data),
	});
	await Deno.writeFile(join(packPath, name + ".xpi"), firefoxZip);
	console.log("- Firefox package done: " + name + ".xpi");
}

if (import.meta.main) {
	await main();
}
