<script setup>
// 结果区容器（v4）：分组逻辑交给 useResultGroups()，分组渲染交给 ResultGroup.vue，
// 本组件只做编排（工具栏、分页、事件转发）。
import { useConverter } from '../composables/useConverter.js';
import { useMode } from '../composables/useMode.js';
import { useCopy } from '../composables/useCopy.js';
import { useResultGroups } from '../composables/useResultGroups.js';
import ModeSwitch from './ModeSwitch.vue';
import ResultGroup from './ResultGroup.vue';

const { removeGroup } = useConverter();
const { isClone } = useMode();
const { copyWithToast } = useCopy();
const {
    visibleGroupList, hiddenGroupCount, resultStatus, hasLinks, multi,
    showMoreGroups, allLines, onCopyAll
} = useResultGroups();
</script>

<template>
    <div class="results" :hidden="!hasLinks">
        <div class="results-head">
            <h3>加速链接</h3>
            <div class="results-head-right">
                <ModeSwitch />
                <button class="btn btn-ghost btn-sm" type="button" :disabled="!hasLinks"
                        title="复制当前全部结果" @click="onCopyAll">复制全部</button>
            </div>
        </div>
        <p class="visually-hidden" aria-live="polite">{{ resultStatus }}</p>
        <div class="result-list">
            <ResultGroup v-for="g in visibleGroupList" :key="g.url"
                         :group="g" :multi="multi" :clone="isClone()"
                         @copy-group="(url, btn) => copyWithToast(allLines(url).join('\n'), btn)"
                         @remove-group="removeGroup"
                         @copy-entry="copyWithToast" />
        </div>
        <div v-if="hiddenGroupCount" class="load-more">
            <button class="btn btn-ghost btn-sm" type="button" @click="showMoreGroups">
                显示更多（剩余 {{ hiddenGroupCount }} 组）
            </button>
        </div>
    </div>
</template>
