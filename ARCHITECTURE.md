# 小小学习家：开发结构

当前版本：`v1.0.0`（初始可测试版）

## 当前页面

- `index.html`：登录入口；按角色跳转页面。
- `journey.html`：孩子的龙岛故事、选蛋、起始测试与孵化流程。
- `admin.html`：Allen 的设置与孩子学习记录概览。

## 模块与职责

- `js/firebase.js`：唯一的 Firebase 初始化与数据库访问入口。
- `content/ui.zh-CN.json`：短小的界面操作文字。
- `content/story.zh-CN.json`：面向孩子的故事文字；未来可单独制作英文版本。
- `data/question-bank.js`：按学科和年级分类的题库。
- `assets/eggs/`：龙蛋图片。
- `assets/dragons/`：小龙图片与 `dragon-library.json` 描述资料。

## Firestore 数据

`users/{uid}` 仅保存 `name`、`role`。

- `users/{uid}/dragon/current`：小龙、名字、职业、等级、经验与属性。
- `users/{uid}/progress/summary`：各学科等级、经验与答题汇总。
- `users/{uid}/attempts/{attemptId}`：每次测试的题目结果与推荐等级。
- `gameSettings/current`：Allen 的全局游戏设置。

## 当前开发顺序

1. 完成 `journey.html` 的孵化动画与重复点击保护。
2. 将测试计算、孵化保存拆到 `js/assessment.js` 与 `js/hatching.js`。
3. 将管理员数据读取拆到 `js/admin-dashboard.js`。
4. 增加 `home.html`，作为孩子完成孵化后的长期学习主页。

## 发布规则

所有功能先用 `py -m http.server 8000` 本地验证；只有 Allen 确认后才运行 Git 提交与推送。
