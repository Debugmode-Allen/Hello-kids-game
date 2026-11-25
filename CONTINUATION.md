# 当前开发交接

## 当前版本与发布

- v1.6.2（2026-11-25）：Kaylee与Jin登录账户。发布分支main，版本存档标签v1.6.2；对应提交以该标签为准。
- 页面：<https://debugmode-allen.github.io/Hello-kids-game/>。GitHub Pages 在推送后自动部署，部署完成状态以 GitHub Actions 为准。
- 本次没有修改或部署 Firestore Rules。2026-11-24已从Firebase Console读取完整已发布规则，与当前仓库统一换行后逐字一致；GitHub 推送不等于 Firebase Rules 发布。

## 账户调整与待确认事项（2026-11-25）

- Firebase Authentication已核对Kelly与Angelina各自UID；Firestore原Kelly资料的name已更新为Kaylee，原UID、邮箱及child角色不变。Angelina不改姓名。
- index.html与content/ui.zh-CN.json将登录显示改为Kaylee，并新增Jin选项，邮箱按既有格式为wang.yilun.allen+jin@gmail.com，纳入v1.6.2发布。
- Jin的Authentication账户已由用户创建并在控制台核对；对应users/{uid}已创建并确认name=Jin、role=parent。尚未做真实登录验收或关联孩子。Kaylee/Angelina密码修改仍待用户确认；密码不写入仓库或交接。
- 浏览器控制策略要求密码修改由用户接管，Firebase Console现有用户仅提供重置邮件入口。Jin的UID/parent资料已核验；用户已明确要求发布登录菜单，已做桌面/390px窄屏选项核对；未做新密码登录验收。

## 已完成与验证

- 草原第一章已有随机迷宫、五组怪物、Boss、经验升级、章节HP和宝箱/治疗水晶。成长上限暂为10级、866累计XP。具体规则见 ARCHITECTURE.md 与 data/ JSON。
- 地图普通怪物单击自动接近后居中确认，320ms内双击直接挑战；Boss始终确认。已探索目标可自动寻路、亮点预览、途中改道或停止；不穿越未知格和未清除事件。满体力/能量保留补给，补能失败不清除宝箱。
- Boss胜利按账号持有记录幂等补发木桩；首次新获得显示图片、属性、作用及五阵位教学，随后飞入村庄的实际伙伴选择槽。伙伴选择槽随持有数量增加，战斗阵位固定五格；仍需手动上阵并确认。已有木桩（含test授予）不重复显示新获得教学，旧通关遗漏可补发。
- 伙伴档案沿用 users/{uid}/adventure/profile，companionIds保存持有列表，pendingCompanionIds/introducedCompanionIds保存待完成/已完成教学。云端事务合并并保留浏览器降级；村庄与战斗合并云端和本地持有记录。
- 战斗双击合法敌人直接爪击，已选技能不会先误放；前排保护、回合、阵亡和动画锁均校验。单击仍执行所选技能。修复窄屏跳过/逃跑按钮重叠。
- 十种技能一图标和十种对应特效文件齐全，本次新增四张按钮图标、七张透明特效。专属演出与状态清理位于 js/battle-skill-effects.js / css/battle-effects.css；全体效果并发，星光从上一目标连续弹射，花露按既有回合结算显示回血，支持减少动态效果。
- 39项自动测试通过。隔离模拟账户完成桌面/390px窄屏的奖励、布阵、地图、双击和七种技能触发检查；验证岩盾到期清除、花露两次回血后清除、弹射起点及临时图层清理。用户已反馈迷宫及快捷爪击可用；这些不等同于助手完成真实登录验收。

## 尚未完成与下一步

1. 真实登录：用未拥有木桩的账户通关Boss，核对云端伙伴档案、刷新恢复、布阵保存及下一场战斗。若线上规则未部署，本地伙伴可见不等于云端允许其上阵。
2. Firestore Rules 已于2026-11-24核对云端与仓库一致，无需重复部署；后续只有实际修改规则时再单独发布。
3. 七种技能在真实账号及实际手机上逐一视听复核；本次已做模拟页面检查，未做全部真实账号验收。
4. 技能加点、物品库存/使用界面与消费规则尚待定义；后续章节未开放。金币、技能点、草原水晶的展示和消耗仍需接入。

## 继续开发与归档

- 接手先读本文、ARCHITECTURE.md、VERSION.md当前发布段和AGENTS.md，按任务查模块。发布流程见 docs/DEVELOPMENT_WORKFLOW.md。
- 图标完整生成提示词：docs/SKILL-ICON-PROMPTS.md；特效完整提示词：docs/SKILL-EFFECT-PROMPTS.md；设计说明：docs/SKILL-ONE-DESIGN.md。
- 本次发布前交接已归档到 docs/archive/CONTINUATION-before-v1.6.1-2026-11-24.md，仅作历史背景。
- 本地运行：python -m http.server 8000，打开 http://localhost:8000/index.html；本地与线上使用同一Firebase项目。
- 未使用的村庄图片v3至v7及旧BGM备份保留本地，不混入发布；本次只上传清单已引用的11张新增图片。
