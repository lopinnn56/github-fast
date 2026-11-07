<script setup>
// v4：从 App.vue 拆出的返回顶部按钮（显隐与行为由 useScrollFx() 控制）。
defineProps({
    visible: { type: Boolean, default: false }
});
defineEmits(['go']);
</script>

<template>
    <button class="back-top" type="button" :hidden="!visible" aria-label="返回顶部"
            @click="$emit('go')">↑</button>
</template>
