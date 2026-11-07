<script setup>
// 一键加速后的行内下载提示（v4：ReleaseResolver.vue 里原本重复两次的 .rb-accel 块抽成组件）。
// 原链 + 前 N 条加速链 + “查看全部”滚动定位，不自动触发下载。
import { useCopy } from '../composables/useCopy.js';

defineProps({
    url: { type: String, required: true },
    links: { type: Array, default: () => [] },
    total: { type: Number, default: 0 }
});
defineEmits(['view-all']);

const { copyWithToast } = useCopy();
</script>

<template>
    <div class="rb-accel">
        <div class="rb-accel-row rb-accel-orig">
            <span class="rb-accel-label">原链</span>
            <span class="rb-accel-url" :title="url">{{ url }}</span>
            <span class="rb-actions">
                <button class="mini-btn" type="button" @click="copyWithToast(url, $event.currentTarget)">复制</button>
                <a class="mini-btn" :href="url" target="_blank" rel="noopener">打开</a>
            </span>
        </div>
        <div v-for="t in links" :key="t.target" class="rb-accel-row">
            <span class="rb-accel-label" :title="t.name">{{ t.name }}</span>
            <span class="rb-accel-url" :title="t.target">{{ t.target }}</span>
            <span class="rb-actions">
                <button class="mini-btn" type="button" @click="copyWithToast(t.target, $event.currentTarget)">复制</button>
                <a class="mini-btn rb-dl" :href="t.target" target="_blank" rel="noopener">下载</a>
            </span>
        </div>
        <button class="mini-btn rb-more" type="button" @click="$emit('view-all', url)">在下方查看全部 {{ total }} 个节点 →</button>
    </div>
</template>
