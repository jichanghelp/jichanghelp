/**
 * 从站点 RSS 拉最近三篇文章，更新 README 的「最近在写」区块。
 * 站点还没上线或 RSS 拉不到时安静退出（exit 0），不让定时任务报红。
 */
import { readFile, writeFile } from 'node:fs/promises';

const RSS = 'https://www.jichanghelp.com/rss.xml';
const README = new URL('../README.md', import.meta.url);

let xml;
try {
	const res = await fetch(RSS, { signal: AbortSignal.timeout(15000) });
	if (!res.ok) process.exit(0);
	xml = await res.text();
} catch {
	process.exit(0);
}

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3).map((m) => {
	const block = m[1];
	const pick = (tag) => {
		const raw = (block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) ?? [])[1] ?? '';
		return raw.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
	};
	const date = pick('pubDate') ? new Date(pick('pubDate')).toISOString().slice(0, 10) : '';
	return { title: pick('title'), link: pick('link'), date };
});

if (items.length === 0) process.exit(0);

const list = items.map((i) => `- **[${i.title}](${i.link})**${i.date ? ` · ${i.date}` : ''}`).join('\n');
const md = await readFile(README, 'utf8');
const next = md.replace(
	/<!-- LATEST:START -->[\s\S]*?<!-- LATEST:END -->/,
	`<!-- LATEST:START -->\n${list}\n<!-- LATEST:END -->`,
);
if (next !== md) {
	await writeFile(README, next, 'utf8');
	console.log('README 已更新');
} else {
	console.log('无变化');
}
