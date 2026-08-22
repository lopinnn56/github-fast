<script setup>
// 应用外壳：导航 / Hero / 各区块静态内容 + 全局效果（入场动画、滚动状态、Toast、返回顶部）。
import { onMounted } from 'vue';
import { useConverter } from './composables/useConverter.js';
import { useToast } from './composables/useToast.js';
import { useScrollFx, initReveal } from './lib/ui-fx.js';
import TerminalDemo from './components/TerminalDemo.vue';
import ConverterPanel from './components/ConverterPanel.vue';
import NodeManager from './components/NodeManager.vue';

const { applyUrlParams } = useConverter();
const { toast } = useToast();
const { scrolled, showBackTop, backToTop, bind } = useScrollFx();

onMounted(function () {
    bind();
    initReveal();
    // 地址栏 ?url= 直达：回填输入并出结果
    applyUrlParams();
});
</script>

<template>
    <div class="bg-blobs" aria-hidden="true"><span></span><span></span><span></span></div>
    <a class="skip-link" href="#main">跳到主要内容</a>

    <nav class="nav" :class="{ scrolled }" aria-label="主导航">
        <div class="nav-inner">
            <a class="nav-logo" href="#top">
                <span class="nav-logo-text">GitHub 加速</span>
            </a>
            <a class="btn btn-primary btn-nav" href="#tool">开始</a>
        </div>
    </nav>

    <header id="top" class="hero">
        <div class="hero-inner">
            <p class="eyebrow">GitHub 加速工具</p>
            <h1>GitHub 加速</h1>
            <p class="hero-sub">将 GitHub 链接转换为加速镜像，解决下载慢、克隆卡、Raw 打不开的问题。<br />纯前端工具，链接仅在本地拼接。</p>
            <div class="hero-cta">
                <a class="btn btn-primary" href="#tool">立即转换</a>
                <a class="btn btn-ghost" href="#how">查看使用说明</a>
            </div>

            <TerminalDemo />
        </div>
    </header>

    <main id="main">
        <section id="how" class="how" aria-labelledby="howTitle">
            <div class="section-head">
                <p class="eyebrow">How it works</p>
                <h2 id="howTitle">三种方式，一条链接</h2>
                <p class="section-desc">把 GitHub 链接粘贴进来，剩下的交给镜像节点。</p>
            </div>
            <div class="feature-grid">
                <article class="feature-card">
                    <h3>链接模式</h3>
                    <p>直接打开 / 下载文件、Release、Archive。转换后地址栏自动带上 <code>?url=...</code>，复制即可分享。</p>
                </article>
                <article class="feature-card">
                    <h3>Clone 命令</h3>
                    <p>将仓库地址包装为镜像，一条 <code>git clone</code> 命令直接跑。适用于 clone 与仓库主页链接。</p>
                </article>
                <article class="feature-card">
                    <h3>批量转换</h3>
                    <p>一次粘贴多行链接，每行一个；结果按链接分组，可逐组复制，Ctrl+Enter 快速转换。</p>
                </article>
            </div>
        </section>

        <section id="tool" class="tool" aria-labelledby="toolTitle">
            <div class="section-head">
                <p class="eyebrow">Start</p>
                <h2 id="toolTitle">开始加速</h2>
                <p class="section-desc">粘贴 GitHub 链接，一键转换为加速镜像。</p>
            </div>

            <div class="tool-panel">
                <ConverterPanel />
            </div>
        </section>

        <section id="nodes" class="nodes" aria-labelledby="nodesTitle">
            <div class="section-head">
                <p class="eyebrow">Nodes</p>
                <h2 id="nodesTitle">加速节点</h2>
                <p class="section-desc">公开社区镜像，点击「测速」可检测节点可用性与延迟，超时 / 不可达节点会标记 ✕，可置顶（进入置顶队列）、拖拽或用 ↑↓ 排序、删除。</p>
            </div>

            <div class="nodes-card">
                <NodeManager />
            </div>
        </section>

        <section id="faq" class="faq" aria-labelledby="faqTitle">
            <div class="section-head">
                <p class="eyebrow">FAQ</p>
                <h2 id="faqTitle">常见问题</h2>
                <p class="section-desc">关于使用方式与原理的快速解答。</p>
            </div>
            <div class="faq-list">
                <details class="faq-item">
                    <summary>链接模式和 Clone 命令有什么区别？</summary>
                    <div class="faq-body">
                        <p><strong>链接模式</strong>：直接打开 / 下载文件、Release、Archive；<strong>Clone 命令</strong>：将仓库地址包装为镜像，用于 <code>git clone</code>。不同类型链接适配不同节点：<code>raw</code> / <code>release</code> / <code>archive</code> 多用<em>前缀拼接</em>，<code>clone</code> / 主页多用<em>替换域名</em>。</p>
                    </div>
                </details>
                <details class="faq-item">
                    <summary>如何批量转换多个链接？</summary>
                    <div class="faq-body">
                        <p>一次粘贴多行链接，每行一个；结果按链接分组，可逐组复制。粘贴含换行的内容会自动切换到多行输入，Ctrl+Enter（Mac 为 Cmd+Enter）快速转换。</p>
                    </div>
                </details>
                <details class="faq-item">
                    <summary>如何把转换结果分享给别人？</summary>
                    <div class="faq-body">
                        <p>转换后地址栏会自动带上 <code>?url=...</code> 参数，直接复制地址栏链接即可分享，对方打开即可看到同样的结果。</p>
                    </div>
                </details>
                <details class="faq-item">
                    <summary>某个节点失效了怎么办？</summary>
                    <div class="faq-body">
                        <p>点击「测速」可检测节点可用性与延迟，超时 / 不可达节点会被标记 ✕；也可以在节点列表中手动删除失效节点，或切换到其它可用节点。节点为公开社区镜像，稳定性随时可能变化，请自行甄别。</p>
                    </div>
                </details>
                <details class="faq-item">
                    <summary>这个工具会代理或缓存我的数据吗？</summary>
                    <div class="faq-body">
                        <p>不会。本工具为纯前端静态站点，不代理、不缓存任何数据，链接仅在本地拼接，地址也不会发送到任何服务器。</p>
                    </div>
                </details>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="footer-grid">
            <div class="footer-brand">
                <p class="footer-logo">GitHub 加速</p>
                <p>将 GitHub 链接转换为加速镜像的纯前端工具。</p>
            </div>
            <div class="footer-col">
                <p class="footer-col-title">工具</p>
                <a href="#how">使用说明</a>
                <a href="#tool">开始使用</a>
                <a href="#nodes">加速节点</a>
                <a href="#faq">常见问题</a>
            </div>
            <div class="footer-col">
                <p class="footer-col-title">资源</p>
                <a href="https://github.com/lopinnn56/github-fast" target="_blank" rel="noopener">开源仓库</a>
                <a href="https://fast.lopinnn.de5.net" target="_blank" rel="noopener">在线演示</a>
                <a href="#nodes">节点测速</a>
            </div>
            <div class="footer-col">
                <p class="footer-col-title">关于</p>
                <a href="#nodes">节点来源说明</a>
                <a href="#faq">免责声明</a>
                <p class="footer-note">由 lopinnn 制作 · AI 生成</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>GitHub 加速工具 by lopinnn · 仅供学习交流 · 请遵守当地法律法规</p>
            <p class="footer-os">★ 本站所有代码均已开源（index.html / src/ 等），可自由查看、学习与二次分发。</p>
        </div>
    </footer>

    <button class="back-top" type="button" :hidden="!showBackTop" aria-label="返回顶部"
            @click="backToTop">↑</button>
    <div class="toast" role="status" aria-live="polite" :hidden="!toast.visible">{{ toast.msg }}</div>
</template>
