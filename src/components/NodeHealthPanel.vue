<script setup>
// 节点健康检查控制条（v4 新功能）：一键检测 + 自动剔除、自动巡检开关、上次检测时间。
import { computed } from 'vue';
import { useNodeHealth } from '../composables/useNodeHealth.js';
import { useAutoPrune } from '../composables/useAutoPrune.js';

const { autoEnabled, setAutoEnabled, lastRunAt } = useNodeHealth();
const { running, lastRemoved, lastSummary, checkAndPrune } = useAutoPrune();

function onToggleAuto(e) {
    setAutoEnabled(e.target.checked);
}

const lastRunText = computed(function () {
    const t = lastRunAt.value;
    if (!t) return '尚未检测';
    const diff = Date.now() - t;
    if (diff < 60 * 1000) return '刚刚检测';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前检测';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前检测';
    return Math.floor(diff / 86400000) + ' 天前检测';
});

// 最近一次检测结论：让用户知道刚刚剔除了哪些节点
const resultText = computed(function () {
    const s = lastSummary.value;
    if (!s) return '';
    const parts = ['健康 ' + s.healthy];
    if (s.unhealthy) parts.push('失效 ' + s.unhealthy);
    if (s.unknown) parts.push('未确定 ' + s.unknown);
    return parts.join(' · ');
});

const removedText = computed(function () {
    if (!lastRemoved.value || !lastRemoved.value.length) return '';
    const names = lastRemoved.value.map(function (n) { return n.name; });
    const head = names.slice(0, 6).join('、');
    return '已剔除：' + head + (names.length > 6 ? ' 等 ' + names.length + ' 个' : '');
});
</script>

<template>
    <div class="health-bar">
        <div class="health-info">
            <span class="health-title">自动检测</span>
            <span class="health-meta">{{ lastRunText }}</span>
            <span v-if="resultText" class="health-meta">· {{ resultText }}</span>
        </div>
        <div class="health-actions">
            <label class="health-switch" title="每 6 小时自动巡检一次，失败节点自动剔除">
                <input type="checkbox" :checked="autoEnabled" @change="onToggleAuto" />
                <span>自动剔除失效节点</span>
            </label>
            <button class="btn btn-ghost btn-sm" type="button" :disabled="running" @click="checkAndPrune()">
                {{ running ? '检测中…' : '立即检测并剔除' }}
            </button>
        </div>
    </div>
    <p v-if="removedText" class="health-removed">{{ removedText }}</p>
</template>
