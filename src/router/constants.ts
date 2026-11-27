import type { RouteRecordRaw } from 'vue-router';

export const WHITE_LIST = [
  { name: 'notFound', children: [] },
  { name: 'login', children: [] },
];

export const NOT_FOUND = {
  name: 'notFound',
};

export const REDIRECT_ROUTE_NAME = 'Redirect';

export const DEFAULT_ROUTE_NAME = window?.globalConfig.RouterHome||"home";

export const DEFAULT_ROUTE = {
  title: 'menu.dashboard.workplace',
  name: DEFAULT_ROUTE_NAME,
  fullPath: '/'+DEFAULT_ROUTE_NAME,
};
//动态路由
export const REDIRECT_NAME = 'Redirect';
export const PARENT_LAYOUT_NAME = 'ParentLayout';
export const PAGE_NOT_FOUND_NAME = 'PageNotFound';
export const EXCEPTION_COMPONENT = () => import('@/views/systool/404/index.vue');
/**
 * @description: default layout
 */
export const LAYOUT = () => import('@/layout/default-layout.vue');
/**
 * @description: parent-layout
 */
export const getParentLayout = (_name?: string) => {
  return () =>
    new Promise((resolve) => {
      resolve({
        name: PARENT_LAYOUT_NAME,
      });
    });
};

// =====================================================================
// B2 getHomePath 参数注入改造（修复"登录成功停在登录页"）
// ---------------------------------------------------------------------
// 【踩坑注释】禁止在函数内部 require('@/store')——Vite/ESM 浏览器端无 require，
// 必然抛错且被上层 catch 静默吞掉，"从菜单找首页"逻辑从未生效。
// 必须由调用方传入路由列表（如 useAppStore().appAsyncRoute）。
// =====================================================================

/**
 * 递归找第一个可跳转页：过滤无前导 / 的非法 path
 * （非法 path 会让 router.addRoute 抛错 → login() reject → 登录页 catch 吞掉 → 停在登录页）
 */
function findFirstNavigablePath(routes: any[]): string | undefined {
  const stack = [...routes];
  while (stack.length) {
    const el = stack.pop();
    if (!el) continue;
    if (typeof el.path !== 'string' || !el.path.startsWith('/')) continue; // 过滤非法 path
    if (el.hideInMenu) continue;
    if (el.children?.length) {
      const child = findFirstNavigablePath(el.children);
      if (child) return child;
    } else {
      return el.path;
    }
  }
  return undefined;
}

/**
 * 从路由列表推导登录后的首页路径；传入 useAppStore().appAsyncRoute。
 * 找不到时兜底 DEFAULT_ROUTE_NAME 对应路径。
 */
export function getHomePath(routes?: RouteRecordRaw[]): string {
  const home = findFirstNavigablePath((routes as any[]) || []);
  if (home) return home;
  return '/' + DEFAULT_ROUTE_NAME;
}
