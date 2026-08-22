import { getMain, getPinned, getAll, reset, pinNode, unpinNode, removeMain, removePinned, reorderMain, reorderPinned } from './nodes.js';
import { isGitHubUrl, parseBatch, MAX_BATCH, buildAccelUrl, hostOf } from './convert.js';
import { speedMap, runSpeedTest } from './speed.js';
import { toast, copyText, debounce, initUx } from './ui.js';
import { initModeControls } from './mode.js';
import { renderResults, getLastLinks, clearResults, buildAllLines } from './results.js';
import { syncUrlParam, readUrlParams } from './url-state.js';
import { initTerminal } from './terminal.js';

let testing = false;
// 拖拽源（跨行传递：drop 发生在目标行上，必须用共享状态记录来源）
let dragFrom = null;

const $ = function (id) { return document.getElementById(id); };

function rowBtn(text, cls, label, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'n-mini' + (cls ? ' ' + cls : '');
    b.textContent = text;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
}

function speedBadge(sp) {
    const el = document.createElement('span');
    el.className = 'n-speed' + (sp ? (sp.ok ? ' s-ok' : ' s-bad') : '');
    el.textContent = sp ? (sp.ok ? Math.round(sp.ms) + 'ms' : '✕') : '';
    el.title = sp ? (sp.ok ? '可用 · 延迟 ' + Math.round(sp.ms) + 'ms' : '不可用 / 超时') : '未测速';
    return el;
}

function hostLabel(n) {
    const h = document.createElement('span');
    h.className = 'n-host';
    h.textContent = hostOf(n.prefix) + ' · ' + (n.mode === 'prefix' ? 'prefix' : 'replace');
    return h;
}

function buildRow(n, localIndex, listType) {
    const li = document.createElement('li');
    li.className = 'node-row';
    li.draggable = true;
    // 用 prefix（稳定标识）而非索引定位行：测速进行中拖拽/删除节点不会错位
    li.dataset.prefix = n.prefix;

    const info = document.createElement('div');
    info.className = 'n-info';
    const name = document.createElement('span');
    name.className = 'n-name';
    name.textContent = n.name;
    name.title = n.name;
    name.tabIndex = 0;

    const copyHome = function () { copyText(buildAccelUrl('https://github.com', n)); };
    name.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            copyHome();
        }
    });
    name.addEventListener('click', copyHome);

    info.appendChild(name);
    info.appendChild(speedBadge(speedMap[n.prefix]));
    info.appendChild(hostLabel(n));

    const actions = document.createElement('div');
    actions.className = 'n-actions';
    if (listType === 'main') {
        actions.appendChild(rowBtn('置顶', '', '置顶 ' + n.name, function () {
            pinNode(localIndex);
            refreshNodes();
            toast('已置顶 ' + n.name);
        }));
    } else {
        actions.appendChild(rowBtn('取消置顶', 'n-unpin', '取消置顶 ' + n.name, function () {
            unpinNode(localIndex);
            refreshNodes();
            toast('已取消置顶 ' + n.name);
        }));
    }
    actions.appendChild(rowBtn('删除', 'n-del', '删除 ' + n.name, function () {
        if (listType === 'main') removeMain(localIndex);
        else removePinned(localIndex);
        refreshNodes();
        toast('已删除节点');
    }));

    li.appendChild(info);
    li.appendChild(actions);

    li.addEventListener('dragstart', function () {
        dragFrom = { index: localIndex, list: listType };
        li.classList.add('dragging');
    });
    li.addEventListener('dragend', function () {
        li.classList.remove('dragging');
        dragFrom = null;
    });
    li.addEventListener('dragover', function (e) { e.preventDefault(); });
    li.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!dragFrom || dragFrom.index === localIndex || dragFrom.list !== listType) return;
        if (listType === 'main') reorderMain(dragFrom.index, localIndex);
        else reorderPinned(dragFrom.index, localIndex);
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
            pFrag.appendChild(buildRow(n, i, 'pinned'));
        });
        pinnedList.replaceChildren(pFrag);
    } else {
        pinnedHead.hidden = true;
        pinnedList.replaceChildren();
    }

    const list = $('nodeList');
    const fragment = document.createDocumentFragment();
    main.forEach(function (n, i) {
        fragment.appendChild(buildRow(n, i, 'main'));
    });
    list.replaceChildren(fragment);
}

