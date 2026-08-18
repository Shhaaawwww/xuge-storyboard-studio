# Contributing to 叙格

感谢你帮助改进这个开源漫画叙事编译器。

## 开始开发

```bash
npm install
npm run dev
```

提交前运行：

```bash
npm run build
npm test
```

## 贡献原则

- 保持 Story Bible、改编方案、分镜和审核之间的数据边界清晰。
- 上游数据结构发生改变时，同时更新类型、Schema、Demo Provider 和测试。
- AI 修改应先形成可审阅提议，未经用户确认不得覆盖产物。
- 新 Provider 不应把密钥发送到除目标模型服务以外的任何位置。
- 不要提交真实小说、回忆录、API Key 或其他无权公开的数据。

提交 Pull Request 时，请说明修改内容、用户影响、验证方式以及是否改变导出的 JSON 结构。
