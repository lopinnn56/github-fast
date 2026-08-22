<script setup>
// 链接 / Clone 模式分段控件：滑动指示条随选中项移动。
// 指示条位置在挂载、模式切换、窗口尺寸变化、字体加载完成后重算。
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useMode } from '../composables/useMode.js';
import { debounce } from '../lib/ui-fx.js';

const { mode, setMode } = useMode();

const btnLink = ref(null);
const btnClone = ref(null);
const ind = ref({ left: '0px', width: '0px' });
const ready = ref(false);

function measure() {
    const el = mode.value === 'clone' ? btnClone.value : btnLink.value;
    if (!el) return;
    ind.value = { left: el.offsetLeft + 'px', width: el.offsetWidth + 'px' };
    ready.value = true;
}

const indStyle = computed(function () {
    // 未完成首次测量前隐藏指示条，避免从 left:0 闪滑过来
    return ready.value ? ind.value : { visibility: 'hidden' };
});

const onResize = debounce(measure, 120);

watch(mode, function () { nextTick(measure); });

onMounted(function () {
    measure();
    window.addEventListener('resize', onResize);
    // 字体异步加载完成后文本宽度会变化，重算指示条位置
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
        document.fonts.ready.then(measure).catch(function () { /* ignore */ });
    }
    window.addEventListener('load', measure);
});

onBeforeUnmount(function () {
    window.removeEventListener('resize', onResize);
});
</script>

<template>
    <div class="seg" role="group" aria-label="显示模式">
        <span class="seg-ind" aria-hidden="true" :style="indStyle"></span>
        <button ref="btnLink" type="button" class="seg-btn" :class="{ active: mode === 'link' }"
                :aria-pressed="String(mode === 'link')" @click="setMode('link')">链接模式</button>
        <button ref="btnClone" type="button" class="seg-btn" :class="{ active: mode === 'clone' }"
                :aria-pressed="String(mode === 'clone')" @click="setMode('clone')">Clone 命令</button>
    </div>
</template>
