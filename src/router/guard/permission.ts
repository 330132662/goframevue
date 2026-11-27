import type { Router, RouteRecordRaw } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import usePermission from '@/hooks/permission';
import { useUserStore, useAppStore } from '@/store';
import { WHITE_LIST, NOT_FOUND, DEFAULT_ROUTE_NAME } from '../constants';
import { isLogin } from '@/utils/auth';

// =====================================================================
// B1 动态路由加载容错 + 404 分层兜底（路由守卫）
// ---------------------------------------------------------------------
// 背景：F5 刷新时 vue-router 先用静态路由表匹配，动态路由未 addRoute，
// 任何业务路径都先命中 catch-all notFound。处理不好会出现刷新白屏/404 死循环。
// =====================================================================

/**
 * 逐条 try/catch 注册动态路由。
 * 【踩坑注释】单条非法菜单（如 routepath 不以 / 开头）会让 addRoute 抛错，
 * 必须逐条捕获只 warn 跳过，不阻断整个守卫；已存在同名路由用 router.hasRoute 跳过。
 */
function addRoutesSafely(router: Router, routes: RouteRecordRaw[]) {
  let added = false;
  routes.forEach((route) => {
    try {
      if (!route.name || router.hasRoute(route.name as string)) return;
      router.addRoute(route);
      added = true;
    } catch (e) {
      // 单条非法菜单不阻断整个守卫
      console.warn('[guard] 动态路由注册失败，已跳过:', (route as any)?.name, (route as any)?.path, e);
    }
  });
  return added;
}

/** 菜单树中是否存在指定 name 的路由 */
function hasRouteInMenus(menus: any[], name: unknown): boolean {
  const stack = [...menus];
  while (stack.length) {
    const el = stack.pop();
    if (el?.name === name) return true;
    if (el?.children?.length) stack.push(...el.children);
  }
  return false;
}

/**
 * 递归找第一个可用页面路径（跳过 hideInMenu 与非法 path）。
 * 【踩坑注释】非法 path（不以 / 开头）会让 router.addRoute 抛错 →
 * login() reject → 登录页 catch 吞掉 → 停在登录页，必须过滤。
 */
function findFirstPagePath(routes: any[]): string | undefined {
  const stack = [...routes];
  while (stack.length) {
    const el = stack.pop();
    if (!el) continue;
    if (!el.hideInMenu && typeof el.path === 'string' && el.path.startsWith('/') && !el.children?.length) {
      return el.path;
    }
    if (el.children?.length) stack.push(...el.children);
  }
  return undefined;
}

/**
 * 重新解析后仍 notFound 的分层兜底（B1.3）。
 * 返回值：null 表示放行（交给 vue-router 渲染 404 页）。
 */
function notFoundFallback(appStore: any, toName: unknown): any {
  const menus = appStore.appAsyncRoute as any[];
  if (!menus.length) {
    // c) 菜单为空（接口失败/无权限）→ 直接 next() 放行渲染 404 页。
    // 【踩坑注释】不能再 next(NOT_FOUND)——按 name 重新解析又回守卫，死循环。
    return null;
  }
  // a) 默认首页不在菜单 / b) 访问了菜单外路径 → 兜底跳第一个可用页（按 path 跳转）
  const first = findFirstPagePath(menus);
  if (first && (toName === 'notFound' || !hasRouteInMenus(menus, toName))) {
    return { path: first, replace: true };
  }
  if (toName === 'notFound') {
    // 无可用页面但菜单非空：兜底到默认首页名
    return { name: DEFAULT_ROUTE_NAME, replace: true };
  }
  return null;
}

/** 统一处理：加载服务端菜单 → 容错注册动态路由 → 重定向/兜底 */
async function handleDynamicRoute(
  router: Router,
  appStore: any,
  to: any,
  fetchParams: Record<string, any>,
): Promise<any> {
  // 【踩坑注释】"刚注册"只能用本次守卫的局部标记 routesJustAdded，
  // 不能用 !from.name——刷新期间整条导航链上 from 一直是初始路由（无 name），
  // 每轮都为 true 会无限重定向。
  let routesJustAdded = false;
  if (!appStore.appAsyncRoute.length) {
    await appStore.fetchServerMenuConfig(fetchParams);
  }
  // 无论菜单是本次拉取还是登录后已拉取，都容错注册（登录 store 已拉菜单但守卫未注册的场景）
  routesJustAdded = addRoutesSafely(router, appStore.appAsyncRoute as unknown as RouteRecordRaw[]);
  if (!appStore.getIsDynamicAddedRoute) {
    appStore.setDynamicAddedRoute(true);
  }
  if (routesJustAdded) {
    // 刚注册完动态路由，重新导航一次让 vue-router 重新解析目标路径
    return { path: to.fullPath, replace: true, query: to.query } as any;
  }
  const appStorePermission = usePermission();
  const permissionsAllow = appStorePermission.accessRouter(to);
  const exist = hasRouteInMenus([...(appStore.appAsyncRoute as any[]), ...WHITE_LIST], to.name);
  if (!exist || !permissionsAllow) {
    if (to.name === 'notFound' || to.name === 'login') return null; // 白名单放行
    return notFoundFallback(appStore, to.name);
  }
  return null;
}

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();
    const userStore = useUserStore();
    const Permission = usePermission();
    const permissionsAllow = Permission.accessRouter(to);
    userStore.btnroles = to.meta.btnroles; // 把按钮权限赋值给用户的按钮权限存储
    let redirect: any = null;
    if (appStore.menuFromServer && isLogin()) {
      // 针对来自服务端的菜单配置进行处理
      if (appStore.getIsDynamicAddedRoute) {
        // 判断是否已经加载路由组件
        next();
        NProgress.done();
        return;
      }
      redirect = await handleDynamicRoute(router, appStore, to, {});
    } else if (to.query.rouid) {
      // 独立界面无需登录查看
      if (appStore.getIsDynamicAddedRoute) {
        next();
        NProgress.done();
        return;
      }
      redirect = await handleDynamicRoute(router, appStore, to, { rouid: to.query.rouid });
    } else {
      if (permissionsAllow) next();
      else {
        next(NOT_FOUND);
      }
      NProgress.done();
      return;
    }
    if (redirect) {
      next(redirect);
    } else {
      next();
    }
    NProgress.done();
  });
}
