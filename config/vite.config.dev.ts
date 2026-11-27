import { mergeConfig } from 'vite';
import baseConfig from './vite.config.base';

export default mergeConfig(
  {
    mode: 'development',
    server: {
      open: false,
      fs: {
        strict: true,
      },
      host: true,
      port:9606, // 这是页面端口
      proxy: {
        '/admin': {
          target: 'http://127.0.0.1:8600/admin',//后端端口  代理的地址(http://youdomain.cn替换你自己的)
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/admin/, '')//这里的/需要转义
        }
      }
    },
    plugins: [
    ],
  },
  baseConfig
);
