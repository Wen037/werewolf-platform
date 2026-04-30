# Werewolf Platform — 2026-04-30 Session Summary

---

# Session 1 — 后端测试 & Bug 修复

## 测试结果总览
- **113 / 117 PASS**（4 条为预期行为说明，非真正失败）
- 发现并修复 **5 个 Bug**
- 测试报告：`werewolf_platform/BACKEND_TEST_PLAN.html`

## 已修复的 Bug

| # | 文件 | 问题 | 修复方式 |
|---|---|---|---|
| 1 | `shared/infra/email.ts` | Resend 模块加载时初始化，dotenv 未运行时崩溃 | 懒加载 + test 模式直接 return |
| 2 | `shared/middleware/rateLimiter.ts` | `max` 在 dotenv 前求值，始终为 10 | 改为每请求调用的函数 |
| 3 | `player-spaces/coreLogic/PlayerSpaceService.ts` | 无交互记录时 `myInteraction` 被省略 | 返回默认值 `{ isLiked: false, isSubscribed: false, myRating: undefined }` |
| 4 | `matches/coreLogic/MatchService.ts` | `leaveMatch` 同一次 update 同时 `$pull` + `$push` | 拆成两次独立的 `findByIdAndUpdate` |
| 5 | `matches/DTOs/MatchDTOs.ts` | `min_pax` `.min(4)` 阻止创建小局 | 改为 `.min(2)` |

## 新增 API 端点

| 端点 | 说明 |
|---|---|
| `GET /api/games/:sessionId` | 获取单个比赛详情（optionalAuth） |
| `GET /api/venues/:id/sessions` | 获取某场地下所有比赛（optionalAuth） |

## 完整路由表

### Auth
```
POST /api/auth/register        → 200 { message }
POST /api/auth/verify-otp      → 201 { token, user:{id,username,email,role,rank,skillLevel} }
POST /api/auth/login           → 200 { token, user:{...} }
```
> ⚠️ 登录失败返回 **401**，不是 400

### Users
```
GET    /api/users/me                  requireAuth  → 完整 profile
PATCH  /api/users/me                  requireAuth  → 更新 skillLevel / bio / notifPreferences / telegramChatId
GET    /api/users/:id                 optionalAuth → { ...user, isFollowedByMe }
POST   /api/users/:id/follow          requireAuth  → 200 { message }
DELETE /api/users/:id/follow          requireAuth  → 200 { message }
GET    /api/users/me/events           requireAuth  → [ GameSessionResponseDTO ]
```

### Venues (Player Spaces)
```
GET  /api/venues                      optionalAuth → [ VenueDTO ]
GET  /api/venues/:id                  optionalAuth → VenueDTO
POST /api/venues                      requireAuth  → 201 VenueDTO  (每用户最多 3 个)
POST /api/venues/:id/like             requireAuth  → { isLiked }   (toggle)
POST /api/venues/:id/subscribe        requireAuth  → { isSubscribed } (toggle)
POST /api/venues/:id/rate             requireAuth  → 200           (rating: int 1–5)
GET  /api/venues/:id/sessions         optionalAuth → [ GameSessionResponseDTO ]
```

### Matches / Games
```
GET    /api/games/active              optionalAuth      → [ GameSessionResponseDTO ]
GET    /api/games/:sessionId          optionalAuth      → GameSessionResponseDTO
POST   /api/games                     requireAuth       → 201 GameSessionResponseDTO  (7天限3个)
POST   /api/games/:id/join            requireAuth       → { wasWaitlisted, waitlistPosition }
DELETE /api/games/:id/leave           requireAuth       → { message }
POST   /api/games/:id/like            requireAuth       → { isLiked } (toggle)
POST   /api/games/:id/rate            requireAuth       → 200
PATCH  /api/games/:id/status          requireAuth(host) → { message }
PATCH  /api/games/:id/external-pax    requireAuth(host) → { message }
PATCH  /api/games/:id/attendance      requireAuth(host) → { message }
POST   /api/games/:id/invite          requireAuth(host) → { message }
```

### Notifications
```
GET   /api/notifications              requireAuth → [ NotificationDoc ]
GET   /api/notifications/unread-count requireAuth → { count }
PATCH /api/notifications/:id/read     requireAuth → { message }
PATCH /api/notifications/read-all     requireAuth → { message }
```

## Response DTO 形状

