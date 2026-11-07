import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// v4 构建：Vite 6 统一产出 dist/index.html + dist/assets/*.[hash].{js,css}
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
