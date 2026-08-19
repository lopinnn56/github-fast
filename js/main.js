import { getMain, getPinned, getAll, reset, pinNode, unpinNode, removeMain, removePinned, reorderMain, reorderPinned } from './nodes.js?v=10';
import { isGitHubUrl, detectType, TYPE_LABEL, buildAccelUrl, hostOf, parseBatch } from './convert.js?v=10';
import { speedMap, runSpeedTest } from './speed.js?v=10';
import { toast, copyText, debounce, initUx } from './ui.js?v=10';

const MODE_KEY = 'gh_accel_mode';
let mode = (function () {
    try {
        const m = localStorage.getItem(MODE_KEY);
        // 校验持久化的模式，避免脏数据破坏分段控件
        return (m === 'link' || m === 'clone') ? m : 'link';
    } catch (e) { return 'link'; }
})();
let lastLinks = [];
let dragIndex = null;
let dragList = null;
let testing = false;
let animCounter = 0;

const $ = function (id) { return document.getElementById(id); };

function mkBtn(text, fn, extra) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-btn' + (extra ? ' ' + extra : '');
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
}

function nextDelay() {
    animCounter++;
    return (animCounter * 30) + 'ms';
}

function buildRow(n, localIndex, globalIndex, listType) {
    const li = document.createElement('li');
    li.className = 'node-row';
    li.draggable = true;
    li.dataset.index = globalIndex;

    const info = document.createElement('div');
    info.className = 'n-info';
    const name = document.createElement('span');
    name.className = 'n-name';
    name.textContent = n.name;
    name.title = n.name;
    name.tabIndex = 0;
    name.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            copyText(buildAccelUrl('https://github.com', n));
        }
    });
    name.addEventListener('click', function () {
        copyText(buildAccelUrl('https://github.com', n));
    });
    const sp = speedMap[n.prefix];
    const speed = document.createElement('span');
    speed.className = 'n-speed' + (sp ? (sp.ok ? ' s-ok' : ' s-bad') : '');
    speed.textContent = sp ? (sp.ok ? Math.round(sp.ms) + 'ms' : '✕') : '';
    speed.title = sp ? (sp.ok ? '可用 · 延迟 ' + Math.round(sp.ms) + 'ms' : '不可用 / 超时') : '未测速';
    const h = document.createElement('span');
    h.className = 'n-host';
    h.textContent = hostOf(n.prefix) + ' · ' + (n.mode === 'prefix' ? 'prefix' : 'replace');
    info.appendChild(name);
    info.appendChild(speed);
    info.appendChild(h);

    const actions = document.createElement('div');
    actions.className = 'n-actions';
    if (listType === 'main') {
        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'n-mini';
        up.textContent = '置顶';
        up.title = '置顶';
        up.setAttribute('aria-label', '置顶 ' + n.name);
        up.addEventListener('click', function () { pinNode(localIndex); refreshNodes(); toast('已置顶 ' + n.name); });
        actions.appendChild(up);
    } else {
        const dn = document.createElement('button');
        dn.type = 'button';
        dn.className = 'n-mini n-unpin';
        dn.textContent = '取消置顶';
        dn.title = '取消置顶';
        dn.setAttribute('aria-label', '取消置顶 ' + n.name);
        dn.addEventListener('click', function () { unpinNode(localIndex); refreshNodes(); toast('已取消置顶 ' + n.name); });
        actions.appendChild(dn);
    }
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'n-mini n-del';
    del.textContent = '删除';
    del.title = '删除';
    del.setAttribute('aria-label', '删除 ' + n.name);
    del.addEventListener('click', function () {
        if (listType === 'main') removeMain(localIndex);
        else removePinned(localIndex);
        refreshNodes();
        toast('已删除节点');
    });
    actions.appendChild(del);

    li.appendChild(info);
    li.appendChild(actions);

    li.addEventListener('dragstart', function () {
        dragIndex = localIndex;
        dragList = listType;
        li.classList.add('dragging');
    });
    li.addEventListener('dragend', function () {
        li.classList.remove('dragging');
        dragIndex = null;
        dragList = null;
    });
    li.addEventListener('dragover', function (e) { e.preventDefault(); });
    li.addEventListener('drop', function (e) {
        e.preventDefault();
        if (dragIndex === null || dragIndex === localIndex || dragList !== listType) return;
        if (listType === 'main') reorderMain(dragIndex, localIndex);
        else reorderPinned(dragIndex, localIndex);
        refreshNodes();
    });

    return li;
}

