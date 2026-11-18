# 神龙冒险家

孩子学习与小龙成长的静态网页游戏。前端使用原生 HTML/CSS/JavaScript，认证与数据存储使用 Firebase Authentication 和 Cloud Firestore，GitHub Pages 托管网页。

## 本地运行

在项目根目录打开 PowerShell：

```powershell
py -m http.server 8000
```

浏览器打开 `http://localhost:8000/index.html`。本地登录和云端网页使用同一 Firebase 项目，因此 Firestore 规则和账户权限仍然生效。结束服务按 `Ctrl+C`。

## 换电脑继续

```powershell
cd D:\个人\开发
git clone https://github.com/Debugmode-Allen/Hello-kids-game.git
cd Hello-kids-game
py -m http.server 8000
```

已有项目时先运行 `git status`；确认自己的改动已保存后，再执行 `git pull --ff-only`。不要在有未提交改动时直接拉取覆盖。

## 开发交接

先读 `ARCHITECTURE.md`、`VERSION.md` 和 `CONTINUATION.md`，再读 `AGENTS.md` 与 `docs/DEVELOPMENT_WORKFLOW.md`。交接文件指出当前要做的功能和具体文件，避免重复读取完整历史。

- 架构、页面职责、数据和权限：`ARCHITECTURE.md`
- 当前及上一版摘要：`VERSION.md`；更早版本历史：`docs/archive/VERSION-history-before-v1.2.1.md`
- 当前工作树状态、当前任务、下一步：`CONTINUATION.md`
- 日常开发和发布流程：`docs/DEVELOPMENT_WORKFLOW.md`
- 音效开发蓝图：`SOUND_DESIGN_PLAN.md`
- 旧交接历史归档：`docs/archive/`（只作背景参考，不代表当前状态）

## 发布

用户要求发布后，提交并推送到 `main`；GitHub Pages 会自动部署。网页地址：<https://debugmode-allen.github.io/Hello-kids-game/>。Firestore Rules 不会随 GitHub 推送部署，需要在 Firebase Console 单独处理并确认。
