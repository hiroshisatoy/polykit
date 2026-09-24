import assert from "node:assert/strict";
import crypto from "node:crypto";
import { buildCrx, shouldSkip } from "../pack-ext.js";

function generatePrivateKey() {
	const { privateKey } = crypto.generateKeyPairSync("rsa", {
		modulusLength: 2048,
		publicKeyEncoding: { type: "spki", format: "pem" },
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
	});
	return privateKey;
}

Deno.test("CRX3 container is signed with a stable extension id", () => {
	const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
	const privateKey = generatePrivateKey();
	const first = buildCrx(zip, privateKey);
	const second = buildCrx(zip, privateKey);

	assert.strictEqual(first.extensionId, second.extensionId);
	assert.match(first.extensionId, /^[a-p]{32}$/);
	assert.strictEqual(String.fromCharCode(...first.bytes.subarray(0, 4)), "Cr24");
	assert.strictEqual(new DataView(first.bytes.buffer).getUint32(4, true), 3);
	assert.ok(first.bytes.length > zip.length);
	assert.deepStrictEqual(first.bytes.subarray(first.bytes.length - zip.length), zip);
	assert.notStrictEqual(buildCrx(zip, generatePrivateKey()).extensionId, first.extensionId);
});

Deno.test("packages exclude signing keys and existing archives", () => {
	assert.strictEqual(shouldSkip("key.pem", false), true);
	assert.strictEqual(shouldSkip("PolyKit_v1.0.1.crx", false), true);
	assert.strictEqual(shouldSkip("PolyKit_v1.0.1.zip", false), true);
	assert.strictEqual(shouldSkip("manifest.json", false), false);
});
