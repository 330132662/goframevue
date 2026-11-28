/**
 * 平台代管租户数据的上下文（方案B：一套角色表 + 平台代管/租户自助两个视角）。
 *
 * 用途：平台在「租户管理」点某租户的「角色」时，把目标租户写入 sessionStorage，
 * 再跳到共用的角色管理页；角色 API 层读取后作为 tenant_id 传给后端。
 *
 * 安全边界（必须保持）：
 *  - 这里只存「目标租户 id」，不提权。后端 tenant.ResolveManageCtx 会校验：
 *    只有平台 token 才能代管别的租户；租户 token 传别人的 id 会被拒绝。
 *  - 用 sessionStorage 而非 localStorage：关闭标签页即失效，且同一浏览器多标签
 *    不会互相污染；退出登录时由 clearTenantProxy 主动清掉。
 */
const PROXY_TENANT_ID = 'bizProxyTenantId';
const PROXY_TENANT_NAME = 'bizProxyTenantName';

export function setTenantProxy(tenantId: number | string, tenantName = '') {
  sessionStorage.setItem(PROXY_TENANT_ID, String(tenantId));
  sessionStorage.setItem(PROXY_TENANT_NAME, tenantName || '');
}

export function getTenantProxyId(): number {
  const v = sessionStorage.getItem(PROXY_TENANT_ID);
  const id = Number(v || 0);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export function getTenantProxyName(): string {
  return sessionStorage.getItem(PROXY_TENANT_NAME) || '';
}

export function clearTenantProxy() {
  sessionStorage.removeItem(PROXY_TENANT_ID);
  sessionStorage.removeItem(PROXY_TENANT_NAME);
}
