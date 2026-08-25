<script setup>
// 单个节点行：名称（点击复制加速主页）、测速徽章、置顶/上下移/删除、拖拽排序。
// 相比旧版：节点名为真 <button>（无障碍修复）；新增 ↑↓ 键盘排序按钮。
import { computed, ref, watch } from 'vue';
import { useNodes } from '../composables/useNodes.js';
import { useSpeedTest } from '../composables/useSpeedTest.js';
import { useToast } from '../composables/useToast.js';
import { copyText } from '../lib/clipboard.js';
import { buildAccelUrl, getNodeId, hostOf } from '../lib/convert.js';

const props = defineProps({
    node: { type: Object, required: true },
    index: { type: Number, required: true },
    listType: { type: String, required: true }, // 'main' | 'pinned'
    dragging: { type: Boolean, default: false }
});

const emit = defineEmits(['drag-start', 'drag-end', 'drop-row']);

const nodesStore = useNodes();
const { results } = useSpeedTest();
const { showToast } = useToast();

function copyWithToast(text, btn) {
    copyText(text, btn).then(function (ok) {
        showToast(ok ? '已复制' : '复制失败，请手动复制');
    });
}

function copyHome(e) {
    copyWithToast(buildAccelUrl('https://github.com', props.node), e.currentTarget);
}

// 测速结果响应式查询；undefined 表示未测速
const result = computed(function () { return results[getNodeId(props.node)]; });

// 结果更新时重放 bump 动画
const justUpdated = ref(false);
watch(function () { const r = result.value; return r ? r.ts : 0; }, function (nv, ov) {
    if (!ov || nv === ov) return;
    justUpdated.value = false;
    requestAnimationFrame(function () { justUpdated.value = true; });
    setTimeout(function () { justUpdated.value = false; }, 400);
});

const badgeClass = computed(function () {
    const r = result.value;
    if (!r) return [];
    return [r.ok ? 's-ok' : 's-bad'];
});
const badgeText = computed(function () {
    const r = result.value;
    if (!r) return '';
    return r.ok ? Math.round(r.ms) + 'ms' : '✕';
});
const badgeTitle = computed(function () {
    const r = result.value;
    if (!r) return '未测速';
    return r.ok ? '可用 · 延迟 ' + Math.round(r.ms) + 'ms' : '不可用 / 超时';
});

const hostLine = computed(function () {
    return hostOf(props.node.prefix) + ' · ' + (props.node.mode === 'replace' ? 'replace' : 'prefix');
});

const isFirst = computed(function () { return props.index === 0; });
const isLast = computed(function () {
    const list = props.listType === 'main' ? nodesStore.main.value : nodesStore.pinned.value;
    return props.index >= list.length - 1;
});

function move(delta) {
    const to = props.index + delta;
    if (props.listType === 'main') nodesStore.reorderMain(props.index, to);
    else nodesStore.reorderPinned(props.index, to);
}

function remove() {
    if (props.listType === 'main') nodesStore.removeMain(props.index);
    else nodesStore.removePinned(props.index);
    showToast('已删除节点');
}

function togglePin() {
    if (props.listType === 'main') nodesStore.pinNode(props.index);
    else nodesStore.unpinNode(props.index);
}
</script>

<template>
    <li class="node-row" :class="{ dragging }" draggable="true" :data-prefix="node.prefix"
        @dragstart="emit('drag-start')" @dragend="emit('drag-end')"
        @dragover.prevent @drop.prevent="emit('drop-row')">
        <div class="n-info">
            <button type="button" class="n-name" :title="'点击复制加速主页：' + node.name"
                    @click="copyHome">{{ node.name }}</button>
            <span class="n-speed" :class="[...badgeClass, { bump: justUpdated }]" :title="badgeTitle">{{ badgeText }}</span>
            <span class="n-host">{{ hostLine }}</span>
        </div>
        <div class="n-actions">
            <button v-if="listType === 'main'" type="button" class="n-mini"
                    :aria-label="'置顶 ' + node.name" title="置顶到结果最前" @click="togglePin">置顶</button>
            <button v-else type="button" class="n-mini n-unpin"
                    :aria-label="'取消置顶 ' + node.name" title="移回普通列表" @click="togglePin">取消置顶</button>
            <button type="button" class="n-mini n-move" :disabled="isFirst"
                    :aria-label="'上移 ' + node.name" title="上移" @click="move(-1)">↑</button>
            <button type="button" class="n-mini n-move" :disabled="isLast"
                    :aria-label="'下移 ' + node.name" title="下移" @click="move(1)">↓</button>
            <button type="button" class="n-mini n-del"
                    :aria-label="'删除 ' + node.name" title="从列表删除" @click="remove">删除</button>
        </div>
    </li>
</template>
