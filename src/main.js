import { createApp } from 'vue';
import App from './App.vue';
import './styles/main.css';
import { loadWebFontsAsync } from './lib/ui-fx.js';
import { installAppContext } from './app/context.js';
import { createAppContext } from './app/createAppContext.js';

// Google Fonts 非阻塞加载：失败自动回退系统字体栈（见 ui-fx.js）
loadWebFontsAsync();

// v4：一次构造全部 store，provide/inject 给整棵组件树；所有浏览器能力在此注入。
const app = createApp(App);
installAppContext(app, createAppContext());
app.mount('#app');