function refreshNodes() {
    renderNodes();
    if (getLastLinks().length) renderResults(getLastLinks());
}

// 按 prefix 匹配两个列表中的所有同名节点行，测速期间增删/排序也不会更新错行
function updateNodeSpeed(prefix, r) {
    ['pinnedList', 'nodeList'].forEach(function (id) {
        $(id).querySelectorAll('.node-row').forEach(function (row) {
            if (row.dataset.prefix !== prefix) return;
            const sp = row.querySelector('.n-speed');
            if (!sp) return;
            sp.className = 'n-speed' + (r.ok ? ' s-ok' : ' s-bad');
            sp.textContent = r.ok ? Math.round(r.ms) + 'ms' : '✕';
            sp.title = r.ok ? '可用 · 延迟 ' + Math.round(r.ms) + 'ms' : '不可用 / 超时';
            sp.classList.remove('bump');
            void sp.offsetWidth;
            sp.classList.add('bump');
        });
    });
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
    const result = await runSpeedTest(nodes, function (node, r, done, total) {
        btn.textContent = '测速中… (' + done + '/' + total + ')';
        updateNodeSpeed(node.prefix, r);
    });

    renderNodes();

    testing = false;
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = '测速';
    toast('测速完成：可用 ' + result.okCount + ' / ' + result.total + ' 个，不可用节点已标记 ✕');
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
    let links = all.filter(isGitHubUrl);
    if (!links.length) {
        toast('请输入有效的 GitHub 链接');
        // 清掉旧结果与地址栏参数，避免无效输入后仍残留上次的结果
        clearResults();
        syncUrlParam([]);
        return;
    }
    if (links.length > MAX_BATCH) {
        const skipped = links.length - MAX_BATCH;
        links = links.slice(0, MAX_BATCH);
        toast('一次最多转换 ' + MAX_BATCH + ' 个链接，已忽略后 ' + skipped + ' 个');
    } else if (links.length < all.length) {
        toast('已跳过 ' + (all.length - links.length) + ' 个无效链接');
    }
    renderResults(links);
    syncUrlParam(links);
}

function initInput(input, textarea, liveChk) {
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
        const text = e.clipboardData.getData('text');
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
        clearResults();
        syncUrlParam([]);
        input.focus();
    });
}

function applyUrlParams() {
    const urls = readUrlParams();
    if (!urls.length) return;
    setInputText(urls.join('\n'));
    let links = urls.filter(isGitHubUrl);
    if (links.length > MAX_BATCH) links = links.slice(0, MAX_BATCH);
    if (links.length) renderResults(links);
}

function init() {
    renderNodes();
    initTerminal();

    const input = $('inputUrl');
    const textarea = $('inputUrls');
    const liveChk = $('liveChk');

    initInput(input, textarea, liveChk);

    initModeControls(function () {
        // 切换模式后按新格式重绘已有结果
        if (getLastLinks().length) renderResults(getLastLinks());
    });

    $('resetNodesBtn').addEventListener('click', function () {
        reset();
        refreshNodes();
        toast('已恢复默认节点');
    });

    $('speedBtn').addEventListener('click', speedTest);

    $('copyAllBtn').addEventListener('click', function (e) {
        const links = getLastLinks();
        if (!links.length) {
            toast('暂无结果');
            return;
        }
        copyText(buildAllLines(links).join('\n'), e.currentTarget);
    });

    initUx();
    applyUrlParams();
}

document.addEventListener('DOMContentLoaded', init);
