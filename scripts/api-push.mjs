// 通过 Git Data API 把本地项目文件作为一个新提交推送到远端仓库（保留历史）
// 用法: GH=<token> node scripts/api-push.mjs <owner/repo> <branch> [-m <commit message>] <file1> [file2...]
import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';

const argv = process.argv.slice(2);
let message = '⚡ Update via api-push';
const messageIndex = argv.indexOf('-m');
if (messageIndex !== -1) {
    const messageArgument = argv[messageIndex + 1];
    if (!messageArgument) usage();
    message = messageArgument;
    argv.splice(messageIndex, 2);
}

const [repository, branch, ...files] = argv;
if (!process.env.GH || !repository || !branch || !files.length) usage();

const repositoryParts = repository.split('/');
if (repositoryParts.length !== 2 || !repositoryParts[0] || !repositoryParts[1]) usage();
const [owner, repo] = repositoryParts;

const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
const branchPath = branch.split('/').map(encodeURIComponent).join('/');
const headers = {
    Authorization: `Bearer ${process.env.GH}`,
    'User-Agent': 'upload-script',
    Accept: 'application/vnd.github+json'
};

function usage() {
    console.error('usage: GH=<token> node scripts/api-push.mjs <owner/repo> <branch> [-m <commit message>] <files...>');
    process.exit(1);
}

async function request(path, options = {}, action = '请求 GitHub API') {
    const response = await fetch(api + path, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal: AbortSignal.timeout(30000)
    });
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (!response.ok) {
        throw new Error(`${action}失败 (${response.status}): ${data?.message ?? response.statusText}`);
    }
    return data;
}

function post(path, body, action) {
    return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }, action);
}

function remotePath(file) {
    const path = posix.normalize(file.replace(/\\/g, '/'));
    if (posix.isAbsolute(path) || /^[A-Za-z]:\//.test(path) || path.split('/').includes('..')) {
        throw new Error(`非法文件路径: ${file}`);
    }
    return path;
}

async function main() {
    const ref = await request(`/git/ref/heads/${branchPath}`, {}, '获取分支');
    if (!ref.object) throw new Error(`获取分支失败: ${JSON.stringify(ref)}`);
    const baseSha = ref.object.sha;

    const base = await request(`/git/commits/${baseSha}`, {}, '获取基础提交');
    if (!base.tree?.sha) throw new Error(`获取基础 tree 失败: ${JSON.stringify(base)}`);

    const tree = [];
    for (const file of files) {
        const path = remotePath(file);
        const content = await readFile(file);
        const blob = await post('/git/blobs', {
            content: content.toString('base64'),
            encoding: 'base64'
        }, `创建 blob ${file}`);
        if (!blob.sha) throw new Error(`创建 blob 失败 ${file}: ${JSON.stringify(blob)}`);
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
        console.log('  blob ✓', file);
    }

    const newTree = await post('/git/trees', {
        base_tree: base.tree.sha,
        tree
    }, '创建 tree');
    if (!newTree.sha) throw new Error(`创建 tree 失败: ${JSON.stringify(newTree)}`);

    const commit = await post('/git/commits', {
        message,
        tree: newTree.sha,
        parents: [baseSha]
    }, '创建提交');
    if (!commit.sha) throw new Error(`创建提交失败: ${JSON.stringify(commit)}`);

    const updatedRef = await request(`/git/refs/heads/${branchPath}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: commit.sha, force: false })
    }, '更新分支');
    if (!updatedRef.object) throw new Error(`更新分支失败: ${JSON.stringify(updatedRef)}`);

    console.log(`✅ 已推送 ${files.length} 个文件到 ${repository}@${branch}，提交 ${commit.sha.slice(0, 7)}`);
}

main().catch(error => {
    console.error('❌', error.message);
    process.exit(1);
});
