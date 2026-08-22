import { createApp } from 'vue';
import App from './App.vue';
import './styles/main.css';
import { loadWebFontsAsync } from './lib/ui-fx.js';

// Google Fonts 非阻塞加载：失败自动回退系统字体栈（见 ui-fx.js）
loadWebFontsAsync();

createApp(App).mount('#app');
