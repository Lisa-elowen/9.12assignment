# 执行计划:黑客松极速版 workflow.md

## 有序清单

1. **备份**(先做,唯一回滚手段)
   - `Copy-Item "D:\北大\大二\study\AIIC\9,。12挑战\.trellis\workflow.md" "D:\北大\大二\study\AIIC\9,。12挑战\.trellis\workflow.md.bak"`

2. **改 `9,。12挑战\.trellis\workflow.md`**(按 design.md 映射表,自上而下)
   - Request Triage → no_task 块 → Phase 1 走查+planning 块 → Phase 2 走查+in_progress 块 → Phase 3 走查+completed 块 → Routing → Guardrails
   - 保持:BREADCRUMB CONTRACT 注释、ASCII art、task_error、inline 变体、forks 段、Loading Step Detail

3. **平台文件对齐检查** `9,。12挑战\.claude\commands\trellis\`
   - `continue.md` 路由表:不引入新 status → 不加行;若正文描述与极速版矛盾则轻改描述
   - `finish-work.md`:确认 wrap-up 描述与交付物清单一致,必要时轻改
   - `agents/`、`skills/`、`hooks/`、`settings` 不动

4. **验证**
   - 块标签成对+charset:`grep -n "workflow-state" workflow.md` 人工核对
   - 面包屑解析冒烟:`python .claude/hooks/inject-workflow-state.py` 喂样例 stdin(no_task 场景)确认输出新文案
   - `task.py current --source` 在 9,。12挑战 下运行,确认无解析错误

## 验证命令

```powershell
cd "D:\北大\大二\study\AIIC\9,。12挑战"
python .\.claude\hooks\inject-workflow-state.py   # stdin: {"task_status":"no_task"} 之类的最小输入
python .\.trellis\scripts\task.py current --source
```

## 风险点 / 回滚

- **风险1** 标签不匹配 → 面包屑静默降级为通用提示。缓解:改完 grep 核对。
- **风险2** 删了 `[required]` 但面包屑块还写"必须做X" → AI 行为矛盾。缓解:块与 walkthrough 同步编辑,改完通读一遍。
- **回滚**:`Copy-Item workflow.md.bak workflow.md`(目录无 git,唯一路径)。
- **收尾**:备份文件在任务完成后删除或告知用户保留。

## 事前检查(approval 后、start 前)

- [ ] 用户已批准最终规划摘要
- [ ] jsonl 清单:本次任务在黑客松目录;实施全程内联编辑,不走子代理 → `task.py start --allow-empty-context` 是预期路径(或放一条真实 spec 条目:`.trellis/spec/guides/index.md`)
