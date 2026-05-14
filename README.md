# Helper 前端

[English](README.en.md)

个人效率工具 Web 应用，提供提醒、计时、待办和收支管理功能。

## 技术栈

- **框架:** React 19 + TypeScript
- **构建工具:** Vite 8
- **样式:** Tailwind CSS 4
- **路由:** React Router DOM 7
- **图表:** Recharts
- **HTTP 客户端:** Axios

## 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 仪表盘 |
| 提醒 | `/reminders` | 提醒事项管理 |
| 计时器 | `/timer` | 正计时 / 倒计时，底部悬浮控件 |
| 待办 | `/todo` | 任务清单管理 |
| 收支 | `/finance` | 收支记录与图表统计 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（需后端服务运行在 localhost:3001）
npm run dev

# 构建生产包
npm run build

# 预览生产包
npm run preview

# 代码检查
npm run lint
```

## 开发说明

- 后端 API 代理到 `http://localhost:3001`（`/api` 和 `/uploads` 路径）
- 状态管理使用 Context API（ActiveTimer、Reminders）
- 自定义 Hooks：`useTimer`、`useReminders`、`useResource`
