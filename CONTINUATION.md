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

当前 GitHub 源码版本为 `v1.2.1`，提交 `d83de12`。本版本包括阵位映射修正、持久能量环、小龙主页技能面板及结构记录。手机端目视验收待用户进行。换电脑后先运行 `git status`；如目录已存在且干净，再执行 `git pull --ff-only`。GitHub Pages 地址：`https://debugmode-allen.github.io/Hello-kids-game/`。数值优先修改 `data/battle-balance.json` 和 `data/skills.json`，战斗规则修改放在 `js/battle-engine.js`。

## 当前接手任务：三科学练

新增通用 `subject-practice.html`，从练习菜单分别以 `?subject=math`、`?subject=english`、`?subject=chinese` 进入。题目通过 `js/assessment.js` 的 `createSubjectPractice()` 从九份分级题库里，按孩子 `progress/summary` 的对应年级随机抽五题。

- 数学答题组提升龙的攻击，英文提升防御，中文提升速度。
- 题组不限次数；只有每科每天首个至少 4/5 的题组奖励对应属性 +1，不需要家长审批。按 `America/Los_Angeles` 自然日独立计算。
- 每题不揭示答案或对错，完成五题后只显示总分/5 和加点说明。
- 练习菜单的三个学科卡片将本项目累计加点（`+N`）放在小龙当前属性值旁边，连续/累计练习天数单独显示在下行；详情页显示“本项目累计 +N”，不显示小龙属性总值。课外打卡原有的连胜/累计点数行继续保留。
- 小龙主页四维属性显示总值和拆分值，例如 `攻击 11（10+1）`、`体力 115（100+15）`；练习页显示基础值加项目贡献，如 `攻击力 10+1`、`体力 100+15`。管理员“重置小龙”会保留练习历史；重新孵化时，已有数学/英文/中文奖励分别加回攻击/防御/速度。
- 每日汇总在 `users/{uid}/trainingDays/{YYYY-MM-DD_subject}`；每组记录复用 `users/{uid}/attempts/{attemptId}`，类型为 `subject-practice`。家长页显示组数和最近五次的成绩及时间。
- `firestore.rules` 的 `trainingDays` 规则随源码提交；用户已报告规则发布并云端测试通过。可继续回归：不足 4/5 后继续练习；同日达到 4/5 后只加一次；当日其他题组不再加点；隔天奖励重新可得；孩子刷新主页属性更新；家长看成绩时间；管理员清除学习历史后练习记录也清空。
- 当前实现是浏览器端评分，规则限制日计数与记录配对，但项目现有的孩子端属性写权限仍允许技术用户篡改自己的数据。要完全防作弊需要后续服务端验证；本功能不引入需付费的 Cloud Functions。

## 已发布：v1.2.0 战斗练习关卡

### 已推送 v1.2.1：阵位映射、能量环与主页技能面板

- `battle.html` 已修正视觉槽位映射：后排是 L1/L2/L3 与 R1/R2/R3；前排是 L4/L5 与 R4/R5。前排第二格 L5/R5 使用原先更靠近中央、尺寸较大的位置；后排第二格 L2/R2 放回远端较小位置。
- 保护规则保持：L4/R4 分别保护 1、2；L5/R5 分别保护 2、3。R2/L2 同时受到两名前排保护。
- 敌方 AI 当前在 `battle.html` 的 `runEnemyTurns()` 里选择 `validTargets(...)[0]`，按单位/阵位顺序选第一个合法目标，不会随机攻击。现在我方只有一只龙，因此只有一个目标；新增队友前再定义优先级。
- 手机端目视验收由用户在 GitHub Pages 完成；需要检查主页响应式布局、能量圆环、技能说明点击及登录退出。
- 已生成透明背景的通用能量槽与能量点 PNG：`assets/battle/actions/energy-reservoir-v2.png` 有十个空槽，`energy-pip.png` 是单点；`assets/battle/battle-assets.json` 已登记。
- `js/energy-meter.js` 按素材中每个环槽中心的百分比坐标定位十点。战前开始时，当前能量环从战场位置飞到题目顶部；答对并提交后，中心播放充能脉冲，目标空槽出现固定位置的能量点；答错不增加。三道题结束后，能量环带着最新数量飞回战场。FLIP 动画按实时矩形尺寸测量，适配不同设备；消费时最后的点退回中心并消失。
- 2026-11-18 根据截图重新校准第 2、3、4、8、9、10 槽的百分比坐标；第 1、5、6、7 槽维持原值。后续反馈第 4、8 槽仍偏低，已将两者再上移 3 个百分点。`battle.html` 的模块查询参数已更新，避免浏览器继续使用旧坐标模块缓存。
- 小龙能量字段为 `users/{uid}/dragon/current.energy`，范围 0–10；新龙初始能量等于十题孵化测验答对数，并用 `energyAssessmentId` 指向同一事务生成的初始测验记录；旧记录首次进入战斗时初始化为 0。答对战前题目后写入 +1（满值不增加），技能按 `data/skills.json` 的 `energyCost` 事务扣除。仓库内 `firestore.rules` 校验初始能量与该测验记录分数一致、能量范围及每次最多 +1；技能允许一次扣除至 0。GitHub 推送不部署 Firestore Rules，线上状态需在 Firebase Console 单独确认。Rules 不能证明客户端提交的答案正确，客户端仍可伪造分数或多次 +1；彻底防作弊需要服务端验证，属于已记录的后续安全问题。

