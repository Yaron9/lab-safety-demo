# 危险源台账 · 后期可填报方案（demo 之外）

## 当前 demo 状态（只读）

本 demo 已吸收教育部《高校实验室重要危险源主要风险清单（试行）》8 大类 48 条政策字典，作为只读演示数据嵌入：

- **字典层**：`admin/mock.js` · `RISK_TAXONOMY_8CLASS` + `KIND_TO_CLASS` + helpers（`class8Of` / `summarize8Class` / `bs8ClassHeatmap`）
- **扩展字段**：`hazardSources[].class8`（向后兼容，可选；未填时用 KIND_TO_CLASS 推断）
- **三端反算**：admin 危险源台账 / bigscreen 热图 / doorplate 巡查模式 全部从同一字典派生

**Demo 边界**：所有数据 mock，所有 dept/student 名虚构，无后端。台账只读、不能新增/修改/删除条目。

### 关于"风险分级 Ⅰ/Ⅱ/Ⅲ"为何不在 demo 内做

教育部 docx 的 48 条只描述「8 大类各自有什么风险类型、应该怎么应对」，**完全没有给"Ⅰ/Ⅱ/Ⅲ 级"的判定标准**。xlsx 模板里那栏「风险分级」是给填报人手填的工程评估字段，不是从 severity (critical/warning/info) 自动推。

早期版本曾把 demo 已有的 severity 字段一一映射成 Ⅰ/Ⅱ/Ⅲ 显示在 UI 上，后续判定为"无依据的政策语言换皮"已删除。Demo 里"严重/关注/一般"三档 severity 是工程语言，不与政策分级混淆。

正式运维版本里，Ⅰ/Ⅱ/Ⅲ 应作为表单字段 + 工程评估流程产出（见下方"表单字段"段）。

---

## 后期正式运维需要补的可填报形态

### 表单字段（按 xlsx 模板还原）

每条危险源登记 = 一行：

| 字段 | 类型 | 来源 |
|---|---|---|
| 实验楼宇 | enum | 学校楼宇登记表 |
| 房间号 | string | 同上 |
| 风险分级 | Ⅰ / Ⅱ / Ⅲ | 工程评估（默认从 severity 推断，可手工覆盖） |
| 风险类别 | 8 大类 enum | `RISK_TAXONOMY_8CLASS` 8 选 1 |
| 危险源具体名称 | string | 自由文本（如「浓硫酸 1 L」） |
| 数量 | int + unit | 默认 1 |
| 自检情况描述 | textarea | 对照 48 条逐条自检后描述 |
| 处置方案 | textarea | 整改时间表 + 责任人 |
| 现场照片 | file[] | 至少 2 张（OSS / 对象存储） |
| 责任人签字 | digital sig | 微信小程序扫码签字 |
| 提交时间 | datetime | 系统戳 |
| 提交人 | userId | 来自登录态 |

### 三层审批链

```
实验室负责人提交
   → 系主任复核（材料化学/物理/工程系 + 测试中心 主任）
      → 学院 HSE 终审（学院安全副院长）
         → 入库 · 进入「在册危险源」
```

每步可"驳回 + 评论"，驳回后回到上一步重新提交。

### 季度复核 + 整改闭环

- 每个登记条目自带「下次复核时间」=登记日 + 90 天
- 到期前 7 天系统派单到巡查员（mp-demo · 巡查任务）
- 巡查员完成现场复核 → 标记「合规 / 需整改」
- 「需整改」自动生成事件（admin · events 表，kind='rectify'）→ 关联实验室 status='rectifying' → 门禁限制
- 整改提交照片 + 描述 → 学院 HSE 验收通过 → 状态恢复 normal

### 与现有数据模型的衔接

- **保存即生成 hazardSource 条目** — 走的是同一个 `hazardSources[]` schema，新增字段 `class8` / `riskGrade` / `count` 已就位（v2 plan 落地）
- **events 联动** — 整改流程 reuse `EVENT_KIND_META.rectify` / `unattended` 等
- **大屏热图** — `summarize8Class()` 会自动把新登记的项目算进去，无需额外计算

### 数据迁移路径

xlsx 当前填报的「附件1-XX学院实验室重要危险源主要风险清单（刘7）」：

1. xlsx → CSV（每行一条 hazardSource）
2. ETL 脚本：把"风险类别"列 → `class8` key；"分级"列 → `riskGrade`；"危险源名称"+"数量" → `name`+`count`
3. 落库后即填充 `MOCK.labs[].hazardSources[]`

---

## 为什么 demo 阶段只做只读？

1. **避免做成"另一个台账软件"** — demo 的核心卖点是"三端联动 + 视觉冲击力"，可填报会喧宾夺主
2. **审批链需要后端** — 无后端意味着无法演示"提交—驳回—复核—入库"完整闭环
3. **甲方接受度** — 政策依据 + 三端可视化已足够说服力，可填报留作"二期"

实际落地时，可填报版本预计：

- 后端：1 个轻量 API（Node/Python，~5 个 endpoint）
- 前端：admin 端新增「危险源登记」+「待审批」两页（~600 行）
- 移动：mp-demo 巡查模块加「现场复核」表单（~200 行）
- 数据库：1 张 `hazard_sources` 表 + 1 张 `audit_log` 表

**预估工作量**：5-7 个工作日（不含审批流引擎对接学校 OA）。
