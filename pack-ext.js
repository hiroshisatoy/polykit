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
]);
const EXCLUDE_SUFFIXES = [".xpi", ".zip"];

/**
 * @param {string} name
 * @param {boolean} isDirectory
 * @returns {boolean}
 */
function shouldSkip(name, isDirectory) {
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
 * @param {string} output
 * @returns {Promise<void>}
 */
async function zipdir(root, output) {
	const files = [];
	await collectFiles(root, root, files);
	const zip = new JSZip();

	for (const file of files) {
		zip.file(file.archivePath, await Deno.readFile(file.path));
	}

	const bytes = await zip.generateAsync({
		type: "uint8array",
		compression: "DEFLATE",
	});
	await Deno.writeFile(output, bytes);
}

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

await zipdir(packPath, name + ".zip");
console.log("- Chrome package done: " + name + ".zip");
await zipdir(packPath, name + ".xpi");
console.log("- Firefox package done: " + name + ".xpi");
