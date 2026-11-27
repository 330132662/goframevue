// =====================================================================
// B3 401 双路径熔断：业务 code=401 与 HTTP status=401 走两条拦截路径，
// 会同时触发两次"登出+跳登录"，且并发在途请求各自再收一次 401。
// 本模块为两条路径提供共享状态：
// - logoutPending 标记：置位后携带 token 的请求直接 reject 不发 HTTP
//   （放行已清 token 后登录页的验证码等免鉴权请求）
// - 在途请求 AbortController 注册表：熔断时批量取消全部在途请求
// - isRelogin 防抖锁（2 秒）：并发 401 只清一次登录态
// =====================================================================

const LOGOUT_PENDING_FLAG = 'logout_pending';

let logoutPending = false;
let reloginLockTs = 0;
const inflightControllers = new Set<AbortController>();

export function isLogoutPending(): boolean {
  return logoutPending;
}

export function setLogoutPending(flag: boolean) {
  logoutPending = flag;
}

/** 注册在途请求的 AbortController */
export function addInflightController(controller: AbortController) {
  inflightControllers.add(controller);
}

/** 请求结束后注销 */
export function removeInflightController(controller: AbortController) {
  inflightControllers.delete(controller);
}

/** 熔断：取消全部在途请求 */
export function abortAllInflight() {
  inflightControllers.forEach((c) => {
    try {
      c.abort(LOGOUT_PENDING_FLAG);
    } catch (e) {
      /* ignore */
    }
  });
  inflightControllers.clear();
}

/**
 * 触发登出熔断（两条 401 路径共用）：
 * - 2 秒防抖：并发 401 只清一次登录态，返回 true 表示本次调用负责清登录态
 * - 置位 logoutPending + 取消全部在途请求
 * 登录成功/重登后调用 resetLogoutPending() 复位。
 */
export function triggerLogoutPending(): boolean {
  abortAllInflight();
  const now = Date.now();
  if (logoutPending && now - reloginLockTs < 2000) {
    return false; // 防抖窗口内，不重复清登录态
  }
  reloginLockTs = now;
  logoutPending = true;
  return true;
}

/** 登录成功后复位熔断状态 */
export function resetLogoutPending() {
  logoutPending = false;
  reloginLockTs = 0;
}

/** 判断错误是否为熔断取消（静默失败，不提示不重试） */
export function isLogoutPendingCancel(err: any): boolean {
  return (
    err?.code === 'ERR_CANCELED' ||
    err?.message === LOGOUT_PENDING_FLAG ||
    err?.message === 'canceled' ||
    err?.response?.data === LOGOUT_PENDING_FLAG ||
    (typeof err?.message === 'string' && err.message.indexOf(LOGOUT_PENDING_FLAG) !== -1)
  );
}
