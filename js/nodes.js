const DEFAULT_NODES = [
    { name: 'ghproxy.net', prefix: 'https://ghproxy.net/', mode: 'prefix' },
    { name: 'gh.dpik.top', prefix: 'https://gh.dpik.top/', mode: 'prefix' },
    { name: 'github.tbap.top', prefix: 'https://github.tbap.top/', mode: 'prefix' },
    { name: 'cdn.gh-proxy.com', prefix: 'https://cdn.gh-proxy.com/', mode: 'prefix' },
    { name: 'ghfile.geekertao.top', prefix: 'https://ghfile.geekertao.top/', mode: 'prefix' },
    { name: 'github.dpik.top', prefix: 'https://github.dpik.top/', mode: 'prefix' },
    { name: 'github-proxy.memory-echoes.cn', prefix: 'https://github-proxy.memory-echoes.cn/', mode: 'prefix' },
    { name: 'gh.bugdey.us.kg', prefix: 'https://gh.bugdey.us.kg/', mode: 'prefix' },
    { name: 'jiashu.1win.eu.org', prefix: 'https://jiashu.1win.eu.org/', mode: 'prefix' },
    { name: 'gh.927223.xyz', prefix: 'https://gh.927223.xyz/', mode: 'prefix' },
    { name: 'cdn.akaere.online', prefix: 'https://cdn.akaere.online/', mode: 'prefix' },
    { name: 'gh.felicity.ac.cn', prefix: 'https://gh.felicity.ac.cn/', mode: 'prefix' },
    { name: 'down.mxw.qzz.io', prefix: 'https://down.mxw.qzz.io/', mode: 'prefix' },
    { name: 'github.mxw.qzz.io', prefix: 'https://github.mxw.qzz.io/', mode: 'prefix' },
    { name: 'gh.inkchills.cn', prefix: 'https://gh.inkchills.cn/', mode: 'prefix' },
    { name: 'gh.acmsz.top', prefix: 'https://gh.acmsz.top/', mode: 'prefix' },
    { name: 'gitproxy.mrhjx.cn', prefix: 'https://gitproxy.mrhjx.cn/', mode: 'prefix' },
    { name: 'gh.ddlc.top', prefix: 'https://gh.ddlc.top/', mode: 'prefix' },
    { name: 'gh-proxy.com', prefix: 'https://gh-proxy.com/', mode: 'prefix' },
    { name: 'gh-proxy.net', prefix: 'https://gh-proxy.net/', mode: 'prefix' },
    { name: 'j.1lin.dpdns.org', prefix: 'https://j.1lin.dpdns.org/', mode: 'prefix' },
    { name: 'github.starrlzy.cn', prefix: 'https://github.starrlzy.cn/', mode: 'prefix' },
    { name: 'git.yylx.win', prefix: 'https://git.yylx.win/', mode: 'prefix' },
    { name: 'ghm.078465.xyz', prefix: 'https://ghm.078465.xyz/', mode: 'prefix' },
    { name: 'ghf.xn--eqrr82bzpe.top', prefix: 'https://ghf.xn--eqrr82bzpe.top/', mode: 'prefix' },
    { name: 'tvv.tw', prefix: 'https://tvv.tw/', mode: 'prefix' },
    { name: 'j.1win.ggff.net', prefix: 'https://j.1win.ggff.net/', mode: 'prefix' },
    { name: 'gitproxy.127731.xyz', prefix: 'https://gitproxy.127731.xyz/', mode: 'prefix' },
    { name: 'gh.catmak.name', prefix: 'https://gh.catmak.name/', mode: 'prefix' },
    { name: 'gh.b52m.cn', prefix: 'https://gh.b52m.cn/', mode: 'prefix' },
    { name: 'down.mxw.xx.kg', prefix: 'https://down.mxw.xx.kg/', mode: 'prefix' },
    { name: 'gh.jjj.gv.uy', prefix: 'https://gh.jjj.gv.uy/', mode: 'prefix' },
    { name: 'slink.ltd', prefix: 'https://slink.ltd/', mode: 'prefix' },
    { name: 'github.tmby.shop', prefix: 'https://github.tmby.shop/', mode: 'prefix' },
    { name: 'ghpr.cc', prefix: 'https://ghpr.cc/', mode: 'prefix' },
    { name: 'gh.tryxd.cn', prefix: 'https://gh.tryxd.cn/', mode: 'prefix' },
    { name: 'gitproxy.click', prefix: 'https://gitproxy.click/', mode: 'prefix' },
    { name: 'github.chenc.dev', prefix: 'https://github.chenc.dev/', mode: 'prefix' },
    { name: 'gh.sixyin.com', prefix: 'https://gh.sixyin.com/', mode: 'prefix' },
    { name: 'gh.monlor.com', prefix: 'https://gh.monlor.com/', mode: 'prefix' },
    { name: 'ghpxy.hwinzniej.top', prefix: 'https://ghpxy.hwinzniej.top/', mode: 'prefix' },
    { name: 'git.669966.xyz', prefix: 'https://git.669966.xyz/', mode: 'prefix' },
    { name: 'ghfast.top', prefix: 'https://ghfast.top/', mode: 'prefix' },
    { name: 'gh.jasonzeng.dev', prefix: 'https://gh.jasonzeng.dev/', mode: 'prefix' },
    { name: 'github.geekery.cn', prefix: 'https://github.geekery.cn/', mode: 'prefix' },
    { name: 'gp.zkitefly.eu.org', prefix: 'https://gp.zkitefly.eu.org/', mode: 'prefix' },
    { name: 'fastgit.cc', prefix: 'https://fastgit.cc/', mode: 'prefix' },
    { name: 'ghproxy.1888866.xyz', prefix: 'https://ghproxy.1888866.xyz/', mode: 'prefix' },
    { name: 'ghp.arslantu.xyz', prefix: 'https://ghp.arslantu.xyz/', mode: 'prefix' },
    { name: 'github.ednovas.xyz', prefix: 'https://github.ednovas.xyz/', mode: 'prefix' },
    { name: 'ghproxy.imciel.com', prefix: 'https://ghproxy.imciel.com/', mode: 'prefix' },
    { name: 'ghproxy.cxkpro.top', prefix: 'https://ghproxy.cxkpro.top/', mode: 'prefix' },
    { name: 'github.xxlab.tech', prefix: 'https://github.xxlab.tech/', mode: 'prefix' },
    { name: 'gh.idayer.com', prefix: 'https://gh.idayer.com/', mode: 'prefix' },
    { name: 'free.cn.eu.org', prefix: 'https://free.cn.eu.org/', mode: 'prefix' },
    { name: 'gh.chjina.com', prefix: 'https://gh.chjina.com/', mode: 'prefix' },
    { name: 'ghp.keleyaa.com', prefix: 'https://ghp.keleyaa.com/', mode: 'prefix' },
    { name: 'proxy.yaoyaoling.net', prefix: 'https://proxy.yaoyaoling.net/', mode: 'prefix' },
    { name: 'ghproxy.monkeyray.net', prefix: 'https://ghproxy.monkeyray.net/', mode: 'prefix' },
    { name: 'gh.noki.icu', prefix: 'https://gh.noki.icu/', mode: 'prefix' },
    { name: 'g.blfrp.cn', prefix: 'https://g.blfrp.cn/', mode: 'prefix' },
    { name: 'githubdog.com', prefix: 'https://githubdog.com/', mode: 'prefix' },
    { name: 'gh.meali.top', prefix: 'https://gh.meali.top/', mode: 'prefix' },
    { name: '777.z321.cc.cd', prefix: 'https://777.z321.cc.cd/', mode: 'prefix' },
    { name: 'gg.z321.cc.cd', prefix: 'https://gg.z321.cc.cd/', mode: 'prefix' },
    { name: 'g.z321.cc.cd', prefix: 'https://g.z321.cc.cd/', mode: 'prefix' },
    { name: 'js.jiangss.shop', prefix: 'https://js.jiangss.shop/', mode: 'prefix' },
    { name: 'gap.andyjin.website', prefix: 'https://gap.andyjin.website/', mode: 'prefix' },
    { name: 'gh.my-website.ccwu.cc', prefix: 'https://gh.my-website.ccwu.cc/', mode: 'prefix' },
    { name: 'github.ikgy.top', prefix: 'https://github.ikgy.top/', mode: 'prefix' },
    { name: 'gh.07150721.xyz', prefix: 'https://gh.07150721.xyz/', mode: 'prefix' },
    { name: 'cfgh.ikgy.top', prefix: 'https://cfgh.ikgy.top/', mode: 'prefix' },
    { name: 'xsadwsd.kdns.fr', prefix: 'https://xsadwsd.kdns.fr/', mode: 'prefix' },
    { name: 'gh.ruan.dpdns.org', prefix: 'https://gh.ruan.dpdns.org/', mode: 'prefix' },
    { name: 'ghproxy.felicity.land', prefix: 'https://ghproxy.felicity.land/', mode: 'prefix' },
    { name: 'github.nswrz.cn', prefix: 'https://github.nswrz.cn/', mode: 'prefix' },
    { name: 'gh.zhai.edu.pl', prefix: 'https://gh.zhai.edu.pl/', mode: 'prefix' },
    { name: 'gh.qfmc0721.cc.cd', prefix: 'https://gh.qfmc0721.cc.cd/', mode: 'prefix' }
];

