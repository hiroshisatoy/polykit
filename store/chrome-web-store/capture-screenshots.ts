// Chrome for Testing を隔離プロファイルで起動し、PolyKit を読み込んでから実行する。
// 公開サイトの閲覧操作だけを行い、翻訳の保存・承認や設定変更はしない。
const endpoint = Deno.env.get("POLYKIT_CDP_URL") || "http://localhost:9225";
const target = "https://translate.wordpress.org/projects/wp/dev/ja/default/";
const output = new URL("./screenshots/", import.meta.url);
const tabs = await (await fetch(`${endpoint}/json/list`)).json();
const tab = tabs.find((item: { type: string; url: string }) => item.type === "page" && item.url === "about:blank");
if (!tab) throw new Error("空の Chrome for Testing タブが見つかりません。");

const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise<void>((resolve, reject) => {
	socket.onopen = () => resolve();
	socket.onerror = reject;
});
let nextId = 0;
const pending = new Map<number, (value: Record<string, unknown>) => void>();
socket.onmessage = (event) => {
	const message = JSON.parse(event.data);
	if (message.id && pending.has(message.id)) {
		pending.get(message.id)?.(message);
		pending.delete(message.id);
	}
};
function send(method: string, params: Record<string, unknown> = {}) {
	const id = ++nextId;
	return new Promise<Record<string, unknown>>((resolve) => {
		pending.set(id, resolve);
		socket.send(JSON.stringify({ id, method, params }));
	});
}
async function evaluate(expression: string) {
	const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
	if (response.error || (response.result as { exceptionDetails?: unknown })?.exceptionDetails) {
		throw new Error(JSON.stringify(response));
	}
	return (response.result as { result?: { value?: unknown } })?.result?.value;
}
async function until(expression: string) {
	for (let attempt = 0; attempt < 30; attempt++) {
		if (await evaluate(expression)) return;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`撮影対象が表示されません: ${expression}`);
}
async function capture(filename: string) {
	await new Promise((resolve) => setTimeout(resolve, 900));
	const response = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
	const data = (response.result as { data?: string })?.data;
	if (!data) throw new Error(JSON.stringify(response));
	await Deno.writeFile(new URL(filename, output), Uint8Array.from(atob(data), (character) => character.charCodeAt(0)));
	console.log(filename);
}
async function capturePromo() {
	await send("Emulation.setDeviceMetricsOverride", {
		width: 440,
		height: 280,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await send("Page.navigate", { url: new URL("./promo-small.svg", import.meta.url).href });
	await new Promise((resolve) => setTimeout(resolve, 900));
	const response = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
	const data = (response.result as { data?: string })?.data;
	if (!data) throw new Error(JSON.stringify(response));
	await Deno.writeFile(
		new URL("./promo-small.png", import.meta.url),
		Uint8Array.from(atob(data), (character) => character.charCodeAt(0)),
	);
	console.log("promo-small.png");
}

try {
	await send("Emulation.setDeviceMetricsOverride", {
		width: 1280,
		height: 800,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await send("Page.navigate", { url: target });
	await until("!!document.querySelector('.polykit-filter-warnings') && !!document.querySelector('#menu-item-polykit')");
	if (!await evaluate("document.body.innerText.includes('Log In')")) {
		throw new Error("ログアウト状態を確認できません。個人情報を写さないため撮影を中止します。");
	}
	await evaluate("window.scrollTo(0, 0)");
	await capture("01-translation-list.png");

	if (!await evaluate("document.querySelectorAll('tr.preview.polykit-has-check-warning').length > 0")) {
		throw new Error("警告行が見つかりません。別の公開翻訳ページを確認してください。");
	}
	await evaluate("document.querySelector('.polykit-filter-warnings').click(); window.scrollTo(0, 0)");
	await capture("02-warning-filter.png");

	await evaluate("document.querySelector('tr.preview.polykit-has-check-warning a.action.edit').click()");
	await until("!![...document.querySelectorAll('textarea.foreign-text')].find(e => e.getBoundingClientRect().width > 0)");
	await evaluate("for (const a of document.querySelectorAll('a[href^=\\\"https://profiles.wordpress.org/\\\"]')) a.closest('dl')?.style.setProperty('visibility', 'hidden'); window.scrollTo(0, 330)");
	await capture("03-translation-detail.png");

	await evaluate("document.querySelector('#menu-item-polykit a').click(); window.scrollTo(0, 0)");
	await until("!!document.querySelector('.polykit-settings [role=tabpanel]:not([hidden])')");
	await capture("04-settings.png");

	await evaluate("[...document.querySelectorAll('.polykit-settings button[role=tab]')].find(e => e.textContent.includes('日本語スタイルガイド')).click(); window.scrollTo(0, 0)");
	await capture("05-japanese-style-settings.png");
	await capturePromo();
} finally {
	socket.close();
}