function renderNodes() {
    const main = getMain();
    const pinned = getPinned();
    const count = $('nodesCount');
    if (count) count.textContent = '共 ' + (main.length + pinned.length) + ' 个节点（置顶 ' + pinned.length + '）· 点击节点名复制加速主页';

    const pinnedHead = $('pinnedHead');
    const pinnedList = $('pinnedList');
    const pCount = $('pinnedCount');
    if (pinned.length) {
        pinnedHead.hidden = false;
        if (pCount) pCount.textContent = pinned.length + ' 个';
        const pFrag = document.createDocumentFragment();
        pinned.forEach(function (n, i) {
            pFrag.appendChild(buildRow(n, i, i, 'pinned'));
        });
        pinnedList.replaceChildren(pFrag);
    } else {
        pinnedHead.hidden = true;
        pinnedList.replaceChildren();
    }

    const list = $('nodeList');
    const fragment = document.createDocumentFragment();
    main.forEach(function (n, i) {
        fragment.appendChild(buildRow(n, i, pinned.length + i, 'main'));
    });
    list.replaceChildren(fragment);
}

function refreshNodes() {
    renderNodes();
    if (lastLinks.length) renderResults(lastLinks);
}

function buildResultItem(url, node, type, pinned) {
    const target = buildAccelUrl(url, node);
    const typeTag = TYPE_LABEL[type] || '';
    const item = document.createElement('div');
    item.className = 'result-item' + (typeTag ? ' ti-' + type : '') + (pinned ? ' pinned' : '');
    item.style.animationDelay = nextDelay();

    const head = document.createElement('div');
    head.className = 'ri-head';
    const left = document.createElement('div');
    left.className = 'ri-left';
    const nm = document.createElement('span');
    nm.className = 'ri-name';
    nm.textContent = node.name;
    const tag = document.createElement('span');
    tag.className = 'ri-tag';
    tag.textContent = typeTag;
    left.appendChild(nm);
    left.appendChild(tag);

    const actions = document.createElement('div');
    actions.className = 'ri-actions';
    const urlEl = document.createElement('span');
    urlEl.className = 'ri-url';

    if (mode === 'clone') {
        const cmd = 'git clone ' + target;
        actions.appendChild(mkBtn('复制命令', function (e) { copyText(cmd, e.currentTarget); }));
        urlEl.textContent = cmd;
    } else {
        actions.appendChild(mkBtn('复制', function (e) { copyText(target, e.currentTarget); }));
        const op = document.createElement('a');
        op.className = 'mini-btn';
        op.textContent = '打开';
        op.href = target;
        op.target = '_blank';
        op.rel = 'noopener';
        actions.appendChild(op);
        urlEl.textContent = target;
    }

    head.appendChild(left);
    head.appendChild(actions);
    item.appendChild(head);
    item.appendChild(urlEl);
    return item;
}

function makeSubhead(text) {
    const sub = document.createElement('div');
    sub.className = 'link-subhead';
    sub.textContent = text;
    return sub;
}

