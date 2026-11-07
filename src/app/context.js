/**
 * 应用容器（v4 重构）：Vue provide/inject 边界 + 容器外兼容作用域。
 *
 * v3.1 里 6 个 composable 各自持有模块级 singleton：组件靠「恰好 import 同一模块」
 * 共享状态，测试只能 mock globalThis，且环境无法整体替换。
 *
 * v4：main.js 启动时 createAppContext() 一次并 installAppContext(app, ctx)，
 * 组件里的 useXxx() 通过 useStore(name) 取同一实例；node:test / 脚本没有注入上下文，
 * 才惰性构造一组回退实例（defineFallback 注册，factory 可用 get() 解析同作用域依赖）。
 */
import { hasInjectionContext, inject } from 'vue';

export const APP_CONTEXT_KEY = Symbol('github-fast:app-context');

/** 在 createApp() 之后、mount() 之前调用。 */
export function installAppContext(app, context) {
    app.provide(APP_CONTEXT_KEY, context);
    return context;
}

/** 取注入容器里的某个 store；不在 setup 内 / 未安装容器时返回 null。 */
export function contextStore(name) {
    if (!hasInjectionContext()) return null;
    const ctx = inject(APP_CONTEXT_KEY, null);
    return ctx && ctx[name] ? ctx[name] : null;
}

// ---- 容器外兼容作用域（node:test / 非 Vue 脚本）----
const fallbackFactories = new Map();
const fallbackStores = new Map();

/**
 * 注册容器外回退构造方式。
 * @param {string} name
 * @param {(get: (name: string) => object) => object} factory 首次调用时执行
 */
export function defineFallback(name, factory) {
    fallbackFactories.set(name, factory);
}

/** useXxx() 的统一入口：优先注入容器，否则惰性构造并缓存兼容实例。 */
export function useStore(name) {
    const injected = contextStore(name);
    if (injected) return injected;
    if (fallbackStores.has(name)) return fallbackStores.get(name);
    const factory = fallbackFactories.get(name);
    if (!factory) throw new Error('[github-fast] 未注册回退 store: ' + name);
    const store = factory(useStore);
    fallbackStores.set(name, store);
    return store;
}

/** 仅供测试：清空容器外实例（保留工厂注册）。 */
export function resetFallbackStores() {
    fallbackStores.clear();
}
