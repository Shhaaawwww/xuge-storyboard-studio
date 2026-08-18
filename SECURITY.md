# Security Policy

## Secrets and local data

叙格支持在本机明文保存模型配置。真实 API Key 和用户创作内容不属于开源仓库的一部分。

- 不要提交 `data/`、`.env`、`.env.*`、日志、证书或私钥。
- `.env.example` 只能包含空值或无效的示例值。
- 不要在 Issue、Pull Request、截图和测试夹具中粘贴真实凭据。
- 如果凭据曾经进入聊天、日志或 Git 历史，请在服务商后台撤销并轮换；仅从文件中删除并不足够。

## Reporting a vulnerability

请不要为尚未修复的安全漏洞创建公开 Issue。请通过仓库所有者 GitHub Profile 中提供的私密联系方式报告，并附上复现步骤、影响范围和建议修复方式。

收到报告后，维护者应先确认影响和修复方案，再协调公开披露。
