<script setup>
// Release 附件列表（v4：从 ReleaseResolver.vue 拆出的展示组件；无 store 依赖，纯 props/emit）。
import { formatSize } from '../lib/releases.js';
import { useCopy } from '../composables/useCopy.js';
import AccelLinks from './AccelLinks.vue';

defineProps({
    release: { type: Object, required: true },
    archiveFallback: { type: String, default: '' },
    expanded: { type: Object, required: true },
    topLinks: { type: Function, required: true },
    total: { type: Number, default: 0 }
});
const emit = defineEmits(['accelerate', 'view-all']);
const { copyWithToast } = useCopy();
</script>

<template>
    <div>
        <p class="rb-meta">
            {{ release.name }} · {{ release.assets.length }} 个文件
            <a v-if="release.htmlUrl" class="rb-link" :href="release.htmlUrl" target="_blank" rel="noopener">查看 Release 页</a>
        </p>
        <ul v-if="release.assets.length" class="rb-list">
            <li v-for="a in release.assets" :key="a.downloadUrl" class="rb-item">
                <span class="rb-name" :title="a.downloadUrl">{{ a.name }}</span>
                <span class="rb-size">{{ formatSize(a.size) }}{{ a.downloadCount ? ' · ' + a.downloadCount + ' 次下载' : '' }}</span>
                <span class="rb-actions">
                    <button class="mini-btn rb-go" type="button" @click="emit('accelerate', a.downloadUrl)">{{ expanded[a.downloadUrl] ? '已加入 ✓' : '一键加速' }}</button>
                    <button class="mini-btn" type="button" @click="copyWithToast(a.downloadUrl, $event.currentTarget)">复制原链</button>
                    <a class="mini-btn" :href="a.downloadUrl" target="_blank" rel="noopener">打开</a>
                </span>
                <AccelLinks v-if="expanded[a.downloadUrl]" :url="a.downloadUrl"
                            :links="topLinks(a.downloadUrl)" :total="total"
                            @view-all="emit('view-all', $event)" />
            </li>
        </ul>
        <div v-else class="rb-row">
            <span class="rb-muted">该版本无附件，可直接加速源码包。</span>
            <span class="rb-actions">
                <button class="mini-btn rb-go" type="button" @click="emit('accelerate', archiveFallback)">{{ expanded[archiveFallback] ? '已加入 ✓' : '一键加速源码包' }}</button>
                <button class="mini-btn" type="button" @click="copyWithToast(archiveFallback, $event.currentTarget)">复制原链</button>
            </span>
        </div>
        <AccelLinks v-if="expanded[archiveFallback] && !release.assets.length" :url="archiveFallback"
                    :links="topLinks(archiveFallback)" :total="total"
                    @view-all="emit('view-all', $event)" />
    </div>
</template>
