<script setup>
// 转换输入面板：单行 / 多行输入自动切换、实时转换、批量粘贴、快捷键。
import { ref, computed, watch, nextTick } from 'vue';
import { useConverter } from '../composables/useConverter.js';
import { useReleaseResolver } from '../composables/useReleaseResolver.js';
import { debounce } from '../lib/ui-fx.js';
import ResultList from './ResultList.vue';

const { rawText, doConvert, clearAll } = useConverter();
const { token, saveToken, clearToken } = useReleaseResolver();

const liveChk = ref(true);
const inputEl = ref(null);
const taEl = ref(null);
const tokenInput = ref('');
const showToken = ref(false);

watch(token, function (v) {
    // Token 已保存后清空输入框，避免明文长期停留
    if (v) tokenInput.value = '';
}, { immediate: true });

const isMulti = computed(function () {
    return rawText.value.includes('\n');
});

const liveConvert = debounce(doConvert, 250);

function convertNow() {
    liveConvert.cancel();
    return doConvert();
}

function onLive() {
    if (!liveChk.value) {
        liveConvert.cancel();
        return;
    }
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
        liveConvert.cancel();
        // 多行粘贴追加到现有输入之后，避免覆盖用户已输入的内容
        const existing = rawText.value.trim();
        rawText.value = existing ? existing + '\n' + text.trim() : text.trim();
        nextTick(function () {
            autoResize();
            if (taEl.value) taEl.value.focus();
            convertNow();
        });
    }
}

function onClear() {
    liveConvert.cancel();
    clearAll();
    // 清空后必须重置结果，否则切换模式/操作节点会把旧结果渲染出来（useConverter 内已处理）
    nextTick(function () { if (inputEl.value) inputEl.value.focus(); });
}

function onSaveToken() {
    saveToken(tokenInput.value);
}

function onClearToken() {
    tokenInput.value = '';
    clearToken();
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
               @keydown.enter.prevent="convertNow" @input="onLive" @paste="onPaste" />
        <textarea id="inputUrls" ref="taEl" v-model="rawText" class="multi-input" rows="3" :hidden="!isMulti"
                  placeholder="一次粘贴多个链接，每行一个，Ctrl+Enter 转换"
                  autocomplete="off" spellcheck="false"
                  @input="onLive(); autoResize()" @keydown.enter.ctrl.exact.prevent="convertNow"
                  @keydown.enter.meta.exact.prevent="convertNow"></textarea>
        <button class="btn btn-primary" type="button" @click="convertNow">转换</button>
    </div>
    <div class="input-tools">
        <label class="paste-hint"><input v-model="liveChk" type="checkbox" @change="onLive" /> 输入即实时转换</label>
        <button class="btn btn-ghost btn-sm" type="button" @click="onClear">清空</button>
    </div>
    <p class="hint">支持：仓库主页 / 文件 / Raw / Release / Archive(.zip) / clone / gist 链接 · 多行粘贴可批量转换 · 仓库主页会自动解析最新 Release 的具体文件</p>
    <details class="token-details">
        <summary>GitHub Token（可选，提高 Release 查询配额）{{ token ? ' · 已保存' : '' }}</summary>
        <div class="token-row">
            <input v-model="tokenInput" :type="showToken ? 'text' : 'password'" class="token-input"
                   placeholder="ghp_... 或 github_pat_...（仅存浏览器本地）"
                   autocomplete="off" spellcheck="false" />
            <button class="btn btn-ghost btn-sm" type="button" @click="showToken = !showToken">{{ showToken ? '隐藏' : '显示' }}</button>
            <button class="btn btn-ghost btn-sm" type="button" @click="onSaveToken">保存</button>
            <button v-if="token || tokenInput" class="btn btn-ghost btn-sm" type="button" @click="onClearToken">清除</button>
        </div>
        <p class="hint">未填 Token 时 60 次/小时/IP；填写后 5000 次/小时。Token 只存 localStorage，不会上传或进分享链接。</p>
    </details>

    <ResultList />
</template>
