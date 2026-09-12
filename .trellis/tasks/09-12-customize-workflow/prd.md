# 自定义 Trellis 工作流:16 小时黑客松极速版

## Goal

把 `D:\北大\大二\study\AIIC\9,。12挑战` 项目的 `.trellis/workflow.md` 从 native 模板改成**黑客松极速版**:AI 主导、零仪式、直接开干,所有环节服务于"今晚 24:00 前交齐 4 项交付物"。用户已确认:目标项目 = 9.12挑战;设计由 AI 负责并交用户审。

## Background / Confirmed Facts

- **赛制**:2026-09-12 08:00–24:00 的 16 小时黑客松,做"AI 模拟面试官"(pressurecoach,Next.js 应用)。必交:①3 分钟一镜到底 Demo 视频 ②公网产品链接 ③Product Memo(1–2 页) ④public GitHub 仓库 + README + 清晰 commit history。
- **评分重点**:用户理解、核心功能闭环、可用产品、有效使用 AI、快速迭代、创业者思维。"commit 频繁一点"是明确加分项。
- **用户实际工作方式**(来自并行会话 4812aa77-5f4a,76+ 轮):指令简短("继续"、"我需要"、"把 github 调出来装一个桌面客户端"),AI 全权驱动(讲解、装工具、搭骨架、写代码、部署),用户只在账号/产品方向等真正用户持有的决策上拍板。
- **现状**:9,。12挑战 的 `.trellis/workflow.md` 与黑客松目录完全一致(native 模板);该目录今天 14:26 刚 `trellis init`,只有 `00-bootstrap-guidelines` 一个任务;目录**没有 git 仓库**;有一个并行 Claude 会话正在开发 pressurecoach(其 SessionStart 早于 init,面包屑将在新会话/重启后生效)。
- **技术约束**:`inject-workflow-state.py` 只解析 `[workflow-state:STATUS]` 块,STATUS 标签必须成对匹配,charset `[A-Za-z0-9_-]+`;`[required · once]` 步骤必须在对应面包屑块中有执行约束行;Claude Code 平台 hook 只发 `no_task/planning/in_progress`(inline 变体是 Codex 专属,不启用)。
- **运行时约束**:`task.py start` 在 jsonl 清单只有种子行时拒绝启动(可用 `--allow-empty-context` 或放一条真实 spec 条目绕过)。不改 `.trellis/scripts/`(解析器原则)与 bundled skills(`trellis update` 会覆盖)。

## Requirements

### R1 任务创建门槛(no_task + Request Triage + Phase 1.0)

- 默认**不建任务**:对话、答疑、小改动、快速修复 → 直接做,零仪式。
- 建任务**不需要征求同意**:AI 判断"可独立验证的大块交付"时自行建 lightweight PRD-only 任务(如"部署上线 Vercel"、"Demo 视频脚本"),告知用户即可,建完直接继续。
- 大块交付建议直接当任务追踪,但不强制;一切以不打断节奏为原则。
- 保留:`task.py create` 后直接 `task.py start --allow-empty-context`(或放一条真实 jsonl),不设 review gate。

### R2 规划阶段(Phase 1,压缩)

- 1.0 建任务:可选、自助、无同意门槛(见 R1)。
- 1.1 需求:不搞 brainstorm 仪式。只有**产品方向/用户/取舍**这类用户持有的决策未定时,用最短的一轮问题确认;永远不问流程问题。
- 1.2 研究:主会话直接查,不派研究子代理;有任务时结果写 `research/`。
- 1.3 上下文:跳过 jsonl 策划(极速版走内联);临时派子代理时把必要上下文直接写进 dispatch prompt。
- 1.4 激活:建了任务就立刻 `start`(加 `--allow-empty-context`),不等 review。
- 1.5 完成条件:prd.md 有可测验收即可;design/implement 一律可选。

### R3 执行阶段(Phase 2,内联优先)

- 默认**主会话直接编辑**,不强制 `trellis-implement`/`trellis-check` 子代理。
- 子代理**按需**:仅当 AI 判断能并行(如开发同时派 `trellis-research` 查部署),不设门槛。
- 每个可运行增量:快速验证(dev server / build / lint 过一遍)→ **立即 commit**(比赛看 commit history,不做批量计划、不逐条征求确认;用户随时可打断)。
- 反复调试 → `trellis-break-loop` 保留。

### R4 收尾流程(Phase 3,交付清单化)

- 3.3 spec 更新:**可选**,踩了值得记录的坑才写,保持冲刺节奏。
- 3.4 提交:工作中随做随提;收尾时确认 `git status` 干净 + 已 push(public 仓库是必交项)。
- 3.5 wrap-up:替换为**交付物清单提醒**——①3 分钟一镜到底 Demo 视频(wow moment 放最前) ②公网链接(Vercel,附测试账号说明) ③Product Memo 1–2 页(5 问结构) ④public GitHub + README + commit history;提醒截止 24:00、提前 30 分钟发邮件、预留 1.5 小时录视频+写 Memo。

### R5 技能路由(Active Task Routing + Guardrails 同步)

- 模糊需求 → 直接给方案开干;产品方向级分歧才 brainstorm。
- 实现/检查 → 主会话直接做;并行场景才派子代理。
- 反复调试 → break-loop;spec → update-spec(可选)。

## Acceptance Criteria

- [ ] `9,。12挑战\.trellis\workflow.md` 按 R1–R5 落地,四个部分全部改到位
- [ ] 所有 `[workflow-state:*]` 块标签成对匹配、charset 合法(`task_error`/inline 变体内容不动)
- [ ] 每个 `[required · once]` 步骤在对应面包屑块有执行约束行(新流程下不再必选的步骤已从 walkthrough 移除 `[required]` 标记,保持块与步骤一致)
- [ ] `inject-workflow-state.py` 冒烟测试通过(面包屑能正常解析出新文案)
- [ ] `9,。12挑战\.claude\commands\trellis\{continue,finish-work}.md` 与新流程语义一致(继续路由表无需加行——未引入新 status)
- [ ] 改动前先备份 `workflow.md.bak`(该目录无 git,回滚靠备份)

## Out of Scope

- 不改 Trellis CLI 源码 / npm 包 / node_modules
- 不改 `.trellis/scripts/`(解析器与运行时脚本)
- 不改 bundled skills(`trellis update` 会覆盖)
- 不改黑客松目录的 workflow(用户只选了 9.12挑战)
- 不新增自定义 status / 生命周期 hook(没需求)
