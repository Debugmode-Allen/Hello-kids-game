# 当前开发交接

## 当前版本与发布

- 版本：v1.3.0（2026-11-18），发布分支 main；版本存档标签 v1.3.0。
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

## 尚未完成与下一步

1. 技能加点、物品库存/使用规则尚未定义，信息页当前为待开放状态。
2. 草原入口尚未连接实际冒险关卡；接下来定义关卡、解锁、进度、经验及成长奖励，继续使用配置与规则分层。
3. 在云端抽查本版本入口、布阵保存及战斗；单独在 Firebase Console 发布并确认 firestore.rules。助手未取得线上规则部署状态。
4. 补充桌面/窄屏实机视听验收，音频首版尚有试听待办。

## 素材与日常开发

- 当前引用图片已随版本发布；assets/adventure/village/dragon-village-v3.png 至 v7.png 是未使用的本地草稿，不加入提交，不删除。
- 本地启动：在项目目录运行 py -m http.server 8000，打开 http://localhost:8000/index.html。本地登录使用线上同一个 Firebase 项目。
- 接手先读 ARCHITECTURE.md、VERSION.md、本文及 AGENTS.md；发布流程见 docs/DEVELOPMENT_WORKFLOW.md。
- 本次发布前过程已归档到 docs/archive/CONTINUATION-before-v1.3.0-2026-11-18.md，不代表当前状态。
