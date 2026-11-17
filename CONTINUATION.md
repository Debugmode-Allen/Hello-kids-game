# 换电脑继续开发：交接说明

## 先取得完整项目

建议把全部源码保存到 GitHub。它既是异地备份，也是换电脑继续工作的可靠方式；不要只保存网页链接。

在另一台 Windows 电脑安装 Git 后，打开 PowerShell：

```powershell
cd D:\个人\开发
git clone https://github.com/Debugmode-Allen/Hello-kids-game.git
cd Hello-kids-game
py -m http.server 8000
```

然后打开 `http://localhost:8000/index.html`。如果文件夹已经存在，使用：

```powershell
git pull
py -m http.server 8000
```

把这个项目文件夹作为本地工作目录打开，再让本地 ChatGPT/Codex 先阅读 `ARCHITECTURE.md`、`VERSION.md` 和本文件，就能接续当前工作。

当前发布版本为 `v1.0.3`：小龙主页、练习战 UI 与可玩基础规则已通过本地测试并已推送到 GitHub。继续工作前，先运行 `git pull` 获取最新版本，再运行 `git status` 确认工作目录状态；不要使用 `git reset --hard` 或覆盖未提交文件。数值应优先修改 `data/battle-balance.json` 和 `data/skills.json`；战斗规则修改放在 `js/battle-engine.js`，页面 `battle.html` 只负责显示和点击交互。

## 日常工作方式

1. 先在本地改文件并用浏览器测试。
2. 测试通过后执行 `git status` 查看改动。
3. 由 Allen 确认后提交并推送：

```powershell
git add .
git commit -m "简短说明本次改动"
git push
```

GitHub Pages 需要一两分钟更新；发布地址为：

`https://debugmode-allen.github.io/Hello-kids-game/`

## 重要边界

- 只提交源码、图片、JSON 内容、文档和 `firestore.rules`。
- 不要提交密码、孩子的真实个人资料或任何私密导出文件。
- Firebase Web 配置可以在网页代码中出现；真正的保护依赖 Firebase Authentication 与 Firestore Rules。
- Firestore Rules 不会随着 Git 推送自动生效：需要在 Firebase Console 手动粘贴 `firestore.rules` 并发布。
- 对战页的场景/战斗名称/背景由 `data/battle-library.json`、`content/battle.zh-CN.json` 与 `assets/battle/battle-assets.json` 共同定义。新增战斗优先增加配置和素材，不要直接在 `battle.html` 写死场景资料。
