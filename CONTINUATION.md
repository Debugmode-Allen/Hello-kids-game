# 当前开发交接

## 当前发布版本

- GitHub Pages：<https://debugmode-allen.github.io/Hello-kids-game/>
- 发布版本：`v1.2.4`，新增龙岛冒险总览、裁切后地图背景及主页入口。上一版 `v1.2.3` 包含战前能量环充能动画、技能宝石消耗互动、彩虹宝石素材，以及对战模拟页居中能量环和悬停提示。
- 当前规则备份在根目录 `firestore.rules`。GitHub 推送不会部署 Firebase Rules；线上 Rules 需在 Firebase Console 单独确认。

## 当前工作树

- v1.2.4 功能文件已提交并推送；GitHub Pages 部署后，抽查主页的“冒险”入口与冒险总览地图缩放。
- 用户已确认模拟对战页能量环的位置与悬停文案行为符合预期。
- 已完成未发布音频首版：`assets/audio/` 有 3 段循环 BGM 和 20 段短音效；`data/audio-cues.json`、`js/audio-manager.js` 与 `css/audio-settings.css` 提供资料驱动播放及右下角总开关/BGM/音效音量设置（仅保存在设备 `localStorage`）。战斗已接入答题、能量、爪击、三种技能及结算声音；素材可用 `tools/generate-audio-assets.mjs` 重建。已在本地桌面对战选关页刷新确认声音按钮渲染；尚未完成窄屏实机试听。
- 已完成未发布的冒险总览底图版：`adventure.html`、`css/adventure.css`、`js/adventure-page.js` 以裁切后 `assets/adventure/backgrounds/dragon-island-adventure-map-v6.png` 展示龙岛地图，并按图像实际的 1155×1362 比例缩放；岛屿下半部是宽阔草原，主线路为两条细小河流，整体景观比例较小以凸显岛屿尺度，右下岩地保留多个小型地下城洞穴入口。主页“冒险”入口已接入；页面读取当前小龙名称、等级和经验。当前优先确认地图缩放与版面，因此区域节点和下方预览面板暂时隐藏；关卡、进度、奖励和战斗结算尚未接入。
- 工作树中仍有未跟踪素材草稿：`assets/battle/actions/energy-reservoir.png` 与 `assets/dragons/thunder-mother-*-v*.png`，不属于 v1.2.4，未发布。

## 下一步

1. 打开 GitHub Pages，确认 v1.2.4 部署完成；抽查主页入口与冒险总览在桌面和窄屏下的完整地图缩放。
2. 为冒险模块设计 `data/adventure-library.json`，再接入首张地图的关卡、解锁状态与实际关卡入口；保持关卡配置与展示层分离。
3. 在桌面和窄屏实际试听未发布音频：确认首次交互后才播放、BGM 循环无爆音、音量设置刷新后保留、静音状态下战斗可完整进行；确认后再决定是否发布。

## 接手规则

先读 `ARCHITECTURE.md`、`VERSION.md`、本文件及 `AGENTS.md`，再按 `docs/DEVELOPMENT_WORKFLOW.md` 只检查当前任务相关文件。旧交接过程在 `docs/archive/CONTINUATION-before-workflow-2026-11-18.md`，可能包含已过期状态，不作为当前事实。
