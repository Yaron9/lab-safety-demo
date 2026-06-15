# 实验室安全管理系统 demo

中国地质大学（北京）材料科学与工程学院 · 实验室安全管理 demo（演示用，非生产）

三端联动展示，**一个入口 URL** 通到全部三端：

```
/             → Portal（导航页，三端入口）
  ├─ /admin/      → Web 管理控制台（HSE）
  ├─ /mp-demo/    → 微信小程序 H5 模拟（师生 / 实验室管理员）
  └─ /doorplate/  → 电子门牌（1080×1920 竖屏 kiosk）
```

## 给甲方的 URL

| 用途 | URL |
|---|---|
| **国内访问 · 主推**（每次演示前重新部署、3 小时窗口） | 见 `docs/deploy-mirror.md` 的「演示前重新部署」流程 |
| **海外 / 兜底**（永久） | https://yaron9.github.io/lab-safety-demo/ |

> 国内默认走 EdgeOne Pages 的 `*.edgeone.cool` 预览链接（带 `eo_token`，3 小时合规窗口）。每次演示前跑一次 `npx edgeone pages deploy` 即拿到新 URL。三端共用同一个 cookie，从 portal 点进去任意端都不用重新认证。GitHub Pages 在国内打不开但海外稳定，是兜底备份。

## 各端能力

### Web 管理控制台（`/admin/`）

侧边栏分三组：

- **日常**：今日待办 · 事件中心 · 指挥大屏
- **台账**：实验室 · 危险源 · 实验项目 · 人员 · 安全培训 · 危化品 / 资产
- **系统**：统计与报表 · 扣分细则 · 关于系统

指挥大屏左上角「安全实时监控」是飞机驾驶舱风格 PPI 雷达，8 间实验室作为 blip 显示在雷达上。「扣分细则」页对应学院《实验室违规扣分细则及处理办法（试行）》PDF，5 类 40 条规则可在线编辑（写 localStorage）。

### 微信小程序（`/mp-demo/`）

3 角色分端，登录后单机切换；首页可切「多机预览」一屏看 10 屏故事线。

- **学生**：实验预约 / 扫码进门 / 安全培训 / 违规申诉 / 整改 · 三类申报（实验项目 / 危化品采购 / 夜间实验）+ 废液固废报备
- **教师**：审 5 类「学生实验申请」（预约 / 危化品 / 实验项目 / 采购 / 夜间），自己做实验复用学生 book / scan，含「我的学生」与教师消息中心
- **实验室管理员**（PDF 落地后由原"巡查员"扩权而来）：违规登记 / 申诉复核 / 整改验收 / 废液接收 / 巡查记录

### 电子门牌（`/doorplate/`）

1080×1920 竖屏 Android 一体机，10 个状态切换：

空闲 / 使用中 / 高风险作业 / 整改中（停用）/ 关闭维护 / 扫码识别中 / 识别成功 / 识别失败 / 紧急事件 / **检查模式**（URL `?mode=inspect` 触发，展开危险源完整台账）

含实验室名 + 状态徽章 + 责任人电话 + 危险类别 + 在场人员 + 实时危化品台账 + QR 扫码 + 人脸识别取景框 + 底部 PERIOD POINTS 仪表带（当前 6 月记分周期累积扣分）。

### 电子门牌 APK（Capacitor）

APK 只打包电子门牌端，不包含 `/admin/` 与 `/mp-demo/`：

- `doorplate/index.html`：Web 预览页，保留状态切换工具栏、自动轮播与设备外框，方便浏览器验收 10 个状态。
- `www/index.html`：APK 专用入口，启动后只显示全屏门牌 kiosk 内容。
- `www/vendor/`：本地化 React / ReactDOM / Babel，避免 APK 运行时依赖 unpkg CDN。
- `android/`：Capacitor Android 工程；原生亮度桥接在 `android/app/src/main/java/cn/edu/cugb/materials/doorplate/DoorplateBridgePlugin.java`。

APK 演示操作：

- 默认全屏显示电子门牌。
- 右上角连续点击 5 次，打开隐藏状态菜单。
- 支持 `free` / `busy` / `high` / `rect` / `closed` / `scan` / `success` / `fail` / `alert` / `inspect` 10 个状态。
- 选择状态后立即切换，并持久化到 `localStorage.dd-scene`。
- URL 调试支持 `?scene=alert` 指定状态，`?mode=inspect` 进入检查模式。

APK 息屏策略（面向海康威视门禁终端试装）：

- 1 分钟无触摸 / 点击 / 按键 / 移动后，Web 层显示全黑遮罩。
- 同时调用原生 `DoorplateBridge.sleep()`，将当前 Activity 亮度降到最低。
- 任意触摸 / 点击 / 按键 / 移动会调用 `DoorplateBridge.wake()`，恢复亮度并回到门牌。
- 这是普通 APK 兼容方案；真正关闭屏幕电源仍需后续结合海康设备权限、设备管理员模式或厂商 SDK 实测。

## 数据基准与单一来源

- 三端 mock 同步到 `today: '2026-04-21'`（admin/mp-demo/doorplate）。
- 扣分规则与计算唯一来自 `lib/scoring-rules.js`（IIFE 暴露 `window.SCORING`）；UI 内禁止 hardcode 分值。
- 个人 0→12 分触发挂牌；实验室 0→60 分触发关停整改；6 月记分周期（春 3.1–8.31 / 秋 9.1–次年 2.28）。

## 技术栈

React 18 UMD + Babel standalone + 单一 styles.css，无构建工具。Portal 是纯 HTML/CSS，无 JS。三端共享 `lib/scoring-rules.js`。

APK 打包补充：

- 根目录 `package.json` / `capacitor.config.json` 管理 Capacitor。
- `www/` 是 APK Web 资源目录，不要在 `/doorplate/` 下运行 Capacitor。
- 同步 Android 资源：`npx cap sync android`。
- 构建与调试：用 Android Studio 打开 `android/` 后 Run / Build APK。
- 命令行构建需 JDK 21；JDK 17 太低，JDK 25 对当前 Gradle / Android Gradle Plugin 组合过新。
