<script setup>
// 节点管理卡片：置顶队列 + 主列表、测速（并发 + 缓存）、恢复默认。
import { ref, computed } from 'vue';
import { useNodes } from '../composables/useNodes.js';
import { useSpeedTest } from '../composables/useSpeedTest.js';
import { useToast } from '../composables/useToast.js';
import NodeRow from './NodeRow.vue';

const { main, pinned, total, reorderMain, reorderPinned, reset } = useNodes();
const { progress, run } = useSpeedTest();
const { showToast } = useToast();

// 拖拽源跨行传递：drop 发生在目标行上，必须用共享状态记录来源
const dragFrom = ref(null);

function onDragStart(listType, index) {
    dragFrom.value = { index, list: listType };
}

function onDragEnd() {
    dragFrom.value = null;
}

function onDropRow(listType, index) {
    const from = dragFrom.value;
    if (!from || from.index === index || from.list !== listType) return;
    if (listType === 'main') reorderMain(from.index, index);
    else reorderPinned(from.index, index);
    dragFrom.value = null;
}

function isDragging(index, listType) {
    const from = dragFrom.value;
    return !!from && from.index === index && from.list === listType;
}

// progress 为 reactive 对象（非 ref），直接读属性
const testing = computed(function () { return progress.active; });

async function speedTest() {
    if (progress.active) return;
    showToast('正在测速，检测节点可用性…');
    try {
        const summary = await run(main.value.concat(pinned.value));
        if (summary) {
            showToast('测速完成：可用 ' + summary.okCount + ' / ' + summary.total + ' 个，不可用节点已标记 ✕');
        }
    } catch {
        showToast('测速失败，请稍后重试');
    }
}

function onReset() {
    reset();
    showToast('已恢复默认节点');
}

const countLine = computed(function () {
    return '共 ' + total.value + ' 个节点（置顶 ' + pinned.value.length + '）· 点击节点名复制加速主页';
});
</script>

<template>
    <div class="nodes-head">
        <span class="nodes-count">{{ countLine }}</span>
        <div class="nodes-head-actions">
            <button class="btn btn-ghost btn-sm" type="button" :class="{ loading: testing }"
                    :disabled="testing" @click="speedTest">{{ testing ? `测速中… (${progress.done}/${progress.total})` : '测速' }}</button>
            <button class="btn btn-ghost btn-sm" type="button" @click="onReset">恢复默认</button>
        </div>
    </div>

    <div class="pinned-head" :hidden="!pinned.length">
        <span class="pinned-title">置顶队列</span>
        <span class="pinned-count">{{ pinned.length }} 个</span>
    </div>
    <ul class="node-list pinned-list">
        <NodeRow v-for="(n, i) in pinned" :key="n.prefix" :node="n" :index="i"
                 list-type="pinned" :dragging="isDragging(i, 'pinned')"
                 @drag-start="onDragStart('pinned', i)" @drag-end="onDragEnd" @drop-row="onDropRow('pinned', i)" />
    </ul>
    <ul class="node-list">
        <NodeRow v-for="(n, i) in main" :key="n.prefix" :node="n" :index="i"
                 list-type="main" :dragging="isDragging(i, 'main')"
                 @drag-start="onDragStart('main', i)" @drag-end="onDragEnd" @drop-row="onDropRow('main', i)" />
    </ul>

    <details class="src-details">
        <summary>加速节点来源说明</summary>
        <div class="src-body">
            <p>本网站内置的加速节点主要来自以下公益来源：</p>
            <ul>
                <li><strong>GitHub Proxy 聚合站</strong>：<a href="https://github.akams.cn/" target="_blank" rel="noopener">github.akams.cn</a>（提供实时测速的公益节点，支持 API / Clone / Releases / Archive / Gist / Raw 加速）。</li>
                <li><strong>ghproxy 系列</strong>：如 ghproxy.net 等长期存在的开源公益 GitHub 代理。</li>
            </ul>
            <p>所有节点均由<strong>热心网友公益贡献</strong>（聚合站中标注为「贡献 / 测绘」），非本网站提供，其可用性与合规性由对应提供者负责，请合理使用、勿滥用。</p>
            <p class="src-maker">本网站由 <strong>lopinnn</strong> 制作，<strong>全由 AI 生成</strong>；节点由 lopinnn 汇总整理并基于测速筛选。</p>
        </div>
    </details>
</template>
