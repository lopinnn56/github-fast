<template>
    <!-- v4：从 App.vue 拆出的 FAQ 静态区块，5 个 details 内容原样保留。 -->
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
</template>
