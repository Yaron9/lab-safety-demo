# 部署与镜像

## 部署矩阵

| 镜像 | URL 形态 | 角色 | 触发 |
|---|---|---|---|
| **GitHub Pages**（主力 · 永久 URL） | https://yaron9.github.io/lab-safety-demo/ | **默认演示入口** · 国内/海外均可访问 | `.github/workflows/pages.yml` push 到 main，~17s |
| EdgeOne Pages（备份镜像） | `https://lab-safety-demo-<slug>.edgeone.cool?eo_token=...&eo_time=...`（3 小时窗口） | GitHub Pages 故障 / 国内某网段临时受限时切换 | `.github/workflows/edgeone.yml` push 自动；需要新 URL 时本地手跑 |

两份产物完全一致（仓库根目录原样发布），portal `/` + 三端 `/admin/` `/mp-demo/` `/doorplate/` 共用同一个 cookie，从 portal 点进任何一端都不用重新认证。

**部署历史背景**：项目早期国内访问 GitHub Pages 不稳定，曾以 EdgeOne 为主力 + 演示前手动重发 URL。2026-05 经用户验证 GitHub Pages 默认域名在国内主流网络已可访问，主备关系翻转至当前状态。EdgeOne SOP 保留作为故障兜底。

## 默认演示链接（甲方拿到的那个）

直接发：`https://yaron9.github.io/lab-safety-demo/`

push 主分支 ~17s CI 自动发布，无需任何手动操作。验证：

```sh
curl -sI https://yaron9.github.io/lab-safety-demo/ | head -1     # 应返回 200
gh run list -R Yaron9/lab-safety-demo --workflow=pages.yml --limit 1
```

## EdgeOne 兜底链接（按需重新部署 · 30 秒 SOP）

**何时跑**：GitHub Pages 出现 404 / CI 卡住 / 用户报某网段访问 yaron9.github.io 不稳定。**正常演示不需要跑**。

```sh
cd /Users/yaron/AGI/lab-safety-demo
TOKEN=$(security find-generic-password -a EDGEONE_API_TOKEN -s tencent-cloud-cli -w)
yes "" | npx -y edgeone pages deploy . -n lab-safety-demo -t "$TOKEN" -e production -a global
```

部署完成（~30s）后，从输出找这一行：
```
EDGEONE_DEPLOY_URL=https://lab-safety-demo-XXXXXXXX.edgeone.cool?eo_token=...&eo_time=...
```

把这个完整 URL（必须含 `?eo_token=...&eo_time=...` query string）发给甲方 / 打成二维码即可。第一次访问会落 cookie，之后 3 小时内在 portal 上点任何一端都直接通。3 小时窗口过期后需要重跑 deploy 拿新 URL。

## 首次开通（已完成，做记录）

第一次需要人工做的两件事（API 不开放代点）：

1. **开通 EdgeOne Pages 服务**：浏览器登录 https://console.cloud.tencent.com/edgeone/pages → 同意服务条款 → 开通
2. **生成 API Token**：同控制台左侧菜单 **API Token** → **新建** → 复制
3. Token 入仓 + 入本地：
   ```sh
   gh secret set EDGEONE_API_TOKEN -R Yaron9/lab-safety-demo --body "<paste-token>"
   security add-generic-password -a EDGEONE_API_TOKEN -s tencent-cloud-cli -w "<paste-token>" -U
   ```

## 日常 push 自动部署

`git push origin main` —— GitHub Pages 和 EdgeOne 同时自动跑。

```sh
# GitHub Pages 日志
gh run list -R Yaron9/lab-safety-demo --workflow=pages.yml --limit 1
# EdgeOne 日志
gh run list -R Yaron9/lab-safety-demo --workflow=edgeone.yml --limit 1
# EdgeOne 历史部署列表（含每次的预览 URL）也在 EdgeOne 控制台 Deployments 页
```

> **注意**：push 触发的 EdgeOne 自动部署生成的预览 URL 只在 GitHub Action 日志里能看到，不会自动通知。如果当下确实要切到 EdgeOne 备份，本地再手跑一次最快——直接从终端拿 URL 且 3 小时窗口从这一刻起算。

## 凭据放哪

| Secret | 存放位置 | 用途 |
|---|---|---|
| `EDGEONE_API_TOKEN` | macOS Keychain (`-s tencent-cloud-cli -a EDGEONE_API_TOKEN`) + GitHub Secret | EdgeOne CLI 部署，CI/CD 主凭证 |
| `TENCENTCLOUD_SECRET_ID` / `_KEY`（CAM）| macOS Keychain (`-s tencent-cloud-cli`) | **一次性测试用，用完即删**——主账号 root 权限不应长期存在 |
| `GITHUB_TOKEN` | Actions 自动注入 | GitHub Pages 部署 |

**仓库里没有任何 token、密钥**。

## 故障回滚

1. **GitHub Pages 故障 / Action 卡住** → 跑上面的 EdgeOne 兜底 SOP 拿一个 3 小时备份 URL 发甲方，同时 `gh run list --workflow=pages.yml --limit 5` 查 CI 状态。
2. **代码本身写坏** → `git revert <bad-sha> && git push`，两处镜像同时回滚。
3. **国内某网段访问 yaron9.github.io 不稳** → 同上切到 EdgeOne 兜底 URL；如长期不稳，再回去把部署矩阵的主备角色翻回来。
4. **EdgeOne 也挂了** → 单 GitHub Pages 继续撑；同时考虑加 Cloudflare Pages 作为第二镜像（不在本仓库当前部署中）。

## 凭据轮换 / 撤销

```sh
# 旋转 EdgeOne API Token（控制台禁用旧 token，新建后）
gh secret set EDGEONE_API_TOKEN -R Yaron9/lab-safety-demo --body "<new-token>"
security add-generic-password -a EDGEONE_API_TOKEN -s tencent-cloud-cli -w "<new-token>" -U

# 删掉 CAM 凭证（demo 跑通后立即做）
# 1. https://console.cloud.tencent.com/cam/capi 禁用 / 删除那对 key
# 2. 本地 keychain 也清掉
security delete-generic-password -a TENCENTCLOUD_SECRET_ID -s tencent-cloud-cli
security delete-generic-password -a TENCENTCLOUD_SECRET_KEY -s tencent-cloud-cli
```

## 别做的

- 不要替换 `.github/workflows/pages.yml`，GitHub Pages 是主力镜像，永远保留。
- 不要删 EdgeOne workflow / 凭证 —— 国内访问 yaron9.github.io 的可用性观察期内保留兜底；至少观察到 2026 年底再评估是否退役。
- 不要在 EdgeOne 国内版上绑自定义域名（要 ICP 备案）。3 小时窗口预览 URL 作为应急兜底完全够用。
- 不要把 EdgeOne API Token 写进任何 commit、CLAUDE.md、README 或文档示例——只通过 keychain / GitHub Secret 引用。
- 不要把 portal 的 `/` 改回 admin —— portal 是给甲方第一眼看的简洁入口，admin 留在 `/admin/`。
