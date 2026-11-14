# 版本记录

## v1.0.1 — 本地待验收

记录日期：2026-11-13

- 重写 `index.html`、`journey.html`、`home.html` 与 `admin.html` 为多行可维护结构。
- 固定 UI 文字统一迁移到 `content/ui.zh-CN.json`。
- 故事与龙蛋文字保留在 `content/story.zh-CN.json`。
- 删除旧的“查看我的小龙”模块和旧保存流程，当前孵化流程只使用事务式 `reserveDragonAndSaveAssessment`。
- 增加 `firestore.rules` 规则备份与 `CONTINUATION.md` 交接说明。

本版本尚未推送到 GitHub；请先进行本地验收。

## v1.0.0 — 初始可测试版

记录日期：2026-11-13

- Firebase 三账户登录与管理员/孩子权限分流。
- 三枚原创龙蛋、十只原创小龙及职业资料库。
- 中文、英文、数学共 90 道分级题库。
- 孩子流程：选龙蛋、十题起始测试、选项高亮、龙蛋孵化与随机小龙。
- Firestore 保存小龙与学习摘要。
- Allen 管理页的学习记录概览。
