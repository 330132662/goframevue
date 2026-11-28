# Claude Code — 前端目录入口

**开工第一步**：读取并遵守本目录 `AGENTS.md`，以及上层 `../AGENTS.md`（根规则）。冲突时以根规则的安全条款为准。

> Claude Code 不原生读 AGENTS.md，根级 `@import` 也不覆盖子目录，所以本文件用文字指令 + 红线摘要兜底。不复制整份规则。

不可违反的红线：

- **只能用 yarn**，禁止 `npm install`（`resolutions` 只有 yarn 认）；构建用 `yarn run build`，不要裸跑 `npx vite build`。
- 菜单由服务端动态下发，不要手写静态路由"补菜单"；菜单缺失先查 `gf_auth_rule.app_type` 及父目录打标。
- 端类型 / 租户编码只在登录时写入；普通业务接口不要塞 `tenant_id`。
- 角色接口从 `utils/tenantProxy.ts` 读代管上下文；退出登录必须清除。
- 改了前端必须重新 build，且需 `build_all.sh --copy-dist` 才进后端静态托管。

读到后请在首次回复开头输出 `[AGENTS.md loaded]`。
