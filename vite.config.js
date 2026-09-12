import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 产物结构与旧 esbuild 构建保持一致：dist/index.html + dist/assets/*.[hash].{js,css}
// Cloudflare Pages 的 _headers 缓存规则（/assets/* immutable）无需变动。
// 单元测试使用 Node 内置运行器（node --test tests/），不经过 Vite / esbuild。
export default defineConfig({
    plugins: [vue()],
    build: {
        target: 'es2018',
        sourcemap: false,
        cssCodeSplit: false
    }
});
