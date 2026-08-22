// 通过 Git Data API 把本地项目文件作为一个新提交推送到远端仓库（保留历史）
// 用法: GH=<token> node scripts/api-push.mjs <owner/repo> <branch> [-m <commit message>] <file1> [file2...]
const argv = process.argv.slice(2);
let msg = '⚡ Update via api-push';
const mIdx = argv.indexOf('-m');
if (mIdx !== -1 && argv[mIdx + 1]) {
    msg = argv[mIdx + 1];
    argv.splice(mIdx, 2);
}
const [repo, branch, ...files] = argv;
if (!process.env.GH || !repo || !branch || !files.length) {
    console.error('usage: GH=<token> node scripts/api-push.mjs <owner/repo> <branch> <files...>');
    process.exit(1);
}
const h = { Authorization: 'Bearer ' + process.env.GH, 'User-Agent': 'upload-script', Accept: 'application/vnd.github+json' };
const api = 'https://api.github.com/repos/' + repo;
const J = r => r.json();

async function main() {
    // 1. 当前分支头
    const ref = await J(await fetch(`${api}/git/ref/heads/${branch}`, { headers: h }));
    if (!ref.object) throw new Error('获取分支失败: ' + JSON.stringify(ref));
    const baseSha = ref.object.sha;

    // 2. 基础树
    const base = await J(await fetch(`${api}/git/commits/${baseSha}`, { headers: h }));
    const baseTree = base.tree.sha;

    // 3. 逐个创建 blob
    const tree = [];
    for (const f of files) {
        const content = await import('node:fs/promises').then(fs => fs.readFile(f));
        const b = await J(await fetch(`${api}/git/blobs`, {
            method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content.toString('base64'), encoding: 'base64' })
        }));
        if (!b.sha) throw new Error('blob 失败 ' + f + ': ' + JSON.stringify(b));
        tree.push({ path: f.replace(/\\/g, '/'), mode: '100644', type: 'blob', sha: b.sha });
        console.log('  blob ✓', f);
    }

    // 4. 新树
    const nt = await J(await fetch(`${api}/git/trees`, {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: baseTree, tree })
    }));
    if (!nt.sha) throw new Error('tree 失败: ' + JSON.stringify(nt));

    // 5. 提交
    const c = await J(await fetch(`${api}/git/commits`, {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, tree: nt.sha, parents: [baseSha] })
    }));
    if (!c.sha) throw new Error('commit 失败: ' + JSON.stringify(c));

    // 6. 更新分支
    const u = await fetch(`${api}/git/refs/heads/${branch}`, {
        method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: c.sha, force: false })
    });
    const ur = await J(u);
    if (!ur.object) throw new Error('更新分支失败: ' + JSON.stringify(ur));
    console.log(`✅ 已推送 ${files.length} 个文件到 ${repo}@${branch}，提交 ${c.sha.slice(0, 7)}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
