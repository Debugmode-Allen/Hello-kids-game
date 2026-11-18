# 小小学习家：开发结构

当前 GitHub 版本：`v1.2.0`（进阶练习与 11 级五敌人练习）
GitHub Pages 已更新；浏览器端到端验收状态待确认。

## 页面与路由

- `index.html`：唯一登录入口。Allen 登录后进入 `admin.html`；孩子第一次登录进入 `journey.html`；已经有小龙的孩子进入 `home.html`。
- `journey.html`：龙岛故事、选蛋、分级起始测验、孵化、命名。
- `home.html`：孩子的小龙主页，显示小龙属性和功能入口。
- `practice.html`：练习二级页，展示当前账号的小龙、对战模拟、数学/中文/英文练习和课外打卡。
- `subject-practice.html`：共享的五题练习页面，由 `?subject=math|english|chinese` 选择科目。
- `practice-battles.html`：对战模拟选关。龙岛草原和 1 级开放的进阶练习均可玩；进阶练习与 11 级练习采用前排 R4/R5 两只毛毛虫、后排 R1/R2/R3 三只月光蛾的配置。11 级练习要求小龙等级至少为 11。
- `assessment.html`：学科水平测验，从小龙主页进入。孩子可将建议的学科等级保存到账户。
- `admin.html`：Allen 的孩子学习记录概览、当前测试结果编辑、独立重置功能和小龙属性编辑器。
- `battle.html`：战斗展示层。当前加载“练习战”的场景配置，呈现透视阵位、行动顺序、目标选择、技能演出和结算。由选关页进入时，结算提供重打或返回选关；直接进入时结算后自动返回主页。

每个非登录页面都会由 `js/firebase.js` 自动加载 `js/account-bar.js`，在右上角显示当前账户名和退出按钮。

## 文字与内容规则

固定的界面文案不能直接写在 HTML 或 JS 中：

- `content/ui.zh-CN.json`：按钮、标签、提示、错误信息、管理员文字等 UI 文案。
- `content/story.zh-CN.json`：孩子看到的故事、龙蛋名称和描述。
- `data/questions/`：按学科和年级拆分的九份题库。每份文件导出本级题目列表，文件对应关系和添加格式见 `CONTINUATION.md`。
- `data/question-bank.js`：合并九份题库，为 `js/assessment.js` 提供统一的题目结构。战前充能、孵蛋测验和水平复测都通过这套接口抽题。
- `data/battle-balance.json`：伤害软上限、伤害倍率边界、随机范围和速度曲线；调整平衡时优先修改它。
- `data/skills.json`：技能的目标类型、前排保护规则和威力比例；普通爪击当前使用最大体力的 16%。
- `assets/dragons/dragon-library.json`：小龙名字、元素、职业、描述和图片路径；它是小龙资料库。
- `data/parent-dragons.json`：五只家长守护龙的 ID、图片、故事键和主题色；背景介绍放在 `content/story.zh-CN.json`。
- `assets/battle/battle-assets.json`：可替换的战斗背景和敌人精灵图清单。
- `data/battle-library.json`：每场战斗的背景、敌人和内容键配置。
- `content/battle.zh-CN.json`：场景名、战斗名称和战斗描述；更换战斗时由配置调用。

新增语言时，复制 `ui.zh-CN.json` 与 `story.zh-CN.json` 后翻译内容；页面逻辑不应因翻译而改动。

## JavaScript 模块

- `js/firebase.js`：唯一 Firebase 初始化点，并统一导出认证和 Firestore 方法。
- `js/i18n.js`：加载 UI 文案并提供 `t(key, values)`。
- `js/account-bar.js`：共享账户名/退出模块。
- `js/practice-page.js`：练习与选关页面共用的登录校验、当前小龙和等级展示。
- `js/assessment.js`：按账户等级抽取战前充能题、孵蛋/水平测验题及学科练习题。
- `js/hatching.js`：龙蛋图片、可孵化小龙池和防重复点击锁。
- `js/progress-store.js`：事务式保存测试、进度、小龙和全局小龙占用登记。
- `js/admin-dashboard.js`：管理员重置小龙及清除学习历史。
- `js/subject-practice.js`：处理学科练习、整组计分、每日属性奖励和练习历史写入。
- `js/battle-engine.js`：纯战斗规则模块；负责阵位保护、速度时间轴、伤害计算、目标合法性、敌人自动行动和胜负状态，不读取 Firebase 或操作页面 DOM。

