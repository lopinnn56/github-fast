<script setup>
// 应用外壳（v4）：只负责编排区块与全局效果；静态内容拆到各 Site* / Section 组件。
// 所有 store 经 installAppContext() 注入，useXxx() 只是取容器实例的薄封装。
import { onBeforeUnmount, onMounted } from 'vue';
import { useConverter } from './composables/useConverter.js';
import { useToast } from './composables/useToast.js';
import { useScrollFx, initReveal } from './lib/ui-fx.js';
import SiteHeader from './components/SiteHeader.vue';
import HowItWorks from './components/HowItWorks.vue';
import FaqSection from './components/FaqSection.vue';
import SiteFooter from './components/SiteFooter.vue';
import ToastHost from './components/ToastHost.vue';
import BackToTop from './components/BackToTop.vue';
import ConverterPanel from './components/ConverterPanel.vue';
import NodeManager from './components/NodeManager.vue';

const { applyUrlParams } = useConverter();
const { toast } = useToast();
const { scrolled, showBackTop, backToTop, bind, unbind } = useScrollFx();

let revealCleanup = null;

onMounted(function () {
    bind();
    revealCleanup = initReveal() || null;
    // 地址栏 ?url= 直达：回填输入并出结果
    applyUrlParams();
});

onBeforeUnmount(function () {
    unbind();
    if (revealCleanup) revealCleanup();
});
</script>

<template>
    <div class="bg-blobs" aria-hidden="true"><span></span><span></span><span></span></div>
    <a class="skip-link" href="#main">跳到主要内容</a>

    <SiteHeader :scrolled="scrolled" />

    <main id="main">
        <HowItWorks />

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

        <FaqSection />
    </main>

    <SiteFooter />

    <BackToTop :visible="showBackTop" @go="backToTop" />
    <ToastHost :toast="toast" />
</template>
