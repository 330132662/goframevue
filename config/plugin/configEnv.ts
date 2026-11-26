/**
 * 把 public/config.js 里的 %VITE_XXX% 占位符替换为对应环境变量
 * 这样本地调试 / 测试线 / 生产线 只需要改各自的 .env 文件，不用再改 config.js
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';

const DEFAULT_ENV: Record<string, string> = {
  VITE_API_DOMAIN: '',
  VITE_API_BASE_URL: 'http://localhost:8600',
};

export default function configEnvPlugin(): Plugin {
  let env = { ...DEFAULT_ENV };
  let outDir = resolve(process.cwd(), 'dist');

  const replaceEnv = (code: string) =>
    Object.keys(env).reduce(
      (result, key) => result.split(`%${key}%`).join(env[key]),
      code
    );

  return {
    name: 'goframe-config-env',
    configResolved(config) {
      // 读取当前 mode 对应的 .env / .env.[mode] 文件
      env = { ...DEFAULT_ENV, ...loadEnv(config.mode, config.root, 'VITE_') };
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      const { publicDir } = server.config;
      if (!publicDir) return;
      const file = resolve(publicDir, 'config.js');
      if (!existsSync(file)) return;
      // 开发服务返回替换后的 config.js（先于 Vite 内置的 public 静态服务）
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/config.js') return next();
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(replaceEnv(readFileSync(file, 'utf-8')));
      });
    },
    closeBundle() {
      // 打包后替换 dist/config.js 中的占位符（早于 gzip 压缩，避免压缩文件内容不一致）
      const file = resolve(outDir, 'config.js');
      if (!existsSync(file)) return;
      writeFileSync(file, replaceEnv(readFileSync(file, 'utf-8')));
    },
  };
}
