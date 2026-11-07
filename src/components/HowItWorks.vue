<template>
    <!-- v4：从 App.vue 拆出的「使用方式」静态区块。 -->
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
</template>
