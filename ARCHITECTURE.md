# 小小学习家：开发结构

当前本地版本：`v1.0.1`（内容迁移与结构整理，待本地验收）

## 页面与路由

- `index.html`：唯一登录入口。Allen 登录后进入 `admin.html`；孩子第一次登录进入 `journey.html`；已经有小龙的孩子进入 `home.html`。
- `journey.html`：龙岛故事、选蛋、十题起始测试、孵化、命名。
- `home.html`：孩子的小龙与学习能力主页。
- `admin.html`：Allen 的孩子记录概览、独立重置小龙、独立清除学习与测试记录。

每个非登录页面都会由 `js/firebase.js` 自动加载 `js/account-bar.js`，在右上角显示当前账户名和退出按钮。

## 文字与内容规则

固定的界面文案不能直接写在 HTML 或 JS 中：

- `content/ui.zh-CN.json`：按钮、标签、提示、错误信息、管理员文字等 UI 文案。
- `content/story.zh-CN.json`：孩子看到的故事、龙蛋名称和描述。
- `data/question-bank.js`：题目、答案、选项和年级分类；它是题库数据。
- `assets/dragons/dragon-library.json`：小龙名字、元素、职业、描述和图片路径；它是小龙资料库。

新增语言时，复制 `ui.zh-CN.json` 与 `story.zh-CN.json` 后翻译内容；页面逻辑不应因翻译而改动。

## JavaScript 模块

- `js/firebase.js`：唯一 Firebase 初始化点，并统一导出认证和 Firestore 方法。
- `js/i18n.js`：加载 UI 文案并提供 `t(key, values)`。
- `js/account-bar.js`：共享账户名/退出模块。
- `js/assessment.js`：抽取十题并计算建议等级。
- `js/hatching.js`：龙蛋图片、可孵化小龙池和防重复点击锁。
- `js/progress-store.js`：事务式保存测试、进度、小龙和全局小龙占用登记。
- `js/admin-dashboard.js`：管理员重置小龙及清除学习历史。

## Firestore 数据

`users/{uid}` 仅保存 `name` 和 `role`。

- `users/{uid}/dragon/current`：小龙物种、孩子命名、职业、等级、经验和属性。
- `users/{uid}/progress/summary`：各学科等级、经验和答题汇总。
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

本地验收至少检查：登录分流、十题流程、选项高亮、孵化与命名、已有小龙进入主页、管理员读取记录、两种重置操作和退出账户。

## 当前安全边界（待以后升级）

孩子浏览器可按 Firestore 规则写入自己的 `dragon` 与 `progress` 数据。这足够用于当前家庭版流程，但技术用户可伪造写入请求。后续应采用受保护的服务端函数验证答案、计算经验与等级，并禁止客户端直接更新成长数据。
