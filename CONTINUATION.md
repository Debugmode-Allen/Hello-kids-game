# 当前开发交接

## 当前发布版本

- GitHub Pages：<https://debugmode-allen.github.io/Hello-kids-game/>
- 发布版本：`v1.2.3`，包含战前能量环充能动画、技能宝石消耗互动、彩虹宝石素材，以及对战模拟页居中能量环和悬停提示。上一版 `v1.2.2`（主页展示区居中修正与开发交接流程；提交 `b915387`）。
- 当前规则备份在根目录 `firestore.rules`。GitHub 推送不会部署 Firebase Rules；线上 Rules 需在 Firebase Console 单独确认。

## 当前工作树

- v1.2.3 功能文件已提交并推送；GitHub Pages 部署后，抽查模拟对战页和战斗页。
- 用户已确认模拟对战页能量环的位置与悬停文案行为符合预期。
- 工作树中仍有未跟踪素材草稿：`assets/battle/actions/energy-reservoir.png` 与 `assets/dragons/thunder-mother-*-v*.png`，不属于 v1.2.3，未发布。

## 下一步

1. 打开 GitHub Pages，确认 v1.2.3 部署完成；抽查选关页中心能量环及战斗中的充能/技能消耗动画。
2. 下一个独立功能从本文件开始，按 `docs/DEVELOPMENT_WORKFLOW.md` 缩小范围。

## 接手规则

先读 `ARCHITECTURE.md`、`VERSION.md`、本文件及 `AGENTS.md`，再按 `docs/DEVELOPMENT_WORKFLOW.md` 只检查当前任务相关文件。旧交接过程在 `docs/archive/CONTINUATION-before-workflow-2026-11-18.md`，可能包含已过期状态，不作为当前事实。