const STORAGE_KEY = 'gh_accel_nodes_v3';

let mainNodes = [];
let pinnedNodes = [];

loadNodes();

// 校验节点结构，过滤掉损坏的 localStorage 数据（避免 undefined prefix 产生坏链接）
function validNode(n) {
    return !!n && typeof n === 'object' && typeof n.prefix === 'string' && /^https?:\/\//i.test(n.prefix) && typeof n.name === 'string';
}

function loadNodes() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            if (p && Array.isArray(p.main)) {
                mainNodes = p.main.filter(validNode);
                pinnedNodes = Array.isArray(p.pinned) ? p.pinned.filter(validNode) : [];
                purgeLegacyKeys();
                return;
            }
        }
    } catch (e) {
        // ignore
    }
    try {
        const raw2 = localStorage.getItem('gh_accel_nodes_v2');
        if (raw2) {
            const p = JSON.parse(raw2);
            if (Array.isArray(p) && p.length) {
                mainNodes = p.filter(validNode);
                pinnedNodes = [];
                // 迁移到 v3 后立即落盘并清理旧 key
                saveNodes();
                purgeLegacyKeys();
                return;
            }
        }
    } catch (e) {
        // ignore
    }
    mainNodes = clone(DEFAULT_NODES);
    pinnedNodes = [];
    purgeLegacyKeys();
}

