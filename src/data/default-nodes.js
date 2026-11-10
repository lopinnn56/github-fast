/**
 * 内置加速节点清单（v4 从 lib/nodes-core.js 外置为纯数据）。
 *
 * 数据来自公益聚合站 github.akams.cn 与 ghproxy 系列，由 lopinnn 汇总整理。
 * 只放数据、不放逻辑：校验 / 去重 / 迁移仍由 lib/nodes-core.js 负责。
 * 顺序即默认展示顺序，请勿随意重排。
 *
 * 2026-11-10 实测清理：对原始 78 个节点做了多轮真实内容探测（代理本仓库
 * package.json / README，只有响应体确实是该文件才算通过），剔除 43 个失效、
 * 停放页、JS 挑战页或返回 4xx/5xx 的节点；复测又剔除 4 个持续 429/502 的节点，
 * 最终保留 31 个可用节点。
 * 站点运行时还会由 lib/node-health.js + useAutoPrune 继续自动剔除失效节点。
 */
export const DEFAULT_NODES = [
    { name: 'ghproxy.net', prefix: 'https://ghproxy.net/', mode: 'prefix' },
    { name: 'gh.dpik.top', prefix: 'https://gh.dpik.top/', mode: 'prefix' },
    { name: 'github.tbap.top', prefix: 'https://github.tbap.top/', mode: 'prefix' },
    { name: 'cdn.gh-proxy.com', prefix: 'https://cdn.gh-proxy.com/', mode: 'prefix' },
    { name: 'ghfile.geekertao.top', prefix: 'https://ghfile.geekertao.top/', mode: 'prefix' },
    { name: 'cdn.akaere.online', prefix: 'https://cdn.akaere.online/', mode: 'prefix' },
    { name: 'gh.acmsz.top', prefix: 'https://gh.acmsz.top/', mode: 'prefix' },
    { name: 'gh-proxy.com', prefix: 'https://gh-proxy.com/', mode: 'prefix' },
    { name: 'git.yylx.win', prefix: 'https://git.yylx.win/', mode: 'prefix' },
    { name: 'ghm.078465.xyz', prefix: 'https://ghm.078465.xyz/', mode: 'prefix' },
    { name: 'ghf.xn--eqrr82bzpe.top', prefix: 'https://ghf.xn--eqrr82bzpe.top/', mode: 'prefix' },
    { name: 'tvv.tw', prefix: 'https://tvv.tw/', mode: 'prefix' },
    { name: 'down.mxw.xx.kg', prefix: 'https://down.mxw.xx.kg/', mode: 'prefix' },
    { name: 'gh.jjj.gv.uy', prefix: 'https://gh.jjj.gv.uy/', mode: 'prefix' },
    { name: 'github.chenc.dev', prefix: 'https://github.chenc.dev/', mode: 'prefix' },
    { name: 'gh.sixyin.com', prefix: 'https://gh.sixyin.com/', mode: 'prefix' },
    { name: 'git.669966.xyz', prefix: 'https://git.669966.xyz/', mode: 'prefix' },
    { name: 'ghfast.top', prefix: 'https://ghfast.top/', mode: 'prefix' },
    { name: 'github.ednovas.xyz', prefix: 'https://github.ednovas.xyz/', mode: 'prefix' },
    { name: 'github.xxlab.tech', prefix: 'https://github.xxlab.tech/', mode: 'prefix' },
    { name: 'ghp.keleyaa.com', prefix: 'https://ghp.keleyaa.com/', mode: 'prefix' },
    { name: 'ghproxy.monkeyray.net', prefix: 'https://ghproxy.monkeyray.net/', mode: 'prefix' },
    { name: 'gh.noki.icu', prefix: 'https://gh.noki.icu/', mode: 'prefix' },
    { name: 'g.blfrp.cn', prefix: 'https://g.blfrp.cn/', mode: 'prefix' },
    { name: 'gg.z321.cc.cd', prefix: 'https://gg.z321.cc.cd/', mode: 'prefix' },
    { name: 'g.z321.cc.cd', prefix: 'https://g.z321.cc.cd/', mode: 'prefix' },
    { name: 'gh.my-website.ccwu.cc', prefix: 'https://gh.my-website.ccwu.cc/', mode: 'prefix' },
    { name: 'gh.07150721.xyz', prefix: 'https://gh.07150721.xyz/', mode: 'prefix' },
    { name: 'xsadwsd.kdns.fr', prefix: 'https://xsadwsd.kdns.fr/', mode: 'prefix' },
    { name: 'ghproxy.felicity.land', prefix: 'https://ghproxy.felicity.land/', mode: 'prefix' },
    { name: 'gh.qfmc0721.cc.cd', prefix: 'https://gh.qfmc0721.cc.cd/', mode: 'prefix' }
];
