<script setup>
// 单个「链接 × 全部节点」分组（v4：从 ResultList.vue 的 v-for 主体拆出）。
import ReleaseResolver from './ReleaseResolver.vue';

defineProps({
    group: { type: Object, required: true },
    multi: { type: Boolean, default: false },
    clone: { type: Boolean, default: false }
});
defineEmits(['copy-group', 'remove-group', 'copy-entry']);
</script>

<template>
    <div class="link-group" :data-url="group.url">
        <div v-if="multi" class="group-head">
            <span class="gh-link" :title="group.url">{{ group.url }}</span>
            <span class="ri-tag">{{ group.typeTag }}</span>
            <div class="ri-actions">
                <button class="mini-btn" type="button"
                        @click="$emit('copy-group', group.url, $event.currentTarget)">复制本组</button>
                <button class="mini-btn" type="button" @click="$emit('remove-group', group.url)">删除本组</button>
            </div>
        </div>

        <ReleaseResolver v-if="group.isRepo" :repo-url="group.url" :auto="group.autoResolve" />

        <template v-for="entry in group.entries" :key="entry.key">
            <div v-if="entry.kind === 'subhead'" class="link-subhead">{{ entry.text }}</div>
            <div v-else class="result-item" :class="['ti-' + group.typeClass, { pinned: entry.pinned }]"
                 :style="{ animationDelay: entry.delay }">
                <div class="ri-head">
                    <div class="ri-left">
                        <span class="ri-name">{{ entry.node.name }}</span>
                        <span class="ri-tag">{{ group.typeTag }}</span>
                    </div>
                    <div class="ri-actions">
                        <template v-if="clone">
                            <button class="mini-btn" type="button"
                                    @click="$emit('copy-entry', entry.text, $event.currentTarget)">复制命令</button>
                        </template>
                        <template v-else>
                            <button class="mini-btn" type="button"
                                    @click="$emit('copy-entry', entry.target, $event.currentTarget)">复制</button>
                            <a class="mini-btn" :href="entry.target" target="_blank" rel="noopener">打开</a>
                        </template>
                    </div>
                </div>
                <span class="ri-url">{{ entry.text }}</span>
            </div>
        </template>
    </div>
</template>
