/**
 * 已从官方清单退役的节点（v4.1 新增）。
 *
 * 2026-11-10 对全部 78 个原始节点做了多轮真实内容探测（代理本仓库 package.json /
 * README，只有响应体确实是该文件才算通过），确认 47 个节点已失效、变成域名停放广告页、
 * 返回 4xx/5xx 或持续限流，本文件记录它们以便从旧版浏览器缓存中清理。
 *
 * 为什么需要它：节点列表持久化在 localStorage（gh_accel_nodes_v3），
 * 只更新前端代码不会覆盖老用户已保存的列表。加载时按本表过滤，
 * 老用户下次打开就会自动拿到精简后的节点，无需手动清缓存。
 *
 * 判定依据与复测脚本见 src/lib/node-health.js（同一套「内容铁证」规则）。
 */
export const RETIRED_NODES = [
    { name: 'github.dpik.top', prefix: 'https://github.dpik.top/', mode: 'prefix' },
    { name: 'github-proxy.memory-echoes.cn', prefix: 'https://github-proxy.memory-echoes.cn/', mode: 'prefix' },
    { name: 'gh.bugdey.us.kg', prefix: 'https://gh.bugdey.us.kg/', mode: 'prefix' },
    { name: 'jiashu.1win.eu.org', prefix: 'https://jiashu.1win.eu.org/', mode: 'prefix' },
    { name: 'gh.927223.xyz', prefix: 'https://gh.927223.xyz/', mode: 'prefix' },
    { name: 'gh.felicity.ac.cn', prefix: 'https://gh.felicity.ac.cn/', mode: 'prefix' },
    { name: 'down.mxw.qzz.io', prefix: 'https://down.mxw.qzz.io/', mode: 'prefix' },
    { name: 'github.mxw.qzz.io', prefix: 'https://github.mxw.qzz.io/', mode: 'prefix' },
    { name: 'gh.inkchills.cn', prefix: 'https://gh.inkchills.cn/', mode: 'prefix' },
    { name: 'gh-proxy.net', prefix: 'https://gh-proxy.net/', mode: 'prefix' },
    { name: 'j.1lin.dpdns.org', prefix: 'https://j.1lin.dpdns.org/', mode: 'prefix' },
    { name: 'github.starrlzy.cn', prefix: 'https://github.starrlzy.cn/', mode: 'prefix' },
    { name: 'j.1win.ggff.net', prefix: 'https://j.1win.ggff.net/', mode: 'prefix' },
    { name: 'gitproxy.127731.xyz', prefix: 'https://gitproxy.127731.xyz/', mode: 'prefix' },
    { name: 'gh.catmak.name', prefix: 'https://gh.catmak.name/', mode: 'prefix' },
    { name: 'gh.b52m.cn', prefix: 'https://gh.b52m.cn/', mode: 'prefix' },
    { name: 'slink.ltd', prefix: 'https://slink.ltd/', mode: 'prefix' },
    { name: 'github.tmby.shop', prefix: 'https://github.tmby.shop/', mode: 'prefix' },
    { name: 'ghpr.cc', prefix: 'https://ghpr.cc/', mode: 'prefix' },
    { name: 'gh.tryxd.cn', prefix: 'https://gh.tryxd.cn/', mode: 'prefix' },
    { name: 'gitproxy.click', prefix: 'https://gitproxy.click/', mode: 'prefix' },
    { name: 'gh.monlor.com', prefix: 'https://gh.monlor.com/', mode: 'prefix' },
    { name: 'ghpxy.hwinzniej.top', prefix: 'https://ghpxy.hwinzniej.top/', mode: 'prefix' },
    { name: 'gh.jasonzeng.dev', prefix: 'https://gh.jasonzeng.dev/', mode: 'prefix' },
    { name: 'github.geekery.cn', prefix: 'https://github.geekery.cn/', mode: 'prefix' },
    { name: 'gp.zkitefly.eu.org', prefix: 'https://gp.zkitefly.eu.org/', mode: 'prefix' },
    { name: 'fastgit.cc', prefix: 'https://fastgit.cc/', mode: 'prefix' },
    { name: 'ghproxy.1888866.xyz', prefix: 'https://ghproxy.1888866.xyz/', mode: 'prefix' },
    { name: 'ghp.arslantu.xyz', prefix: 'https://ghp.arslantu.xyz/', mode: 'prefix' },
    { name: 'ghproxy.imciel.com', prefix: 'https://ghproxy.imciel.com/', mode: 'prefix' },
    { name: 'ghproxy.cxkpro.top', prefix: 'https://ghproxy.cxkpro.top/', mode: 'prefix' },
    { name: 'free.cn.eu.org', prefix: 'https://free.cn.eu.org/', mode: 'prefix' },
    { name: 'proxy.yaoyaoling.net', prefix: 'https://proxy.yaoyaoling.net/', mode: 'prefix' },
    { name: 'githubdog.com', prefix: 'https://githubdog.com/', mode: 'prefix' },
    { name: 'gh.meali.top', prefix: 'https://gh.meali.top/', mode: 'prefix' },
    { name: '777.z321.cc.cd', prefix: 'https://777.z321.cc.cd/', mode: 'prefix' },
    { name: 'js.jiangss.shop', prefix: 'https://js.jiangss.shop/', mode: 'prefix' },
    { name: 'gap.andyjin.website', prefix: 'https://gap.andyjin.website/', mode: 'prefix' },
    { name: 'github.ikgy.top', prefix: 'https://github.ikgy.top/', mode: 'prefix' },
    { name: 'cfgh.ikgy.top', prefix: 'https://cfgh.ikgy.top/', mode: 'prefix' },
    { name: 'gh.ruan.dpdns.org', prefix: 'https://gh.ruan.dpdns.org/', mode: 'prefix' },
    { name: 'github.nswrz.cn', prefix: 'https://github.nswrz.cn/', mode: 'prefix' },
    { name: 'gh.zhai.edu.pl', prefix: 'https://gh.zhai.edu.pl/', mode: 'prefix' },
    { name: 'gitproxy.mrhjx.cn', prefix: 'https://gitproxy.mrhjx.cn/', mode: 'prefix' },
    { name: 'gh.ddlc.top', prefix: 'https://gh.ddlc.top/', mode: 'prefix' },
    { name: 'gh.idayer.com', prefix: 'https://gh.idayer.com/', mode: 'prefix' },
    { name: 'gh.chjina.com', prefix: 'https://gh.chjina.com/', mode: 'prefix' }
];