### GameSessionResponseDTO
```typescript
{
  id, hostId, venueId, title, date,        // ISO datetime
  maxPlayers, currentPlayers, waitlistCount, minPax, externalPax,
  status: "open" | "playing" | "finished",
  gameType, judgeMethod,
  proficiencyRequired: number,             // 0–4
  proficiency: string,                     // "All Welcome"|"Newbie"|"Intermediate"|"Advanced"|"Expert"
  totalLikes, hostName?, venueName?,
  myInteraction?: {
    userId, sessionId,
    status: "registered" | "attended" | "no-show" | "cancelled",
    isLiked, myRating?, punctuality?, waitlistPosition?
  }
}
```

### GameVenueResponseDTO
```typescript
{
  id, ownerId, name, address, description, imageUrl, type,
  coordinates: { lat, lng },              // 注意：lng 不是 long
  isVerified, pricePerHour, amenities, rules?,
  averageRating, totalLikes, totalSubscribers,
  myInteraction?: { isLiked, isSubscribed, myRating? }  // 有 token 时一定存在
}
```

## EventBus 通知

| 触发事件 | 通知 type | 接收者 |
|---|---|---|
| 有人加入你的局 | `MatchJoined` | 房主 |
| 候补晋升正式玩家 | `WaitlistPromoted` | 被晋升者 |
| 局状态改变 | `MatchStatusChanged` | 所有玩家 |
| 被房主邀请 | `MatchInvited` | 被邀请者 |

## 状态码约定

| 场景 | 状态码 |
|---|---|
| 成功创建 | 201 |
| 成功操作 | 200 |
| 验证失败 / 业务规则 | 400 |
| 未登录 / 凭证错误 | 401 |
| 资源不存在 | 404 |
| 频率限制 | 429 |

---

# Session 2 — 前后端集成

## 新增文件

| 文件 | 说明 |
|---|---|
| `client/src/services/api.ts` | 统一 HTTP 客户端：自动带 Bearer token，401 时清 token 并跳首页 |
| `client/src/services/auth.service.ts` | 注册 / OTP验证 / 登录 / 登出 |
| `client/src/services/game.service.mock.ts` | 全部 mock 实现，供 `USE_MOCK = true` 使用 |

## 修改文件

| 文件 | 改动 |
|---|---|
| `client/src/services/game.service.ts` | 顶部 `USE_MOCK` 开关 |
| `client/src/components/AuthModal.tsx` | 注册改为 email+username+password → OTP 两步流程 |
| `client/src/components/layout/AppLayout.tsx` | 用 AuthService 替换 mock 登录状态；Logout 接入 |
| `client/src/components/CreateEventModal.tsx` | 场馆列表从 `GET /api/venues` 拉取 |
| `client/src/pages/MyEventsPage.tsx` | 用 event.venueName / hostName 替换 mock 查找 |
| `client/src/pages/MyProfilePage.tsx` | skill/bio 更新接入真实 API |

## Mock 模式开关

```typescript
// client/src/services/game.service.ts 第一行
const USE_MOCK = true;   // false = 真实 API
```

Mock 数据：`client/src/data/mockDB.ts` + `game.service.mock.ts`

## Auth 流程

```
注册：email + username + password → POST /api/auth/register（发 OTP）
      → 输入 OTP → POST /api/auth/verify-otp → 存 localStorage → 刷新
登录：email + password → POST /api/auth/login → 存 token → 刷新
登出：清 localStorage → 跳转 /
```

Token 有效期 7 天，所有请求自动带 `Authorization: Bearer <token>`。

---

# Session 3 — VenueDetailPage 活动抽屉

## 修改文件

| 文件 | 改动 |
|---|---|
| `client/src/types/index.ts` | `GameSessionDTO` 新增 `venueAddress?` 和 `pricePerHour?` |
| `client/src/data/mockDB.ts` | 12 场比赛补充 `proficiency` + `description` |
| `client/src/services/game.service.mock.ts` | `getSessionsByVenue` 附加场馆信息 |
| `client/src/pages/VenueDetailPage.tsx` | 完整重写，新增抽屉组件 |

## 新增组件

- **`ProficiencyBadge`** — 颜色编码技能等级徽章
- **`UpcomingCard`** — 即将举行活动卡片（状态、标题、Join 按钮）
- **`PastCard`** — 历史活动卡片（地址、价格、出席数）
- **`EventsDrawer`** — 右侧滑入抽屉（framer-motion spring，点击遮罩关闭）

统计数字卡改为 `<button>`，Upcoming → Coming Events 抽屉，Past → Event History 抽屉。

---

# Session 4 — Bug 修复 + Debug Panel

## Bug 修复

| Bug | 原因 | 修复 |
|---|---|---|
| Login 按钮黑屏 | `href="/login"` 跳转不存在路由 | 改为 `onClick` 弹出 AuthModal |
| My Events / Profile 不显示 | 依赖登录状态，Login 坏则无法登录 | Login 修好后自动恢复 |

**文件**：`client/src/components/layout/AppLayout.tsx`

