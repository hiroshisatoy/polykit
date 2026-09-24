import { dirname, fromFileUrl, join, relative } from "@std/path";
import JSZip from "jszip";

/**
 * パッケージに含めるファイルとディレクトリ。これ以外は含めない。
 * ディレクトリは配下のファイルをすべて含める（ドットで始まるものを除く）。
 */
const PACKAGE_ENTRIES = [
	"manifest.json",
	"popup.html",
	"LICENSE",
	"css",
	"js",
	"languages",
];
const PACKAGE_ICON_PATTERN = /^icon-\d+\.png$/;

/**
 * @param {string} dir
 * @param {string} root
 * @param {string[]} files
 * @returns {Promise<void>}
 */
async function collectDirectory(dir, root, files) {
	for await (const entry of Deno.readDir(dir)) {
		if (entry.name.startsWith(".")) {
			continue;
		}
		const path = join(dir, entry.name);
		if (entry.isDirectory) {
			await collectDirectory(path, root, files);
		} else if (entry.isFile) {
			files.push(relative(root, path));
		}
	}
}

/**
 * @param {string} root
 * @returns {Promise<string[]>} パッケージ内のパス（区切りは "/"）。
 */
export async function listPackageFiles(root) {
	const files = [];
	for (const entry of PACKAGE_ENTRIES) {
		const path = join(root, entry);
		const stat = await Deno.stat(path);
		if (stat.isDirectory) {
			await collectDirectory(path, root, files);
		} else {
			files.push(entry);
		}
	}
	for await (const entry of Deno.readDir(join(root, "icons"))) {
		if (entry.isFile && PACKAGE_ICON_PATTERN.test(entry.name)) {
			files.push(join("icons", entry.name));
		}
	}
	return files.map((file) => file.replaceAll("\\", "/")).sort();
}

/**
 * @param {string} root
 * @param {Record<string, Uint8Array | string>} [overrides] archivePath ごとの差し替え内容。
 * @returns {Promise<Uint8Array>}
 */
async function zipdir(root, overrides = {}) {
	const files = (await listPackageFiles(root)).map((archivePath) => ({
		path: join(root, archivePath),
		archivePath,
	}));
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

	const chromeZip = await zipdir(packPath);
	await Deno.writeFile(join(packPath, name + ".zip"), chromeZip);
	console.log("- Chrome package done: " + name + ".zip");

	const firefoxZip = await zipdir(packPath, {
		"manifest.json": buildFirefoxManifest(data),
	});
	await Deno.writeFile(join(packPath, name + ".xpi"), firefoxZip);
	console.log("- Firefox package done: " + name + ".xpi");
}

if (import.meta.main) {
	await main();
}
