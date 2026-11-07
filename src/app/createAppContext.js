/**
 * 应用容器构造（v4 重构）。
 *
 * v3.1：每个 composable 各自在模块顶层建 singleton + 自己探测 localStorage /
 * sessionStorage / location，依赖关系隐含在 import 图里（releaseResolver 更是直接
 * 调 useConverter()）。v4：启动时按依赖顺序一次性构造全部 store，显式注入依赖，
 * 再由 installAppContext(app, ctx) 提供给整棵组件树。
 *
 * 所有平台能力来自 createBrowserPlatform()；测试可传入假 platform 完整替换环境。
 */
import { createBrowserPlatform } from '../platform/browser.js';
import { createReleaseGateway } from '../platform/release-gateway.js';
import { createUrlState } from '../lib/url-state.js';
import { createToastStore } from '../composables/useToast.js';
import { createModeStore } from '../composables/useMode.js';
import { createNodesStore } from '../composables/useNodes.js';
import { createSpeedTestStore } from '../composables/useSpeedTest.js';
import { createConverterStore } from '../composables/useConverter.js';
import { createReleaseResolverStore } from '../composables/useReleaseResolver.js';
import { createCopyStore } from '../composables/useCopy.js';

/**
 * @param {object} [opts]
 * @param {object} [opts.platform] 完整平台适配片段（默认 createBrowserPlatform()）
 * @returns {{
 *   platform: object, gateway: object, urlState: object,
 *   toast: object, mode: object, nodes: object, speedTest: object,
 *   converter: object, releaseResolver: object, copy: object
 * }}
 */
export function createAppContext({ platform = null } = {}) {
    const p = platform || createBrowserPlatform();

    // 1) 平台网关：Token / 缓存 / 网络
    const gateway = createReleaseGateway({
        localStorage: p.localStorage,
        sessionStorage: p.sessionStorage,
        fetchFn: p.fetchFn
    });
    const urlState = createUrlState({ location: p.location, history: p.history });

    // 2) 无依赖的基础 store
    const toast = createToastStore(p.timers.setTimer, p.timers.clearTimer);
    const mode = createModeStore(p.localStorage);
    const nodes = createNodesStore(p.localStorage);
    const speedTest = createSpeedTestStore({ storage: p.sessionStorage, fetchFn: p.fetchFn });

    // 3) 显式依赖注入：converter 需要 toast + urlState；
    //    releaseResolver 需要 toast + gateway + converter（消除隐藏单例耦合）；
    //    copy 需要 toast（三处组件共用同一份复制反馈）。
    const converter = createConverterStore({ toast, urlState });
    const releaseResolver = createReleaseResolverStore({ toast, gateway, converter });
    const copy = createCopyStore({ toast });

    return { platform: p, gateway, urlState, toast, mode, nodes, speedTest, converter, releaseResolver, copy };
}