## 对战模块的顶层设计

对战功能分为三个层次，避免以后换场景、加敌人或接入真实规则时反复修改页面：

1. **资料层**：`assets/battle/battle-assets.json` 登记背景、敌人、行动图标等可替换素材；`content/battle.zh-CN.json` 保存场景名、战斗名和描述。
2. **战斗配置层**：`data/battle-library.json` 的每一场战斗指定 `backgroundId`、敌人列表、最低小龙等级和文案键。`practice-meadow` 对应“龙岛草原 / 练习战”；`practice-level-11` 是 11 级练习。
3. **展示与规则层**：`battle.html` 只读取配置并呈现战场；`js/battle-engine.js` 负责速度行动顺序、目标选择、伤害、血量、逃跑与结算。不要把规则写回页面 DOM 代码中。

当前练习战的 UI 约定：左右各五个透视阵位；空位显示浅色虚线椭圆；已有角色悬停时同时显示轮廓和脚下椭圆；顶部显示行动队列；底部为爪击、技能一、预留技能二/三、跳过、逃跑。技能二/三现阶段透明但保留空间，防止操作区布局在后续解锁时跳动。每个角色头顶显示当前/最大 HP 与加粗血条。开场时战斗名以透明背景居中显示三秒，再缩小移动至右上角；爪击会播放攻击者突进、双方震动、爪痕与扣血数字；结束时显示暗背景结算页。

行动队列预览接下来最多十次行动。当前行动者在队首高亮，队列下方标出名字。每次行动结算后，队首图标淡出下落，剩余行动左移，新出现的行动从末尾淡入。

阵位保护规则：L4 保护 L1、L2；L5 保护 L2、L3；右侧以 R4/R5 镜像。普通爪击必须先击败仍在保护目标的前排单位，因此 L2 与 R2 是最安全的位置。未来“穿透”或“范围”技能通过 `obeysFrontlineProtection` 配置决定是否遵守这条规则。

### 技能一与状态

- `data/skills.json` 按龙种 ID 配置技能一及技能参数。火焰龙（`red-fire`）的火焰喷吐是遵守前排保护的单体攻击，基础威力比例为 0.32，爪击为 0.16。灼烧是命中演出。
- 月龙（`purple-moon`）的黑暗术覆盖所有存活敌人，包括受前排保护的单位。战斗引擎按每名目标自己的回合结算持续时间。中术目标的攻击命中率为 0%，仍消耗一个行动。攻击结算后扣减剩余回合。
- 叶龙（`green-forest`）的藤蔓缠绕是遵守前排保护的单体技能。基础威力比例为 0.12，命中后将存活目标的下一次行动推迟两个目标自身行动间隔。
- 技能按钮图标和透明特效图统一登记在 `assets/battle/battle-assets.json`。动画样式在 `css/battle-effects.css`，由 `battle.html` 依据战斗状态播放。黑暗状态通过翻涌的黑雾、变暗的怪物精灵和血条下的回合标签显示。

### 战前充能与学科水平