function renderResults(links) {
    const wrap = $('results');
    const listEl = $('resultList');
    lastLinks = links;
    if (!links.length) {
        wrap.hidden = true;
        return;
    }
    wrap.hidden = false;
    animCounter = 0;
    const multi = links.length > 1;
    const pinnedNodes = getPinned();
    const mainNodes = getMain();
    const fragment = document.createDocumentFragment();

    links.forEach(function (url) {
        const type = detectType(url);
        const typeTag = TYPE_LABEL[type] || '';
        const group = document.createElement('div');
        group.className = 'link-group';

        if (multi) {
            const head = document.createElement('div');
            head.className = 'group-head';
            const link = document.createElement('span');
            link.className = 'gh-link';
            link.textContent = url;
            link.title = url;
            const tag = document.createElement('span');
            tag.className = 'ri-tag';
            tag.textContent = typeTag;
            const actions = document.createElement('div');
            actions.className = 'ri-actions';
            actions.appendChild(mkBtn('复制本组', function (e) {
                const lines = getAll().map(function (n) {
                    const t = buildAccelUrl(url, n);
                    return mode === 'clone' ? 'git clone ' + t : t;
                });
                copyText(lines.join('\n'), e.currentTarget);
            }));
            actions.appendChild(mkBtn('删除本组', function () {
                const next = lastLinks.filter(function (l) { return l !== url; });
                renderResults(next);
                syncUrlParam(next);
            }));
            head.appendChild(link);
            head.appendChild(tag);
            head.appendChild(actions);
            group.appendChild(head);
        }

        if (pinnedNodes.length) {
            group.appendChild(makeSubhead('置顶节点 · ' + pinnedNodes.length));
            pinnedNodes.forEach(function (n) {
                group.appendChild(buildResultItem(url, n, type, true));
            });
        }
        if (mainNodes.length) {
            if (pinnedNodes.length) group.appendChild(makeSubhead('普通节点 · ' + mainNodes.length));
            mainNodes.forEach(function (n) {
                group.appendChild(buildResultItem(url, n, type, false));
            });
        }
        fragment.appendChild(group);
    });
    listEl.replaceChildren(fragment);
}

function setInputText(text) {
    const input = $('inputUrl');
    const textarea = $('inputUrls');
    if (text.includes('\n')) {
        input.hidden = true;
        textarea.hidden = false;
        textarea.value = text;
        autoResize(textarea);
    } else {
        input.hidden = false;
        textarea.hidden = true;
        input.value = text;
    }
}

function currentText() {
    const textarea = $('inputUrls');
    return textarea.hidden ? $('inputUrl').value : textarea.value;
}

function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
}

function doConvert() {
    const all = parseBatch(currentText());
    if (!all.length) {
        toast('请输入链接');
        return;
    }
    const links = all.filter(isGitHubUrl);
    if (!links.length) {
        toast('请输入有效的 GitHub 链接');
        // 清掉旧结果与地址栏参数，避免无效输入后仍残留上次的结果
        lastLinks = [];
        $('results').hidden = true;
        syncUrlParam([]);
        return;
    }
    if (links.length < all.length) {
        toast('已跳过 ' + (all.length - links.length) + ' 个无效链接');
    }
    renderResults(links);
    syncUrlParam(links);
}

function syncUrlParam(links) {
    try {
        const url = new URL(location.href);
        if (links.length) {
            url.searchParams.delete('url');
            links.forEach(function (l) { url.searchParams.append('url', l); });
        } else {
            url.search = '';
        }
        history.replaceState(null, '', url);
    } catch (e) {
        // ignore (e.g. file://)
    }
}

function readUrlParam() {
    try {
        const params = new URLSearchParams(location.search);
        const urls = params.getAll('url').filter(Boolean);
        if (!urls.length) return;
        setInputText(urls.join('\n'));
        const links = urls.filter(isGitHubUrl);
        if (links.length) renderResults(links);
    } catch (e) {
        // ignore
    }
}

function updateNodeSpeed(index, r) {
    let row = $('pinnedList').querySelector('li[data-index="' + index + '"]');
    if (!row) row = $('nodeList').querySelector('li[data-index="' + index + '"]');
    if (!row) return;
    const sp = row.querySelector('.n-speed');
    sp.className = 'n-speed' + (r.ok ? ' s-ok' : ' s-bad');
    sp.textContent = r.ok ? Math.round(r.ms) + 'ms' : '✕';
    sp.title = r.ok ? '可用 · 延迟 ' + Math.round(r.ms) + 'ms' : '不可用 / 超时';
    sp.classList.remove('bump');
    void sp.offsetWidth;
    sp.classList.add('bump');
}

