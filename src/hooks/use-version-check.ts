import { ref, h, onMounted, onUnmounted } from 'vue';
import { Notification } from '@arco-design/web-vue';

// =====================================================================
// B6.2 版本更新引导刷新（前端侧）
// ---------------------------------------------------------------------
// 5 分钟轮询 + visibilitychange 立即检测 version.json；发现新版弹 Notification，
// "立即更新" → 清空 CacheStorage → 注销 ServiceWorker → fetch(cache:'reload') → 整页 reload。
// 【依赖】后端 A11 对 /webadmin/index.html 与 /webadmin/version.json 强制 no-cache，
// 两者必须成对落地，否则构建部署后浏览器拿不到新版本信息。
// =====================================================================

const POLL_INTERVAL = 5 * 60 * 1000; // 5 分钟轮询
const versionUrl = (import.meta.env.MODE === 'production' ? '/webadmin/' : '/') + 'version.json';

let currentVersion = '';
let timer: ReturnType<typeof setInterval> | null = null;

/** 拉取远端版本信息（带 cache:'reload' 绕过 HTTP 缓存） */
async function fetchRemoteVersion(): Promise<string> {
  try {
    const res = await fetch(`${versionUrl}?_t=${Date.now()}`, { cache: 'reload' });
    if (!res.ok) return currentVersion;
    const data = await res.json();
    return `${data.hash}|${data.time}`;
  } catch {
    return currentVersion; // 探测失败静默（离线/未部署等）
  }
}

/** 清空 CacheStorage（PWA/手动缓存） */
async function clearCaches() {
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      /* ignore */
    }
  }
}

/** 注销 ServiceWorker */
async function unregisterSW() {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* ignore */
    }
  }
}

/** "立即更新"：清空 CacheStorage → 注销 ServiceWorker → fetch(cache:'reload') → 整页 reload */
async function applyNewVersion() {
  await clearCaches();
  await unregisterSW();
  try {
    await fetch(location.href, { cache: 'reload' });
  } catch {
    /* ignore */
  }
  location.reload();
}

async function checkVersion(showNotice: boolean) {
  const remote = await fetchRemoteVersion();
  if (!currentVersion) {
    currentVersion = remote; // 首次记录基线版本
    return;
  }
  if (remote && remote !== currentVersion) {
    currentVersion = remote;
    if (!showNotice) return;
    Notification.info({
      id: 'version-update',
      title: '系统更新提示',
      content: '检测到系统已发布新版本，请立即更新以获得最新功能与修复。',
      position: 'bottomRight',
      duration: 0, // 不自动关闭
      footer: () =>
        h(
          'button',
          {
            class: 'arco-btn arco-btn-primary arco-btn-size-small',
            style: { marginTop: '8px' },
            onClick: () => {
              Notification.remove('version-update');
              applyNewVersion();
            },
          },
          '立即更新',
        ),
    });
  }
}

/**
 * 页面挂载时启动版本检测：立即检测一次 + visibilitychange 立即检测 + 5 分钟轮询
 * 在 App.vue 或 layout 中调用一次即可。
 */
export function useVersionCheck() {
  const checking = ref(false);

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      checkVersion(true);
    }
  };

  onMounted(() => {
    checkVersion(true);
    timer = setInterval(() => checkVersion(true), POLL_INTERVAL);
    document.addEventListener('visibilitychange', onVisible);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  });

  return { checking };
}
