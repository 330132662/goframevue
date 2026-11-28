# goframevue/AGENTS.md — 前端细化规则

> 上级规则：`../AGENTS.md`（必读，含多租户架构与协作偏好）。本文件只写前端特有约定。

## 技术栈

Vue3 + TypeScript + Vite + Pinia + vue-router4 + Arco Design，`goflyadmin@2.9.7`。
**包管理只能用 yarn**（`resolutions` 字段只有 yarn 认），禁止 `npm install`。构建用 `yarn run build`（项目脚本，会加载 `config/vite.config.prod.ts`），不要裸跑 `npx vite build`。

## 目录职责

| 路径 | 作用 |
|---|---|
| `src/api/` | 接口封装，统一走 `utils/http` 的 `defHttp` |
| `src/router/index.ts` `constants.ts` | 双登录入口：`/login`（平台）、`/tenant/login`（租户，`meta.appType='tenant_admin'`） |
| `src/router/guard/userLoginInfo.ts` | 登录态守卫，按端类型选择回跳目标 |
| `src/store/modules/user/` | 登录自动注入 `app_type` / `tenant_code`；logout 按端类型回跳 |
| `src/utils/auth.ts` | token、租户编码、端类型的本地存储 |
| `src/utils/tenantProxy.ts` | 平台代管租户的上下文（sessionStorage），**退出登录必须清除** |
| `src/views/login/` | 登录页；`components/account/index.vue` 支持 `?tenant=xxx` 预填租户编码 |
| `src/views/tenant/` | 平台端租户管理（含角色入口） |
| `src/views/system/role/` | 角色管理，被平台与租户共用 |
| `src/directive/` | `v-permission` 等权限指令 |
| `dist/` | 构建产物；需 `build_all.sh --copy-dist` 才进入后端静态托管 |

## 多租户前端约定

- 菜单**来自服务端动态下发**，不要手写静态路由来"补菜单"；菜单看不到先查 `gf_auth_rule.app_type` 和父目录的打标情况。
- 端类型、租户编码只在登录时写入，后续请求由后端从 JWT 解析；前端不要给普通业务接口塞 `tenant_id`。
- 角色接口（`src/api/system/role.ts`）统一注入 `tenant_id`，值只从 `tenantProxy` 读；租户端该值为空或自身 id，平台代管时为代管目标。
- 按钮权限用 `v-permission` + 后端返回的 `btnroles`；超管是 `["*"]`，不要依赖空串 permission。
- 退出登录时在 `logoutCallBack` 里清掉代管上下文，避免切回平台后误代管。

## 既有问题（非新引入，别误判为自己改坏）

- `vue-tsc --noEmit` 有 `CellNodeAvatar.vue.js` TS6504。
- 构建产物路径带绝对路径前缀（`dist/D:/...`），是构建脚本遗留问题。

## 验证

`yarn run build` 通过即视为前端改动可用；不要为了验证去启 dev server 或改后端静态目录，除非用户明确要求。