- `practice-battles.html` 第二项“进阶练习”在 1 级开放并可开始，阵容为前排 R4/R5 两只毛毛虫、后排 R1/R2/R3 三只月光蛾；第三项为 11 级练习，达到 11 级后可开始。
- `home.html` 已重排小龙主页：战斗技能与储能环排在小龙两侧；储能环读取 `dragon/current.energy` 并显示 `当前/10`；爪击和按龙种加载的技能一可悬停、键盘聚焦或触摸点击查看说明。技能二、三显示“待进阶后学习”。四个功能入口移动到小龙名称/职业下方、等级资料上方。
- 主页新增加载 `data/skills.json`、`assets/battle/battle-assets.json` 和 `data/battle-balance.json`：技能一图标/名称/描述/消耗从配置及 UI 文案读取；爪击伤害范围按当前体力、爪击比例和战斗随机范围估算，说明提示实际数值还会受双方攻防属性影响。
- 本次主页调整只做了源码与静态格式检查，未做登录后的浏览器目视验收；本地运行后检查桌面和平板宽度、四个入口跳转、能量数量刷新，以及三种有技能小龙的技能一图标和描述。
- 后续界面微调：能量名称改为“神龙能量”，环图尺寸约加倍，`10/10` 数字显示在环中央；技能二、三图标为圆形；技能说明区域固定高度并内部滚动，避免指针选择不同说明时主布局上下跳动。
- 再次调整：隐藏的技能一备用圆形占位曾被通用样式意外显示，已显式对 `[hidden]` 隐藏。小龙图片新增可悬停/聚焦/触摸查看等级、经验、阶段；原三格等级资料卡已从下方移除。
- 11 级阵容保存在 `data/battle-library.json`，前排 R4/R5 为毛毛虫，后排 R1/R2/R3 为月光蛾；战斗名与描述在 `content/battle.zh-CN.json`。
- 战斗页根据 `?battle=practice-level-11` 读取该配置。低于 11 级时会回到选关页；重打链接会保持关卡 ID。
- 本地浏览器端到端验收未执行；发布后请确认选关门槛、五个敌方阵位、开战/重打以及等级不足时的返回行为。

启动本地服务后，从 `http://localhost:8000/index.html` 登录孩子账户，进入「练习 → 对战模拟 → 龙岛草原」。确认练习和选关页显示本账号的小龙与等级。胜利、失败或逃跑后，结算页显示已完成的行动次数和小龙剩余 HP，可重打或返回选关。模拟战不发奖励、经验或四维属性；战前正确答题会持久加能量，技能使用会按配置扣能量。

