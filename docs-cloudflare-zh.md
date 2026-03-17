# OpenMAIC 部署到 Cloudflare（Workers / Pages）

> 适用于当前仓库（Next.js 16 全栈应用）。

## TL;DR（先看这个）

根据 Cloudflare 构建日志，当前项目使用 `@cloudflare/next-on-pages` 会失败，原因是它要求非静态路由全部使用 Edge Runtime（`export const runtime = 'edge'`），而本仓库现状并非如此。

因此：

- ✅ **推荐：Cloudflare Workers（OpenNext Cloudflare）**
- ⚠️ **Pages + next-on-pages：当前仓库不推荐**（除非你愿意把大量路由改成 Edge Runtime）

---

## 0. 前置准备

- Cloudflare 账号
- 一个 GitHub 仓库（已 push 本项目）
- 本地 Node.js >= 20.9 和 pnpm（项目要求）

先在本地确认能跑：

```bash
pnpm install
pnpm build
```

---

## 1) 推荐方案：Cloudflare Workers（OpenNext Cloudflare）

该方案更适合 Next.js 全栈应用，避免 next-on-pages 的全量 Edge 约束。

### Step 1. 安装工具

```bash
pnpm add -D wrangler @opennextjs/cloudflare
pnpm dlx wrangler login
```

### Step 2. 创建 `wrangler.toml`

在项目根目录创建：

```toml
name = "openmaic"
main = ".open-next/worker.js"
compatibility_date = "2026-03-17"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[vars]
DEFAULT_MODEL = "openai:gpt-4o-mini"
```

> `nodejs_compat` 对 Next 全栈项目很关键，可提升 Node API 兼容性。

### Step 3. 构建并发布

```bash
pnpm run cf:build
pnpm run cf:deploy
```


### Step 3.5 在 Cloudflare 网站开启自动部署（Git）

如果你是“在 Cloudflare 网站上自动部署”，按这个顺序：

1. 把本仓库推到 GitHub。
2. 在 Cloudflare 控制台打开 **Workers & Pages**，选择 **Create** → **Workers** → **Import a repository**。
3. 选择本仓库后，在 Build / Deploy 设置中填：
   - Build command: `pnpm run cf:build`
   - Deploy command: `pnpm run cf:deploy`
4. 在仓库根目录直接使用 `wrangler.toml`，按需修改 `name`（建议全局唯一）和 `DEFAULT_MODEL`。

> `cf:deploy` 会自动探测 OpenNext 生成的 Worker 入口（不同版本路径可能不同），并生成临时 wrangler 配置后再部署，避免 `entry-point ... not found` 和 workspace 自动检测报错。

### Step 4. 配置环境变量

在 Cloudflare Worker（Production / Preview）中配置：

最少一组 LLM Key，例如：

- `OPENAI_API_KEY=...`

其它可选变量参见 `.env.example`。

### Step 5. 验证

- 首页可访问
- `/api/*` 动态接口可访问
- 课堂生成、上传/导出链路可用

---

## 2) Pages 方案说明（当前仓库不推荐）

### 为什么你会失败

你日志里的关键错误是：

- `Failed to produce a Cloudflare Pages build`
- `The following routes were not configured to run with the Edge Runtime`
- 要求所有非静态路由都导出 `export const runtime = 'edge'`

这说明 `@cloudflare/next-on-pages` 在当前项目上会卡在运行时约束。

### 如果你坚持用 Pages，需要做什么

你需要把几乎所有动态页面/API 路由改成 Edge Runtime，并逐条验证依赖是否可在 Edge 上运行（例如 Node-only 包、部分原生能力会受限）。改造成本高，不建议作为首选。

---

## 3) 常见问题

### Q1: `No Wrangler configuration file found`

在仓库根目录确保存在 `wrangler.toml`，并确保部署命令在该目录执行。

### Q2: `build output directory contains links to files that can't be accessed`

这通常发生在把 `.next` 当成 Pages 静态输出目录时。Next 全栈项目不要直接把 `.next` 填到 Pages 输出目录。

### Q3: `next-on-pages` 提示 peer 依赖 Next 版本不匹配

你的日志显示 `@cloudflare/next-on-pages` 期望 `next <= 15.5.2`，而本仓库是 Next 16，因此更应使用 Workers + OpenNext 路线。

### Q4: 要不要保留 Vercel 配置

可以保留。仓库当前默认文档是 Vercel，不影响新增 Cloudflare Workers 部署流程。

### Q5: `Wrangler application detection logic ... root of a workspace`

这是 pnpm workspace 场景的常见报错。请把部署命令改成显式配置文件模式：

- `pnpm run cf:deploy`

并确保 `wrangler.toml` 在仓库根目录；具体 `main` 路径可由 `pnpm run cf:deploy` 自动探测。
