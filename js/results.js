import { getPinned, getMain, getAll } from './nodes.js';
import { detectType, TYPE_LABEL, buildAccelUrl } from './convert.js';
import { copyText } from './ui.js';
import { isClone } from './mode.js';
import { syncUrlParam } from './url-state.js';

let lastLinks = [];
let animCounter = 0;

const $ = function (id) { return document.getElementById(id); };

export function getLastLinks() {
    return lastLinks;
}

export function clearResults() {
    lastLinks = [];
    const wrap = $('results');
    if (wrap) wrap.hidden = true;
    // 顺带释放旧结果的 DOM
    const listEl = $('resultList');
    if (listEl) listEl.replaceChildren();
}

function nextDelay() {
    animCounter++;
    // 逐项入场动画只对前几项生效，批量大量结果时避免数百个 animationDelay 排队
    return Math.min(animCounter, 24) * 30 + 'ms';
}

function mkBtn(text, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-btn';
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
}

// 把若干链接 × 全部节点拼装成待复制的行（链接模式输出 URL，Clone 模式输出命令）。
// 「复制本组」「复制全部」共用此逻辑。
export function buildAllLines(links) {
    const lines = [];
    links.forEach(function (url) {
        getAll().forEach(function (n) {
            const t = buildAccelUrl(url, n);
            lines.push(isClone() ? 'git clone ' + t : t);
        });
    });
    return lines;
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

    if (isClone()) {
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

function buildGroupHead(url, typeTag) {
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
        copyText(buildAllLines([url]).join('\n'), e.currentTarget);
    }));
    actions.appendChild(mkBtn('删除本组', function () {
        const next = lastLinks.filter(function (l) { return l !== url; });
        renderResults(next);
        syncUrlParam(next);
    }));
    head.appendChild(link);
    head.appendChild(tag);
    head.appendChild(actions);
    return head;
}

export function renderResults(links) {
    lastLinks = links;
    const wrap = $('results');
    const listEl = $('resultList');
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
            group.appendChild(buildGroupHead(url, typeTag));
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
