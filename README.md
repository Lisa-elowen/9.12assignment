# PressureCoach · AI 压力面试教练

> 在正式面试前,让 AI 模拟一次真实高压面试,找到你的失分点,并训练你在压力下稳定表达。

**16 小时项目挑战作品**(题目:AI 模拟面试官)

## 我们解决的问题

准备大厂实习面试 / 保研复试的学生普遍面临:找不到人对练、得不到针对性反馈。
但更隐蔽的问题是:**"我知道答案,但在压力下没有表现出来。"**

传统 AI 面试产品只回答"你答得对不对";PressureCoach 回答"**你在压力下表现如何**":

- 你在第几轮、被哪种问题击穿?
- 崩溃时你的语言发生了什么变化(模糊词激增、回答变短、结构丢失)?
- 下一次训练应该练什么?

## 核心闭环

```
选场景 → 进面试舱(6轮动态追问)→ AI 分析表达变化 → 生成压力体检报告 → 针对性训练
```

## 功能

- **3 种面试场景**:大厂实习综合面 / 保研复试 / 项目深挖
- **2 种压力模式**:普通模拟 / 压力模拟(连续追问·挑战观点·要求具体化)
- **AI 动态追问**:面试官围绕你粘贴的简历/项目描述生成问题,并逐轮追问
- **限时作答**:每轮倒计时,压力模式逐段收紧(90s→60s),超时自动交卷并计入压力曲线——时间压迫本身就是训练
- **语音回答**:基于浏览器 Web Speech API,免费实时转写(Chrome/Edge)
- **压力体检报告**:
  - 三维评分:表达稳定性 / 逻辑组织能力 / 压力恢复能力
  - **压力曲线**:逐轮压力指数(模糊词密度 + 回答长度变化 + 追问强度),峰值即触发点
  - **崩溃点回放**:模糊词高亮显示失分瞬间
  - **针对性训练任务**:根据弱项生成下一次训练目标
- **训练历史**:localStorage 本地保存,不依赖账号系统

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15(App Router)+ React 19 + Tailwind CSS 4 |
| AI 面试官 | LLM API(OpenAI 兼容格式,豆包 / DeepSeek 等),服务端代理调用 |
| 语音 | Web Speech API(免费,无需 ASR 服务) |
| 压力分析引擎 | 自研语言信号分析(模糊词库 + 结构词库 + 逐轮退化检测),纯本地计算 |
| 数据 | localStorage(MVP,后续可换 Supabase) |
| 部署 | Vercel |

## 运行方式

```bash
npm install
cp .env.example .env.local   # 填入 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
npm run dev                  # http://localhost:3000
```

**未配置 API Key 也能运行**:自动降级为内置脚本的演示模式(离线题目 + 启发式评分),完整闭环不受影响。

### 环境变量

| 变量 | 说明 |
|---|---|
| `LLM_BASE_URL` | OpenAI 兼容接口地址,如 `https://ark.cn-beijing.volces.com/api/v3`(豆包) |
| `LLM_API_KEY` | API 密钥 |
| `LLM_MODEL` | 模型名,如 `doubao-1-5-pro-32k-250115` / `deepseek-chat` |

## 设计取舍(刻意不做的)

- ❌ 摄像头情绪识别:隐私 + 不准确 + 开发成本高;语言信号已能反映压力变化
- ❌ 题库 / 答案生成:市场已有大量工具,不是差异化价值
- ❌ 账号系统 / 社区 / 排行榜:非核心价值,MVP 用 localStorage
- ❌ 全岗位覆盖:先聚焦本科生重要面试一个高价值场景,做深做窄

## 目录结构

```
app/
  api/chat/route.ts   # LLM 面试官服务端代理
  page.tsx            # 状态机:首页 → 配置 → 面试 → 报告
components/
  Home.tsx Setup.tsx Interview.tsx Report.tsx PressureChart.tsx
lib/
  analysis.ts         # 压力分析引擎(评分/曲线/触发点/建议)
  offline.ts          # 离线演示模式脚本
  prompts.ts          # 面试官系统提示词
  speech.ts           # Web Speech API 封装
  store.ts            # localStorage 训练历史
```

## License

MIT
