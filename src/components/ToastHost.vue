<script setup>
// v4：从 App.vue 拆出的全局 Toast 展示（状态由容器里的 toast store 提供）。
defineProps({
    toast: {
        type: Object,
        required: true
    }
});
</script>

<template>
    <div class="toast" role="status" aria-live="polite" :hidden="!toast.visible">{{ toast.msg }}</div>
</template>
