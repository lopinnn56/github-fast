<script setup>
// 顶部导航 + Hero（v4：从 App.vue 拆出的静态外壳）。
import TerminalDemo from './TerminalDemo.vue';

defineProps({
    scrolled: { type: Boolean, default: false }
});
</script>

<template>
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
</template>