- 战前从孩子账户的 `progress/summary` 按年级为中文、英文和数学各抽一题。缺少有效年级时用该科最低级。已配置技能一的龙种每答对一题获得一次使用次数，成功施放后扣除一次。三段圆弧用亮金显示已充能、深灰显示未充能、细铜色余辉显示已用。次数仅保存在本场战斗中。
- 孵蛋测验共十题，中文、英文各三题，数学四题。主页的学科水平测验共十二题，每科四题。两种测验共用题库，每科从最低级开始，答对升一级、答错降一级。建议等级以实际测到的年级和答题结果为准。
- 答案在确认前可以改选。孵蛋和水平测验确认后计算下一题难度；战前答题点击「提交答案」后锁定选项并显示正确答案或充能结果。
- 水平复测保存时更新账户的三科年级并增加 `level-assessment` 记录，保留原孵蛋测验汇总。数学和英文分别参考[加州数学框架](https://www.cde.ca.gov/ci/ma/cf/documents/mathframeworkch3.pdf)和[加州英文语言艺术标准](https://www.cde.ca.gov/be/st/ss/documents/finalelaccssstandards.pdf)。

## 当前开发阶段与下一步

### 每日学科练习

- 数学练习提升小龙攻击，英文练习提升防御，中文练习提升速度；课外打卡独立影响体力。
- 每组从孩子该科已保存的年级随机抽 5 道不重复题。可以无限完成题组；答题时不显示对错，交卷后才显示 `4/5` 等总分。
- 洛杉矶自然日内，每科第一次达到至少 4/5 时，对应小龙属性 +1；不需家长确认。同一科当天之后可继续练习，但不再加点。
- 练习菜单的学科卡片在小龙当前属性值旁显示本项目累计属性加点（如“攻击力 11 +1”），下一行单独显示累计练习天数与当前连续天数。学科详情页显示本项目累计加点，不显示小龙该属性总值。
- `users/{uid}/trainingDays/{YYYY-MM-DD_subject}` 保存每日题组数、最好/最近成绩及奖励标记。每组 `type: subject-practice` 记录放在 `users/{uid}/attempts/{attemptId}`，包含题组答案、得分、年级、完成时间和该组是否触发奖励。家长端显示题组数及最近五组得分与时间。
- Firestore Rules 将 `trainingDays` 写入限制为当天、有效学科和递增次数，并要求同一事务中建立对应练习历史。用户已报告规则发布且云端测试通过；规则实际部署状态以 Firebase Console 为准。

- 已完成：登录与账户分流、初始测试/孵化/命名、小龙属性与管理员编辑、战斗场景资料库、练习战的可玩基础战斗（爪击、跳过、逃跑、敌人自动行动、胜负结算）。
- 已推送：数学、中文、英文五题练习、每日首个 4/5 奖励、家长练习历史，以及小龙属性总值/基础值/练习贡献拆分显示（GitHub commit `4c35eb9`）。
- 已接入火焰龙和月龙的技能一。
- 对战模拟的 1 级进阶练习和 11 级练习均已配置五敌人阵容。模拟战不发放任务奖励、经验或属性。
- 经验、升级和常规属性成长由冒险模块结算。

### 家长关联、守护龙与课外打卡

- `parent.html` 和 `js/parent-page.js` 负责选择守护龙、申请关联、配置活动及审核打卡。家长只能选择一只守护龙；已被其他家长选中的龙会变暗并标注已被选择。五只都被占用后提示联系开发者增加选项。守护龙选择及背景故事由独立资料/内容文件驱动。
- 守护龙按家长 UID 关联，不按姓名匹配。孩子练习页读取自己的获批 `parentLinks/{childId}`，再用其中的 `parentId` 读取 `parentDragonChoices/{parentId}`，从 `data/parent-dragons.json` 与 `content/story.zh-CN.json` 显示对应图片、名称和背景介绍。解绑后孩子页不再显示；换绑后跟随新家长的选择。
- `parentDragonChoices/{parentId}` 保存家长选定的龙；`parentDragonAssignments/{dragonId}` 是五只守护龙的全局唯一占用登记。家长端以同一 Firestore 事务创建两条记录，规则通过 `getAfter()` 校验二者一致并拒绝重复选择。家长选定后不能自行更改；管理员可在控制台删除对应两条记录以释放选择。
- `parent.html` 和 `js/parent-page.js` 也负责申请关联、配置活动及审核打卡。默认三个活动，可继续增加。孩子从练习页进入 `activities.html` 提交打卡。
- Spark 方案用 Firestore 事务记录申请和审核。主页、练习和战斗按基础体力、新版已确认奖励和未到期的待确认奖励计算有效体力。拒绝或满 168 小时后不再计入该笔奖励。按洛杉矶自然日和活动 ID 去重，历史和打卡连续天数保留。
- `admin.html` 审批关联申请，在孩子卡片上显示已关联的家长，并允许管理员解绑。解绑删除关联记录，保留孩子的小龙与学习记录。
- `practice.html` 和 `js/practice-page.js` 根据孩子当前获批的关联显示家长姓名及所选守护龙；姓名读取关联记录的 `parentName`，图片通过 `parentId` 查找守护龙选择。换绑后以新关联为准。

## Firestore 数据

`users/{uid}` 仅保存 `name` 和 `role`。

- `users/{uid}/dragon/current`：小龙物种、孩子命名、职业、等级、经验、阶段和四维属性（`attack`、`defense`、`speed`、`stamina`）。新小龙初始值为 10、10、10、100。
- `users/{uid}/progress/summary`：属于孩子账户的各学科等级、经验和答题汇总，不属于小龙属性。
- 管理员可以补录或修改孩子的 `progress/summary` 中三科年级及总题数、答对题数。管理员编辑保留各次测验的历史记录，战前抽题读取更新后的年级。
- `users/{uid}/attempts/{attemptId}`：每次测试的题目结果和推荐等级。
- `users/{uid}/attempts/{attemptId}` 中 `type: subject-practice`：学科练习题组成绩及完成时间。
- `users/{uid}/trainingDays/{YYYY-MM-DD_subject}`：按科目和洛杉矶日期保存次数、最高分和每日属性奖励状态。
- 重新孵化小龙时保留 `attempts` 学习历史，并把之前奖励过的数学/英文/中文加点分别还原到新龙的攻击/防御/速度；课外打卡体力奖励从原有打卡记录继续计算。
- `gameSettings/current`：预留给 Allen 的全局游戏设置。
- `dragonAssignments/{speciesId}`：全局唯一的小龙占用登记，防止不同账户孵化同一物种。
- `parentDragonChoices/{parentId}`：家长已选择的守护龙 ID，家长 UID 为文档 ID。
- `parentDragonAssignments/{dragonId}`：守护龙的唯一占用登记，避免多位家长选中同一只。
- `parentRequests/{requestId}`：家长申请和管理员审核历史，每次重提生成独立记录。
- `parentLinks/{childId}`：每个孩子的唯一关联记录。申请时为待审核占位，管理员批准后生效，拒绝或解绑时释放。孩子只可读取自己的已批准关联。
- `users/{uid}/parentActivities/current` 和 `users/{uid}/activityCheckins/{checkinId}`：保存活动设置和每日打卡状态。

仓库根目录的 `firestore.rules` 是当前规则的备份；修改后仍需手动粘贴到 Firebase Console 的 Firestore Rules 页面并发布。

## 本地运行与验收

在项目根目录运行：

```powershell
py -m http.server 8000
```

打开 `http://localhost:8000/index.html`。修改 `content` 文件后刷新浏览器即可看到文案变化。

本地验收至少检查：登录分流、分级孵蛋测验、孵化与命名、已有小龙进入主页、复测后按新等级抽题、战前充能与扣次数、管理员读取记录、两种重置操作和退出账户。三科学练需检查年级抽题、答题中无对错提示、五题后才出总分、同科同日首次 4/5 加 1 点、再次练习不重复加点、家长可查看时间和成绩。家长守护龙需分别检查唯一选择、已选卡片变暗、五只选完后的提示，以及孩子在换绑后显示新家长所选图片。

## 当前安全边界（待以后升级）

孩子浏览器可按 Firestore 规则写入自己的 `dragon` 与 `progress` 数据。这足够用于当前家庭版流程，但技术用户可伪造写入请求。后续应采用受保护的服务端函数验证答案、计算经验与等级，并禁止客户端直接更新成长数据。