function purgeLegacyKeys() {
    try { localStorage.removeItem('gh_accel_nodes_v2'); } catch (e) { /* ignore */ }
}

function saveNodes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ main: mainNodes, pinned: pinnedNodes }));
    } catch (e) {
        // ignore
    }
}

function clone(list) {
    return JSON.parse(JSON.stringify(list));
}

export function getMain() {
    return mainNodes;
}

export function getPinned() {
    return pinnedNodes;
}

export function getAll() {
    return pinnedNodes.concat(mainNodes);
}

export function pinNode(i) {
    if (i < 0 || i >= mainNodes.length) return;
    const node = mainNodes.splice(i, 1)[0];
    pinnedNodes.unshift(node);
    saveNodes();
}

export function unpinNode(i) {
    if (i < 0 || i >= pinnedNodes.length) return;
    const node = pinnedNodes.splice(i, 1)[0];
    mainNodes.push(node);
    saveNodes();
}

export function removeMain(i) {
    if (i < 0 || i >= mainNodes.length) return;
    mainNodes.splice(i, 1);
    saveNodes();
}

export function removePinned(i) {
    if (i < 0 || i >= pinnedNodes.length) return;
    pinnedNodes.splice(i, 1);
    saveNodes();
}

export function reorderMain(from, to) {
    if (from === to) return;
    // 越界保护：splice 越界会把 undefined 插入数组
    if (from < 0 || from >= mainNodes.length) return;
    if (to < 0 || to >= mainNodes.length) return;
    const item = mainNodes.splice(from, 1)[0];
    mainNodes.splice(to, 0, item);
    saveNodes();
}

export function reorderPinned(from, to) {
    if (from === to) return;
    if (from < 0 || from >= pinnedNodes.length) return;
    if (to < 0 || to >= pinnedNodes.length) return;
    const item = pinnedNodes.splice(from, 1)[0];
    pinnedNodes.splice(to, 0, item);
    saveNodes();
}

export function reset() {
    mainNodes = clone(DEFAULT_NODES);
    pinnedNodes = [];
    saveNodes();
    return getAll();
}
