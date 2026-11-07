/**
 * Release 模块兼容入口（v4 重构）。
 *
 * 纯函数与常量已迁至 ./releases-core.js（无浏览器全局依赖，可直接单测）。
 * 本文件保留原有导出路径，避免 tests / 旧调用点断裂；带浏览器副作用的
 * Token 与缓存函数委托给可注入的 release gateway（platform 层）。
 */
export * from './releases-core.js';
import { getDefaultReleaseGateway } from '../platform/release-gateway.js';

/** 读取本地保存的 Token（容器外调用时走默认 platform）。 */
export function getStoredToken() {
    return getDefaultReleaseGateway().getToken();
}

/** 保存 Token 到 localStorage。 */
export function setStoredToken(token) {
    getDefaultReleaseGateway().setToken(token);
}

/** 清除已保存的 Token。 */
export function clearStoredToken() {
    setStoredToken('');
}

/** 读取 sessionStorage 缓存，未命中/过期返回 null。 */
export function readReleaseCache(slug) {
    return getDefaultReleaseGateway().readCache(slug);
}

/** 写入 sessionStorage 缓存。 */
export function writeReleaseCache(slug, data) {
    getDefaultReleaseGateway().writeCache(slug, data);
}
