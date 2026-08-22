<script setup>
// 转换输入面板：单行 / 多行输入自动切换、实时转换、批量粘贴、快捷键。
import { ref, computed, watch, nextTick } from 'vue';
import { useConverter } from '../composables/useConverter.js';
import { debounce } from '../lib/ui-fx.js';
import ResultList from './ResultList.vue';

const { rawText, doConvert, clearAll } = useConverter();

const liveChk = ref(true);
const inputEl = ref(null);
const taEl = ref(null);

const isMulti = computed(function () {
    return rawText.value.includes('\n');
});

const liveConvert = debounce(doConvert, 250);

function onLive() {
    if (!liveChk.value) return;
    liveConvert();
}

function autoResize() {
    const ta = taEl.value;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
}

function onPaste(e) {
    const text = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (text && text.includes('\n')) {
        e.preventDefault();
        rawText.value = text.trim();
        nextTick(function () {
            autoResize();
            if (taEl.value) taEl.value.focus();
            doConvert();
        });
    }
}

function onClear() {
    clearAll();
    // 清空后必须重置结果，否则切换模式/操作节点会把旧结果渲染出来（useConverter 内已处理）
    nextTick(function () { if (inputEl.value) inputEl.value.focus(); });
}

watch(isMulti, function (multi) {
    if (multi) nextTick(autoResize);
});
</script>

<template>
    <label class="tool-label" :for="isMulti ? 'inputUrls' : 'inputUrl'">粘贴 GitHub 链接</label>
    <div class="input-row">
        <input id="inputUrl" ref="inputEl" v-model="rawText" type="text" :hidden="isMulti"
               placeholder="https://github.com/user/repo 或 releases/download/... 或 raw.githubusercontent.com/..."
               autocomplete="off" spellcheck="false"
               @keydown.enter.prevent="doConvert" @input="onLive" @paste="onPaste" />
        <textarea id="inputUrls" ref="taEl" v-model="rawText" class="multi-input" rows="3" :hidden="!isMulti"
                  placeholder="一次粘贴多个链接，每行一个，Ctrl+Enter 转换"
                  autocomplete="off" spellcheck="false"
                  @input="onLive; autoResize()" @keydown.enter.ctrl.exact.prevent="doConvert"
                  @keydown.enter.meta.exact.prevent="doConvert"></textarea>
        <button class="btn btn-primary" type="button" @click="doConvert">转换</button>
    </div>
    <div class="input-tools">
        <label class="paste-hint"><input v-model="liveChk" type="checkbox" /> 输入即实时转换</label>
        <button class="btn btn-ghost btn-sm" type="button" @click="onClear">清空</button>
    </div>
    <p class="hint">支持：仓库主页 / 文件 / Raw / Release / Archive(.zip) / clone / gist 链接 · 多行粘贴可批量转换</p>

    <ResultList />
</template>
