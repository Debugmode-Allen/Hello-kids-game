# 当前开发交接

## 当前版本与发布

- 版本：v1.6.0（2026-11-23），发布分支 main。
- 页面：<https://debugmode-allen.github.io/Hello-kids-game/>。Git push 后由 GitHub Pages 自动部署，若仍见旧界面请 Ctrl+F5 刷新。
- Firestore Rules：仓库规则已更新，尚未部署到 Firebase Console；GitHub发布不等于规则发布。用户已确认本地布阵保存和实战测试成功。

## 已完成、已确认

- 地图默认定位南部，内部滚动；三个顶层悬浮框位于地图内。
- 村庄当前引用 dragon-village-v8.png；位置/大小由 css/adventure.css 的 .village-scene（left9.9%、top83.52%、width25%）和 .village-houses（scale .65）控制。四组深黑龙影不对称盘旋，上方scale .8、下方1.2。村庄点击进入 village.html。
- 小龙信息页包含技能、布阵、物品三个分页；后排1/2/3、前排4/5。选择队员后放入阵位，确认保存 battleSlot+battleCompanions，下一场战斗采用；蓝色护盾显示当前前排保护范围。
- test默认拥有木桩伙伴，固定攻0/防10/速0/体50，朝右；速度0不行动但可受击并保护后排，倒下后保护解除。授权配置见 data/companions.json。
- 怪物偏好见 data/enemy-behaviors.json；毛毛虫最低防御优先，月光蛾最低HP比例优先；缺省/无效/并列随机，先过滤受保护和阵亡目标。
- 第1世界入口「龙岛草原」位于村庄右侧两河之间。位置在 data/adventure-library.json：left32%、top88.5%、width28%、scale .6。毛毛虫和飞蛾八帧黑影各两组；高亮效果同村庄，点击显示待开放预览。
- 用户已接受目前布局并确认布阵测试成功。助手运行目标选择与伙伴10项回归测试，另用模拟DOM/事务核对了保存、重载、换位、下阵、失败重试、零速度与保护解除。没有声称完成真实登录的桌面/窄屏目视验收。
- 用户已本地试听并将三段 Muse 生成的 WAV 替换为正式 BGM：`assets/audio/bgm/dragon-island-loop.wav`、`study-focus-loop.wav` 与 `battle-loop.wav`。路径和场景映射未变；旧版 `*-old.wav` 仅为未跟踪本地备份，不发布。

## 已发布与后续

1. 已发布：第一章「龙岛草原」完整可测试流程。6×8 迷宫以当前位置沿通路显示最远三格；未清除怪物、Boss、宝箱、治疗水晶和墙都会阻断其后的视线。Boss、宝箱与治疗水晶在迷雾中显示低亮度位置标记；清除怪物或领取奖励后立即重新计算并扩展视野。唯一主路径随机放置五组怪物；每组进入现有战斗页，战斗胜利后才清除该格并按敌人构成写入经验：毛毛虫 3、月光蛾 5。Boss 为两只毛毛虫前排、三只月光蛾后排，共 21 经验，首次胜利授予木桩伙伴。战斗的剩余 HP 回写迷宫；治疗水晶回复最大 HP 50%，宝箱补满神龙能量。`adventure.html` 与 `chapter.html` 已接入龙岛 BGM，宝箱/治疗水晶触发相应音效；冒险结算不再提供无意义的“再打一场”，逃跑结果明确说明不会结算经验且怪物仍在。迷宫快照写入 `adventureRuns/meadow-1`；权限拒绝时章节、奖励和伙伴在本浏览器 `localStorage` 降级保存。
   从龙岛再次进入时，进行中的章节会询问继续挑战或重新生成；已经通关的章节直接开始新的随机地图。
2. 已发布：经验曲线保存在 `data/dragon-progression.json`。当前为 1–30 级、累计经验制，前期每级 30–224 经验，中期 260–724，后期 790–1430；30 级累计门槛为 15,696。`js/dragon-progression.js` 校验矩阵，并在每个怪物组/Boss 结算时以事务同时写入累计 `xp` 和对应 `level`，跨级余量不会丢失。战斗胜利页展示经验条动画；达到门槛会弹出升级面板。每级固定增加攻击、防御、速度各 2 与体力 20。冒险 HP 独立保存于章节快照，非基础体力。
   v1.6.0 已发布：主页小龙资料区显示当前等级与本级经验进度条，数值为当前等级已获得经验/升至下一级所需经验，不显示累计总经验。`data/dragon-progression.json` 的 `maxLevel` 暂设为 10；达到 10 级门槛 866 XP 后经验封顶，后续 11–30 级数据保留。技能基础数值已改为属性系数；直接伤害跟攻击，疗愈/持续疗愈跟攻击与防御，控制/延迟跟攻击与速度，护盾与防御增益跟防御。藤蔓缠绕可越过前排攻击后排。
3. 技能加点、物品库存/使用界面尚未定义，信息页当前为待开放状态；第一章产生的金币、技能点和草原水晶将待该界面接入后展示和消耗。
4. 在云端抽查本版本入口、布阵保存及战斗；单独在 Firebase Console 发布并确认 firestore.rules。助手未取得线上规则部署状态。
5. 补充桌面/窄屏实机视听验收；BGM 已试听替换，需在页面上复核最终效果。
6. 技能一已在本版本发布；剩余四个新增技能图标和七个战斗特效可回家后手动放入 `assets/battle/actions/` 与 `assets/battle/effects/`，再做图片格式和页面目视验收。

## 本次交接记录

- 技能一已映射十种小龙：单体疗愈、全体攻击增益、全体冻结、穿透突刺、全体持续治疗、自身护盾/防御、递减弹射。规则和数值见 `data/skills.json` 与 `docs/SKILL-ONE-DESIGN.md`。
- v1.6.0 发布前已运行 24 项自动化测试：迷宫、冒险奖励、成长上限、伙伴/阵位、目标保护、属性技能系数及藤蔓后排目标均通过。未完成真实登录页面的桌面/窄屏目视验收。

## 素材与日常开发

- 当前引用图片已随版本发布；assets/adventure/village/dragon-village-v3.png 至 v7.png 是未使用的本地草稿，不加入提交，不删除。
- 本地启动：在项目目录运行 py -m http.server 8000，打开 http://localhost:8000/index.html。本地登录使用线上同一个 Firebase 项目。
- 接手先读 ARCHITECTURE.md、VERSION.md、本文及 AGENTS.md；发布流程见 docs/DEVELOPMENT_WORKFLOW.md。
- v1.3.0 发布前交接归档：`docs/archive/CONTINUATION-before-v1.3.0-2026-11-18.md`；本次 v1.4.0 发布前的交接已存为 `docs/archive/CONTINUATION-before-v1.4.0-2026-11-19.md`。
