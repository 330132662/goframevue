import type { Plugin } from 'vite';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * B6.1 版本引导刷新插件（构建时向产物写 version.json：git 短哈希 + 时间戳）
 * 依赖后端 A11 对 /webadmin/index.html 与 version.json 强制 no-cache，
 * 两者必须成对落地：部署新版后浏览器立即拿到新 version.json，
 * 前端 use-version-check 才能感知新版并引导刷新。
 */
export default function configVersionPlugin(): Plugin {
  let gitHash = '';
  try {
    gitHash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    gitHash = 'unknown'; // 非git环境降级
  }
  const buildTime = new Date().toISOString().replace(/[:.]/g, '-');
  const version = { hash: gitHash, time: buildTime };

  return {
    name: 'version-json-plugin',
    apply: 'build',
    // closeBundle：产物写完后向 dist 根目录写 version.json
    closeBundle() {
      try {
        writeFileSync(
          resolve(process.cwd(), 'dist', 'version.json'),
          JSON.stringify(version, null, 2),
          'utf-8',
        );
        console.log(`[version] version.json 已写入: hash=${gitHash}`);
      } catch (e) {
        console.warn('[version] version.json 写入失败:', e);
      }
    },
  };
}
