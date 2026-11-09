# 参考实践

以下是本技能在 2026-10-15 调研中参考的一手资料。技能采用本地“代码侧测试 / 实际运行验证”的划分，并结合用户授权和现有项目规则执行；外部文档是参考材料。

- [Superpowers: Systematic Debugging](https://github.com/obra/superpowers/blob/HEAD/skills/systematic-debugging/SKILL.md)：先调查根因，形成单一假设，最小实验，并依据失败反馈重新定位。
- [Superpowers: Verification Before Completion](https://github.com/obra/superpowers/blob/HEAD/skills/verification-before-completion/SKILL.md)：完成声明绑定当前版本的实际执行证据。
- [Simon Willison: Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/)：先看到测试因目标问题失败，再修改到通过。
- [Simon Willison: Agentic Manual Testing](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)：通过真实应用、接口或浏览器操作发现单测遗漏，并保留操作证据。
- [Anthropic: Best Practices](https://code.claude.com/docs/en/best-practices)：给 agent 可执行、可读取的检验信号，明确验收条件。
- [Claude Academy: Give Claude a Feedback Loop](https://academy.claude.com/courses/ai-native-sdlc-playbook/give-claude-a-feedback-loop)：让测试、构建和视觉反馈贯穿任务，并保护有效检查。
- [Anthropic: Effective Harnesses for Long-running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)：增量推进，真实端到端验证，并留下跨轮可接续记录。
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/)：让 UI、日志与指标对 agent 可访问，将观察能力放入反馈回路。
