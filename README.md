# 念归处 · 数字纪念堂

华人数字纪念馆 — 静态演示 + 全栈 API 双轨部署。

| 环境 | URL 示例 | 能力 |
|------|----------|------|
| GitHub Pages | https://hanbing6228.github.io/memory/ | 静态 UI + localStorage 演示 |
| Hostinger VPS | `https://memory.yourdomain.com` | 登录、数据库、Composio 提醒 |

## 本地开发（全栈）

```bash
cd memory
cp .env.example .env
# 编辑 AUTH_SECRET（至少 16 字符）
npm install
mkdir -p data
npm run db:push
npm run seed
npm run dev
# http://localhost:3000
```

演示账号：`demo@nianguichu.local` / `demo-demo-demo`  
演示纪念馆 slug：`li-mingde`

## 目录结构

```
memory/
├── app/api/           # Next.js API 路由
├── lib/               # auth、Prisma、Composio、权限隔离
├── prisma/            # SQLite schema + seed
├── public/            # 原 MVP 静态页 + P0 JS/CSS
├── scripts/           # 部署与 cron 脚本
├── .github/workflows/ # Pages + VPS CI/CD
├── DEPLOY.md          # Hostinger / Composio / Snyk 详细步骤
└── README.md
```

## P0 情感功能

1. **私人哀伤场域** — 家族/公开/仅自己 + 静默模式
2. **追思节律** — 头七、七七、周年、清明 + 邮件提醒（VPS + Composio）
3. **共建记忆** — 亲友碎片 + 家人审核
4. **祭奠心意** — 点烛/献花前写一句，汇入共祭时光
5. **创建纪念馆** — 三步向导（API 或 localStorage 回退）

## 部署

- **GitHub Pages**：`deploy-pages.yml` 仅发布 `public/`（无 API）
- **Hostinger VPS**：见 [DEPLOY.md](./DEPLOY.md)

## 环境变量

见 `.env.example`：`AUTH_SECRET`、`CRON_SECRET`、`COMPOSIO_*`、`NOTION_DATABASE_ID`

## 安全

```bash
npm audit
# 可选：snyk test && snyk code test（需 SNYK_TOKEN）
```

CI 在 `deploy-vps.yml` 中可选运行 Snyk。

## 产品文档

Notion 灵感库：[数字纪念堂产品矩阵与灵感库](https://www.notion.so/370a5a0b442e817aaaa3cbb879c90f93)