- Amy 的火焰龙：点击火焰喷吐，再选择可攻击的怪物。检查火焰是否从龙嘴连续延伸到目标，以及灼烧和扣血演出。
- Shirlyn 的月龙：点击黑暗术。检查每只怪物是否出现黑雾、本体变暗和血条下的「黑暗 · 1回合」标签。每只怪物的下一次攻击应该显示 MISS、保持目标 HP，并在结算后移除自己的黑暗效果。
- 战前答对至少一题，再施放技能一。检查亮金圆弧是否变成细铜色。爪击、施法、跳过和怪物攻击后，检查队首图标是否淡出下落，后续图标是否左移，以及队列下方是否显示正确的行动者。
- 分别验证孵蛋 10 题、学科水平测验 12 题和战前充能 3 题。先选一个选项，再改选并提交，确认只按最终选择计分。
- 用 Allen 账号打开管理中心，通过「当前测试结果」补录或修改三科年级与汇总分数。孩子下次进练习战时，题目应按保存的年级抽取。
- 叶龙可用充能施放「藤蔓缠绕」，检查目标脚下藤蔓、伤害和行动队列。存活目标下一次行动应延后两个自己的行动间隔。

## 待接入功能

- 选关页已有龙岛草原、1 级进阶练习和 11 级练习。战斗从 `data/battle-library.json` 按 `battle` 查询参数读取阵容。
- 课外打卡已接入家长配置、孩子提交、家长确认及体力奖励。冒险模块负责经验、等级和常规属性成长。
- 家长关联回归测试：用测试孩子核对管理页和练习页都显示 Sarah，Allen 解绑后刷新确认姓名消失，再验证可重新申请及批准。
- 家长守护龙图片已加入素材库：`thunder-mother.png`、`frost-queen.png`、`embers-lord.png`、`ancestor-of-woods.png`、`star-sea-oracle.png`。名称及背景故事放在 `content/story.zh-CN.json`，清单在 `data/parent-dragons.json`。
- 守护龙选取需用 Sarah 与其他 parent 账户验收：一位家长选定后，其他家长应看到该龙变暗且标记“已被选择”；刷新后选择仍保留；五只全部选完后应提示联系开发者增加选择。选定后的龙按家长 UID 经 `parentLinks/{childId}` 显示在获批关联孩子的练习页。
- `firestore.rules` 中的 `parentDragonChoices` 和 `parentDragonAssignments` 事务校验规则已于 2026-11-17 发布至 Firebase Console 默认数据库；相关网页代码已随 `v1.1.1` 推送至 GitHub。浏览器端到端验收状态仍需确认。

## 手动扩充题库

九个文件统一放在 `data/questions/`。三种答题流程会自动读到文件中的新题。

| 学科 | 最低级 | 中级 | 最高级 |
| --- | --- | --- | --- |
| 中文 | `chinese-grade-1.js` | `chinese-grade-2.js` | `chinese-grade-3.js` |
| 数学（加州） | `math-grade-3.js` | `math-grade-4.js` | `math-grade-5.js` |
| 英文（加州） | `english-grade-3.js` | `english-grade-4.js` | `english-grade-5.js` |

在对应文件的 `export default [ ... ]` 里追加一行。依次填题干、正确答案和三个互不相同的干扰项。选项顺序会在游戏里打乱。

```js
["一（ ）苹果。", "个", "辆", "本", "棵"],
```

用 UTF-8 保存。孵蛋及水平测验会在同一科目、同一年级的不重复题目中抽题，每份文件至少保留四道题。

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

- 七天打卡使用 Spark 和 Firestore，对应权限规则已发布。接手后用测试账户验证提交、确认、拒绝和到期重算，并核对打卡历史及连续天数。旧版记录保留，已发放的奖励不会重复计入。

- 只提交源码、图片、JSON 内容、文档和 `firestore.rules`。
- 不要提交密码、孩子的真实个人资料或任何私密导出文件。
- Firebase Web 配置可以在网页代码中出现；真正的保护依赖 Firebase Authentication 与 Firestore Rules。
- Firestore Rules 不会随着 Git 推送自动生效：需要在 Firebase Console 手动粘贴 `firestore.rules` 并发布。
- 对战页的场景/战斗名称/背景由 `data/battle-library.json`、`content/battle.zh-CN.json` 与 `assets/battle/battle-assets.json` 共同定义。新增战斗优先增加配置和素材，不要直接在 `battle.html` 写死场景资料。