async function speedTest() {
    if (testing) return;
    testing = true;
    const btn = $('speedBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '测速中…';
    toast('正在测速，检测节点可用性…');

    const nodes = getAll();
    const result = await runSpeedTest(nodes, function (i, r, done, total) {
        btn.textContent = '测速中… (' + done + '/' + total + ')';
        updateNodeSpeed(i, r);
    });

    renderNodes();

    testing = false;
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = '测速';
    toast('测速完成：可用 ' + result.okCount + ' / ' + result.total + ' 个，不可用节点已标记 ✕');
}

function initTerminal() {
    const body = $('termBody');
    if (!body) return;
    const lines = [
        { cls: 't-cmd', text: 'git clone https://github.com/lopinnn/github-fast', type: true },
        { cls: 't-dim', text: "Cloning into 'github-fast'..." },
        { cls: 't-dim', text: '正在通过 ghproxy.net 镜像加速...' },
        { cls: 't-out', text: 'remote: Counting objects: 128, done.' },
        { cls: 't-out', text: 'Receiving objects: 100% (128/128), 1.2 MiB | 24.6 MiB/s, done.' },
        { cls: 't-out', text: 'Resolving deltas: 100% (64/64), done.' },
        { cls: 't-ok', text: 'done.' }
    ];
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let idx = 0;

    function typeLine(line, done) {
        const p = document.createElement('p');
        p.className = line.cls;
        body.appendChild(p);
        if (reduced || !line.type) {
            p.textContent = line.text;
            done();
            return;
        }
        let i = 0;
        const t = setInterval(function () {
            i++;
            p.textContent = line.text.slice(0, i);
            if (i >= line.text.length) {
                clearInterval(t);
                done();
            }
        }, 34);
    }

    function next() {
        if (idx >= lines.length) {
            const cur = document.createElement('span');
            cur.className = 't-cursor';
            body.appendChild(cur);
            return;
        }
        const line = lines[idx++];
        typeLine(line, function () {
            setTimeout(next, line.type ? 380 : 240);
        });
    }
    next();
}

function init() {
    renderNodes();
    initTerminal();

    const input = $('inputUrl');
    const textarea = $('inputUrls');
    const liveChk = $('liveChk');
    const liveConvert = debounce(doConvert, 250);

    $('convertBtn').addEventListener('click', doConvert);

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            doConvert();
        }
    });
    input.addEventListener('input', function () {
        if (!liveChk.checked) return;
        liveConvert();
    });
    input.addEventListener('paste', function (e) {
        const text = (e.clipboardData || window.clipboardData).getData('text');
        if (text && text.includes('\n')) {
            e.preventDefault();
            input.hidden = true;
            textarea.hidden = false;
            textarea.value = text.trim();
            autoResize(textarea);
            textarea.focus();
            doConvert();
        }
    });

    textarea.addEventListener('input', function () {
        autoResize(textarea);
        if (!liveChk.checked) return;
        liveConvert();
    });
    textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doConvert();
        }
    });

    $('clearBtn').addEventListener('click', function () {
        input.value = '';
        textarea.value = '';
        input.hidden = false;
        textarea.hidden = true;
        // 清空后必须重置 lastLinks，否则切换模式/操作节点会把旧结果重新渲染出来
        lastLinks = [];
        $('results').hidden = true;
        syncUrlParam([]);
        input.focus();
    });

    document.querySelectorAll('.seg-btn[data-mode]').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.seg-btn[data-mode]').forEach(function (x) {
                x.classList.remove('active');
                x.setAttribute('aria-pressed', 'false');
            });
            b.classList.add('active');
            b.setAttribute('aria-pressed', 'true');
            mode = b.dataset.mode;
            try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* ignore */ }
            if (lastLinks.length) renderResults(lastLinks);
        });
    });

    // Restore saved mode
    document.querySelectorAll('.seg-btn[data-mode]').forEach(function (b) {
        if (b.dataset.mode === mode) {
            b.classList.add('active');
            b.setAttribute('aria-pressed', 'true');
        } else {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        }
    });

    $('resetNodesBtn').addEventListener('click', function () {
        reset();
        refreshNodes();
        toast('已恢复默认节点');
    });

    $('speedBtn').addEventListener('click', speedTest);

    $('copyAllBtn').addEventListener('click', function (e) {
        if (!lastLinks.length) {
            toast('暂无结果');
            return;
        }
        const lines = [];
        lastLinks.forEach(function (url) {
            getAll().forEach(function (n) {
                const t = buildAccelUrl(url, n);
                lines.push(mode === 'clone' ? 'git clone ' + t : t);
            });
        });
        copyText(lines.join('\n'), e.currentTarget);
    });

    initUx();
    readUrlParam();
}

document.addEventListener('DOMContentLoaded', init);
