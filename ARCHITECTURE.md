# 小小学习家：开发结构

当前发布版本：`v1.0.6`（战前充能、行动队列与分级题库）

## 页面与路由

- `index.html`：唯一登录入口。Allen 登录后进入 `admin.html`；孩子第一次登录进入 `journey.html`；已经有小龙的孩子进入 `home.html`。
- `journey.html`：龙岛故事、选蛋、分级起始测验、孵化、命名。
- `home.html`：孩子的小龙主页，显示小龙属性和功能入口。
- `assessment.html`：学科水平测验，从小龙主页进入。孩子可将建议的学科等级保存到账户。
- `admin.html`：Allen 的孩子学习记录概览、独立重置功能和小龙属性编辑器。
- `battle.html`：战斗展示层。当前加载“练习战”的场景配置，呈现开场标题、透视阵位、行动顺序、目标选择、爪击和技能一演出、胜负/逃跑总结与自动返回。

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
- `assets/battle/battle-assets.json`：可替换的战斗背景和敌人精灵图清单。
- `data/battle-library.json`：每场战斗的背景、敌人和内容键配置。
- `content/battle.zh-CN.json`：场景名、战斗名称和战斗描述；更换战斗时由配置调用。

新增语言时，复制 `ui.zh-CN.json` 与 `story.zh-CN.json` 后翻译内容；页面逻辑不应因翻译而改动。

## JavaScript 模块

- `js/firebase.js`：唯一 Firebase 初始化点，并统一导出认证和 Firestore 方法。
- `js/i18n.js`：加载 UI 文案并提供 `t(key, values)`。
- `js/account-bar.js`：共享账户名/退出模块。
- `js/assessment.js`：按账户等级抽取战前充能题，以及为孵蛋和学科水平测验动态选题。
- `js/hatching.js`：龙蛋图片、可孵化小龙池和防重复点击锁。
- `js/progress-store.js`：事务式保存测试、进度、小龙和全局小龙占用登记。
- `js/admin-dashboard.js`：管理员重置小龙及清除学习历史。
- `js/battle-engine.js`：纯战斗规则模块；负责阵位保护、速度时间轴、伤害计算、目标合法性、敌人自动行动和胜负状态，不读取 Firebase 或操作页面 DOM。

## 对战模块的顶层设计

对战功能分为三个层次，避免以后换场景、加敌人或接入真实规则时反复修改页面：

1. **资料层**：`assets/battle/battle-assets.json` 登记背景、敌人、行动图标等可替换素材；`content/battle.zh-CN.json` 保存场景名、战斗名和描述。
2. **战斗配置层**：`data/battle-library.json` 的每一场战斗指定 `backgroundId`、敌人列表和文案键。当前 `practice-meadow` 对应“龙岛草原 / 练习战”。
3. **展示与规则层**：`battle.html` 只读取配置并呈现战场；`js/battle-engine.js` 负责速度行动顺序、目标选择、伤害、血量、逃跑与结算。不要把规则写回页面 DOM 代码中。

当前练习战的 UI 约定：左右各五个透视阵位；空位显示浅色虚线椭圆；已有角色悬停时同时显示轮廓和脚下椭圆；顶部显示行动队列；底部为爪击、技能一、预留技能二/三、跳过、逃跑。技能二/三现阶段透明但保留空间，防止操作区布局在后续解锁时跳动。每个角色头顶显示当前/最大 HP 与加粗血条。开场时战斗名以透明背景居中显示三秒，再缩小移动至右上角；爪击会播放攻击者突进、双方震动、爪痕与扣血数字；结束时显示三秒暗背景总结后自动返回主页。

行动队列预览接下来最多十次行动。当前行动者在队首高亮，队列下方标出名字。每次行动结算后，队首图标淡出下落，剩余行动左移，新出现的行动从末尾淡入。

阵位保护规则：L4 保护 L1、L2；L5 保护 L2、L3；右侧以 R4/R5 镜像。普通爪击必须先击败仍在保护目标的前排单位，因此 L2 与 R2 是最安全的位置。未来“穿透”或“范围”技能通过 `obeysFrontlineProtection` 配置决定是否遵守这条规则。

