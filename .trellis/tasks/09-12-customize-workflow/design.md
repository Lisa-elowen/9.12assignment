# 设计:黑客松极速版 workflow.md

## 架构与边界

- **唯一主目标**:`D:\北大\大二\study\AIIC\9,。12挑战\.trellis\workflow.md`
- **同步目标**:`9,。12挑战\.claude\commands\trellis\continue.md` / `finish-work.md`(只在与新流程矛盾时轻改描述;路由表不动——未引入新 status)
- **不动**:`.trellis/scripts/`(解析器)、bundled skills、`.claude/agents/`(保留,供按需派遣)、`.claude/hooks/` + settings(解析逻辑不变)
- 面包屑是 hook 每轮解析 workflow.md 的动态产物 → 改文件即生效(当前并行会话的 SessionStart 上下文已固化,新流程作用于其后新会话/重启后的每轮提示)

## 区块级改动映射(workflow.md)

| 区块 | 改动 |
|---|---|
| `Request Triage` | 三条规则 → 两条:默认不建任务直接做;大块交付 AI 自助建 lightweight 任务(无需同意) |
| `[workflow-state:no_task]` | 重写:不要求 consent,直接分类执行;只有产品方向级决策未定才问用户 |
| `[workflow-state:planning]` | 重写:prd 极简、无 review gate、跳过 jsonl 策划、建了任务立刻 `start --allow-empty-context` |
| `[workflow-state:in_progress]` | 重写:主会话内联编辑 → 快速验证 → 立即 commit;子代理仅按需并行;保留 dispatch prompt 首行 `Active task: <path>` 约定(按需派遣时仍用) |
| `[workflow-state:completed]` | 微调:指向交付物清单收尾(见 R4) |
| `Phase 1 walkthrough (1.0–1.5)` | 同步压缩;`[required · once]` 只保留 1.1(需求)与 1.4(激活,仅当建了任务);其余改 optional 或删除 |
| `Phase 2 walkthrough (2.1–2.3)` | 2.1 主会话直接实现;2.2 快速验证+立即 commit;2.3 保留(prd 缺陷回退路径不变) |
| `Phase 3 walkthrough (3.2–3.5)` | 3.3 spec 改可选;3.4 改为"随做随提+收尾确认 push";3.5 换成交付物清单+截止时间提醒 |
| `Active Task Routing` | Claude Code 组:实现/检查 → 主会话直接做(按需才派子代理) |
| `Guardrails` | 同步为极速版三条 |
| 不动 | `WORKFLOW-STATE BREADCRUMB CONTRACT` 注释块、Phase Index ASCII art、`task_error` 块、`planning-inline`/`in_progress-inline` 块(Codex 专属)、`Customizing Trellis (for forks)` 段落、`Loading Step Detail` |

## 关键不变量(必须保持)

1. 每个 `[workflow-state:X]…[/workflow-state:X]` 标签成对、同字串、charset `[A-Za-z0-9_-]+`
2. 面包屑块覆盖所有走查步骤:删掉 `[required]` 标记的步骤不再被强制 → 块与 walkthrough 同步编辑(regression.test.ts 的不变量)
3. 3.4 提交提醒在 in_progress 块中仍可达(现在是"立即 commit"内联规则,天然覆盖)
4. `Active task:` dispatch prompt 首行约定保留(按需派遣时 hook 上下文仍依赖它)

## 数据流 / 契约

- hook(`.claude/hooks/inject-workflow-state.py`)每轮读 workflow.md → 按 `task.json.status` 选块 → 注入 `<workflow-state>`。无状态→`no_task`;planning→`planning`;in_progress→`in_progress`。块内容就是我们写的话术。
- `task.py start` 拒绝空 jsonl → 极速版流程固定用 `--allow-empty-context`(或 add-context 一条真实 spec)。

## 兼容性 / 影响

- 并行会话:settings.json 在 init 时已写,hook 生效于新会话或重启后的每轮;当前会话的 SessionStart 上下文不受影响。
- 黑客松目录的 workflow.md 不动(用户只选 9.12挑战)。
- 该目录无 git → 备份 `workflow.md.bak` 是唯一回滚手段;实施第一步就是备份。

## 权衡记录

- **放弃规划仪式**:16 小时赛制下 review gate 的机会成本 > 收益;产品方向级决策仍保留用户拍板(评分标准第 1 条)。
- **放弃强制子代理**:主会话内联在单产品冲刺里更快更省;子代理能力保留为按需并行(研究/检查可临时用)。
- **commit 免确认**:评分明确要"频繁 commit";用户随时可打断。若用户在实施后表示不适,可加回"commit 前一句话告知"。
- **spec 更新改可选**:比赛项目 spec 价值低,但踩坑时仍可记(break-loop/update-spec 保留为按需)。
