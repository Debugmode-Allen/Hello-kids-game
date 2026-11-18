# 当前开发交接

## 当前发布版本

- GitHub Pages：<https://debugmode-allen.github.io/Hello-kids-game/>
- 发布版本：`v1.2.2`，功能提交 `b915387`，包含主页展示区居中修正、README 与开发交接流程；上一功能版本为 `v1.2.1`（主页/能量功能提交 `d83de12`）。
- 当前规则备份在根目录 `firestore.rules`。GitHub 推送不会部署 Firebase Rules；线上 Rules 需在 Firebase Console 单独确认。

## 当前工作树

- 用户已在手机上验收 v1.2.1，报告可以使用。
- 主页展示区已改为左右对称网格；2026-11-18 在本地默认桌面宽度和 390px 窄屏模拟下复核，小龙中心与展示区中心一致，能量环和左右技能没有遮挡小龙。
- 此发布不包含未跟踪素材草稿；它们未被页面引用。
- 还有未跟踪的旧素材草稿：`assets/battle/actions/energy-reservoir.png` 与 `assets/dragons/thunder-mother-*-v*.png`。它们当前未被发布页面引用，不要随本次主页修正提交。

## 下一步

1. 如需用实体设备确认，打开 `http://localhost:8000/home.html`，检查手机竖屏/横屏下的显示。
2. 若需要继续微调，只改 `home.html` 的 `.showcase` 响应式网格，并重新核对桌面和窄屏。
3. 下一个独立功能从本文件开始，按 `docs/DEVELOPMENT_WORKFLOW.md` 缩小范围。

## 接手规则

先读 `ARCHITECTURE.md`、`VERSION.md`、本文件及 `AGENTS.md`，再按 `docs/DEVELOPMENT_WORKFLOW.md` 只检查当前任务相关文件。旧交接过程在 `docs/archive/CONTINUATION-before-workflow-2026-11-18.md`，可能包含已过期状态，不作为当前事实。
