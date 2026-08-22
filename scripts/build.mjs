// 构建脚本：打包压缩 JS/CSS，产物带 content-hash 文件名（彻底解决手动 ?v= 版本号问题），
// 生成 dist/ 目录供 Cloudflare Pages 部署。
// 用法：
//   node scripts/build.mjs          # 单次构建
//   node scripts/build.mjs --watch  # 监听模式（开发用）
import { build } from 'esbuild';
import { mkdir, readdir, readFile, writeFile, rm, watch as fsWatch } from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const ASSETS = path.join(DIST, 'assets');
const watchMode = process.argv.includes('--watch');

async function buildOnce() {
    await rm(DIST, { recursive: true, force: true });
    await mkdir(ASSETS, { recursive: true });

    // JS：从 main.js 打包所有模块
    await build({
        entryPoints: ['js/main.js'],
        bundle: true,
        minify: true,
        format: 'esm',
        target: ['es2018'],
        outdir: ASSETS,
        entryNames: '[name].[hash]',
        sourcemap: false,
        legalComments: 'none',
        charset: 'utf8',
        logLevel: 'info'
    });

    // CSS：压缩
    await build({
        entryPoints: ['style.css'],
        minify: true,
        outdir: ASSETS,
        entryNames: '[name].[hash]',
        sourcemap: false,
        logLevel: 'silent'
    });

    // 扫描产物，建立 原名 -> hash 文件名 映射
    const files = await readdir(ASSETS);
    const map = {};
    for (const f of files) {
        const m = /^(main|style)\.[A-Za-z0-9_-]+\.(js|css)$/.exec(f);
        if (m) map[m[1]] = `/assets/${f}`;
    }
    if (!map.main || !map.style) {
        throw new Error('构建产物缺失：' + JSON.stringify(map));
    }

    // 生成 index.html：替换资源引用为带 hash 的路径
    let html = await readFile('index.html', 'utf8');
    html = html.replace('href="style.css"', `href="${map.style}"`);
    html = html.replace('src="js/main.js"', `src="${map.main}"`);
    await writeFile(path.join(DIST, 'index.html'), html);

    // 静态文件：_headers（Cloudflare Pages 安全头与缓存策略）
    await writeFile(path.join(DIST, '_headers'), await readFile('_headers'));

    console.log(`✔ 构建完成 → ${map.style} , ${map.main}`);
}

await buildOnce();

if (watchMode) {
    let timer;
    let building = Promise.resolve();
    // 变更合并后统一走 buildOnce，保证 dist 里的 HTML 与 hash 产物始终一致
    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(function () {
            building = building.then(buildOnce).catch(function (e) {
                console.error('✘ 重建失败：', e.message);
            });
        }, 120);
    }
    // 只监听源文件，避免 dist / node_modules 触发无限循环
    try {
        await fsWatch('js', { recursive: true }, schedule);
    } catch (e) {
        // 个别平台不支持递归监听：退化为逐文件监听
        for (const f of (await readdir('js')).filter(function (x) { return x.endsWith('.js'); })) {
            await fsWatch(path.join('js', f), schedule);
        }
    }
    for (const f of ['style.css', 'index.html', '_headers']) {
        try { await fsWatch(f, schedule); } catch (e) { /* ignore */ }
    }
    console.log('👀 watch 模式：源码变更自动重建 dist/');
}