## Debug Panel（DEV 模式）

右下角浮动 `🐛 Debug` 按钮，仅 `import.meta.env.DEV` 时渲染。

- 一键切换 4 个测试账号（写入假 token 到 localStorage）
- 显示当前登录账号 + Logout 按钮

| 账号 | 角色 | 技能 |
|---|---|---|
| AlphaWolf (u1) | player | Expert |
| SeerSally (u2) | player | Advanced |
| ModeratorMike (u8) | admin | Expert |
| NoobHunter (u3) | player | Beginner |

---

# Session 5 — Homepage 视差场景调参 + 视觉调整

## Scene Tuner（DEV 模式）

**文件**：`client/src/pages/HomePage.tsx`

左下角 **⚙ Tune Scene** 按钮，展开 268px 左侧面板：
- **Global**：`LERP`、`EDGE_GLOW`、`MOON_GLOW`、`FIRE_SPD`、`BLINK_SPD`、`BGTREE_H`
- **L1–L7 每层**：`vis`（visibility）、`spd`、`scale`、`groundY`、`slope`、`alpha`、`tint`、`bright`、`SHIFT`；L3 Campfire 额外 `bowlDepth`、`bowlW`
- 滑块 + 数字输入框，实时 mutate `C`，动画循环下一帧生效
- **Copy C**（绿）：序列化当前 `C` 到剪贴板
- **Reset**（红）：恢复硬编码默认值并清除 localStorage

### LocalStorage 持久化
- 模块加载时自动 merge `localStorage["hp_scene_config"]` 进 `C`，首帧即生效
- 每次调整自动写入，无需手动保存
- Reset 清除 localStorage

## 视觉调整（最终结果）

### 默认 C 配置（当前固化值）

| 层 | 参数 | 值 |
|---|---|---|
| Global SHIFT[1] | Sky 视差偏移 | 0.235 |
| L1 Sky | bright | 1.33 |
| L2 Forest | scale | 0.74 |
| L2 Forest | groundY | 0.72 |
| L3 Campfire | groundY | 0.975 |
| L3 Campfire | tint | -10 |
| L5 Wolves | scale | 1.1 |
| L5 Wolves | groundY | 0.975 |
| L5 Wolves | tint | -42 |
| L6 Fog | groundY | 0.56 |
| L7 NearTree | alpha | 0.96 |
| L7 NearTree | tint | -16 |

### 狼的调整

| 项目 | 最终值 |
|---|---|
| 左狼高度 | `H * 0.57 * sc`（原 0.38，放大 150%）|
| 右狼高度 | `H * 0.525 * sc`（原 0.35，放大 150%）|
| 右狼 X 位置 | `W * 1.08 + wdw * 0.5 + ox`（原始基础右移半个身位）|

### 其他
- 移除 `drawForest` 中的眨眼动画（`eyeDefs` 血红/黄色眼睛）
- `beginLayer(i)` 新增 `if (!L.visible) { ctx.globalAlpha = 0; return; }` 支持 vis 开关

## Git 规范（本次确认）
- 身份：`Wen037 <e1062715@u.nus.edu>`，不加 Co-Authored-By
- 分支命名：kebab-case 描述性，本次分支 `feat/homepage-dev-tuner`

---

# 待完成事项（当前状态）

## 前端页面接入（USE_MOCK = true 期间）
- [ ] LobbyPage：`getActiveGames()` 展示 + join/leave 按钮
- [ ] VenueDetailPage：subscribe、rate 按钮接入
- [ ] GameSpacePage：`getAllVenues()` 展示 + 交互按钮
- [ ] MyEventsPage：like/rate 实际调用 API
- [ ] CreateEventModal：「Create Event」接入 `POST /api/games`
- [ ] MyProfilePage：LogOut 按钮接入 `AuthService.logout()`
- [ ] 全局：未登录访问需 auth 页面时弹出 AuthModal

## 切换真实 API
- [ ] 将 `USE_MOCK` 改为 `false`，删除 `mockDB.ts` 和 `game.service.mock.ts`
- [ ] 配置 Resend 真实 API Key，测试 OTP 邮件
- [ ] 配置 Telegram Bot Token，测试通知
- [ ] `NODE_ENV` 改回 `development`

## 部署（Railway）
- [ ] 创建 Railway 项目，连接 GitHub repo
- [ ] 设置环境变量：`NODE_ENV=production`、`MONGO_URI`、`JWT_SECRET`、`FRONTEND_URL`、`RESEND_API_KEY`、`TELEGRAM_BOT_TOKEN`、`FROM_EMAIL`
- [ ] 更新 frontend `VITE_API_URL` 指向 Railway URL
