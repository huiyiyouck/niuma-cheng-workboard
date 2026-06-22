# niuma-cheng-workboard

牛马程生态的跨项目 Agent 工作看板。

本项目读取配置文件中显式接入的项目，按项目类型解析团队工作流文档和 `niuma-cheng-coordination` 跨项目真源，为 Owner 提供只读的项目总览、接入诊断、角色状态、跨项目需求和阻塞关系视图。

## 当前状态

- 立项定位：已定稿，见 `docs/progress/ad-hoc/2026-06-17-workboard-positioning.md`
- 团队工作流：已从 `claude-workflow` 复制 baseline / templates / 入口文件
- 实现状态：待 Developer 开发第一版 MVP

## 第一版边界

- 本地 Node 服务 + 静态前端
- 不引入数据库
- 不做登录权限
- 不编辑、不回写被监控项目文件
- 通过 `projects.config.json` 显式接入项目
- 提供接入诊断视图

## 下一步

以 Developer（开发工程师）角色实现第一版只读看板。
