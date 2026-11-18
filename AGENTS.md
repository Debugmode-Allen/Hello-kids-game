# Codex 项目约定

- 开始开发前阅读 `ARCHITECTURE.md`、`VERSION.md` 的当前发布段、`CONTINUATION.md`；按当前任务再查相关页面、模块和 JSON，不要为小改动重复通读整仓库。
- `CONTINUATION.md` 是当前状态的唯一简明交接入口；更新当前任务时只保留已验证事实、未完成事项和下一步。不要把聊天逐字记录复制进来。
- 先确认用户要改的实际页面和现有资料来源，再做范围最小的修改。不要顺手重写无关页面或资源。
- 固定 UI 文案放在 `content/ui.zh-CN.json`；故事和角色介绍放在 `content/story.zh-CN.json`；题目放在 `data/questions/`；平衡数值放在 `data/` JSON。
- Firestore 数据路径和规则变更必须与 `ARCHITECTURE.md` 同步。GitHub 推送不等于 Firebase Rules 部署，汇报时分开说明。
- 图片素材只有被页面或清单引用时才加入提交；未使用的生成稿保留在本地，不混入发布。
- UI 修改后至少检查桌面和窄屏断点；若无法运行真实页面或无法登录，应明确标注未做目视验收，不要声称已验证。
- 不主动发布。用户明确要求发布后，检查 `git status` 和 staged 文件清单，只提交本次功能及其依赖，推送后报告提交号和页面地址。
- 一个功能完成后，更新 `VERSION.md`（若形成版本变化）、`ARCHITECTURE.md`（若结构/数据/权限变化）以及 `CONTINUATION.md`。