### 技能一与状态

- `data/skills.json` 按龙种 ID 配置技能一及技能参数。火焰龙（`red-fire`）的火焰喷吐是遵守前排保护的单体攻击，基础威力比例为 0.32，爪击为 0.16。灼烧是命中演出。
- 月龙（`purple-moon`）的黑暗术覆盖所有存活敌人，包括受前排保护的单位。战斗引擎按每名目标自己的回合结算持续时间。中术目标的攻击命中率为 0%，仍消耗一个行动。攻击结算后扣减剩余回合。
- 技能按钮图标和透明特效图统一登记在 `assets/battle/battle-assets.json`。动画样式在 `css/battle-effects.css`，由 `battle.html` 依据战斗状态播放。黑暗状态通过翻涌的黑雾、变暗的怪物精灵和血条下的回合标签显示。

### 战前充能与学科水平

- 战前从孩子账户的 `progress/summary` 按年级为中文、英文和数学各抽一题。缺少有效年级时用该科最低级。已配置技能一的龙种每答对一题获得一次使用次数，成功施放后扣除一次。三段圆弧用亮金显示已充能、深灰显示未充能、细铜色余辉显示已用。次数仅保存在本场战斗中。
- 孵蛋测验和单独的学科水平测验共用题库与规则。每科从最低级开始，出六题，每两题调整难度：全对升一级、全错降一级、对一题维持。建议等级以最后实际测到的年级和答题结果为准。
- 水平复测保存时更新账户的三科年级并增加 `level-assessment` 记录，保留原孵蛋测验汇总。数学和英文分别参考[加州数学框架](https://www.cde.ca.gov/ci/ma/cf/documents/mathframeworkch3.pdf)和[加州英文语言艺术标准](https://www.cde.ca.gov/be/st/ss/documents/finalelaccssstandards.pdf)。

## 当前开发阶段与下一步

- 已完成：登录与账户分流、初始测试/孵化/命名、小龙属性与管理员编辑、战斗场景资料库、练习战的可玩基础战斗（爪击、跳过、逃跑、敌人自动行动、胜负结算）。
- 已接入火焰龙和月龙的技能一。
- 下一步建议加入战斗日志和奖励记录，确认规则稳定后再让战斗结果影响小龙成长属性。

## Firestore 数据

`users/{uid}` 仅保存 `name` 和 `role`。

- `users/{uid}/dragon/current`：小龙物种、孩子命名、职业、等级、经验、阶段和四维属性（`attack`、`defense`、`speed`、`stamina`）。新小龙初始值为 10、10、10、100。
- `users/{uid}/progress/summary`：属于孩子账户的各学科等级、经验和答题汇总，不属于小龙属性。
- `users/{uid}/attempts/{attemptId}`：每次测试的题目结果和推荐等级。
- `gameSettings/current`：预留给 Allen 的全局游戏设置。
- `dragonAssignments/{speciesId}`：全局唯一的小龙占用登记，防止不同账户孵化同一物种。

仓库根目录的 `firestore.rules` 是当前规则的备份；修改后仍需手动粘贴到 Firebase Console 的 Firestore Rules 页面并发布。

## 本地运行与验收

在项目根目录运行：

```powershell
py -m http.server 8000
```

打开 `http://localhost:8000/index.html`。修改 `content` 文件后刷新浏览器即可看到文案变化。

本地验收至少检查：登录分流、分级孵蛋测验、孵化与命名、已有小龙进入主页、复测后按新等级抽题、战前充能与扣次数、管理员读取记录、两种重置操作和退出账户。

## 当前安全边界（待以后升级）

孩子浏览器可按 Firestore 规则写入自己的 `dragon` 与 `progress` 数据。这足够用于当前家庭版流程，但技术用户可伪造写入请求。后续应采用受保护的服务端函数验证答案、计算经验与等级，并禁止客户端直接更新成长数据。
