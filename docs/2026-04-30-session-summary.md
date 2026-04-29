# Session Summary — 2026-04-30
# Werewolf Platform: Backend Testing & Bug Fixes

---

## 本次 Session 目的
对后端所有 API 进行完整自动化测试，修复发现的 Bug，为下一步前后端集成做好准备。

---

## 测试结果总览
- **113 / 117 PASS**（4 条为预期行为说明，非真正失败）
- 发现并修复 **5 个 Bug**
- 测试报告：`werewolf_platform/BACKEND_TEST_PLAN.html`（浏览器打开查看）

---

## 已修复的 Bug

| # | 文件 | 问题 | 修复方式 |
|---|---|---|---|
| 1 | `shared/infra/email.ts` | Resend 在模块加载时初始化，dotenv 未运行时崩溃/挂起 | 懒加载 (`let _resend = null`) + test 模式直接 return |
| 2 | `shared/middleware/rateLimiter.ts` | `max` 在 dotenv 前求值，始终为 10（非 test 的 1000） | 改为每请求调用的函数：`max: (_req, _res) => NODE_ENV === 'test' ? 1000 : 10` |
| 3 | `player-spaces/coreLogic/PlayerSpaceService.ts` | 已登录用户无交互记录时，`myInteraction` 被 JSON.stringify 省略 | 返回默认值 `{ isLiked: false, isSubscribed: false, myRating: undefined }` |
| 4 | `matches/coreLogic/MatchService.ts` (`leaveMatch`) | MongoDB 报错：同一次 `findByIdAndUpdate` 对 `players` 同时 `$pull` + `$push` | 拆成两次独立的 `findByIdAndUpdate` |
| 5 | `matches/DTOs/MatchDTOs.ts` | `min_pax` Zod schema `.min(4)` 阻止创建小局（max_pax=3 不可能通过） | 改为 `.min(2)` |

---

## 新增的 API 端点

| 端点 | 说明 |
|---|---|
| `GET /api/games/:sessionId` | 获取单个比赛详情（optionalAuth，有 token 时含 myInteraction） |
| `GET /api/venues/:id/sessions` | 获取某场地下的所有比赛（optionalAuth） |

---

## 完整路由表

### Auth
```
POST /api/auth/register        → 200 { message }
POST /api/auth/verify-otp      → 201 { token, user:{id,username,email,role,rank,skillLevel} }
POST /api/auth/login           → 200 { token, user:{...} }
```
> ⚠️ 登录失败（密码错/邮箱不存在）返回 **401**，不是 400

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
GET  /api/venues                      optionalAuth → [ VenueDTO ]  (有 token 时含 myInteraction)
GET  /api/venues/:id                  optionalAuth → VenueDTO      (有 token 时含 myInteraction)
POST /api/venues                      requireAuth  → 201 VenueDTO  (每用户最多 3 个)
POST /api/venues/:id/like             requireAuth  → { isLiked }   (toggle)
POST /api/venues/:id/subscribe        requireAuth  → { isSubscribed } (toggle)
POST /api/venues/:id/rate             requireAuth  → 200           (rating: int 1–5)
GET  /api/venues/:id/sessions         optionalAuth → [ GameSessionResponseDTO ]  ← 新增
```

### Matches / Games
```
GET    /api/games/active              optionalAuth      → [ GameSessionResponseDTO ]
GET    /api/games/:sessionId          optionalAuth      → GameSessionResponseDTO        ← 新增
POST   /api/games                     requireAuth       → 201 GameSessionResponseDTO    (7天限3个)
POST   /api/games/:id/join            requireAuth       → { wasWaitlisted, waitlistPosition }
DELETE /api/games/:id/leave           requireAuth       → { message }
POST   /api/games/:id/like            requireAuth       → { isLiked } (toggle)
POST   /api/games/:id/rate            requireAuth       → 200  (rating: int 1–5)
PATCH  /api/games/:id/status          requireAuth(host) → { message }
       body: { status: "Open"|"Started"|"Completed"|"Cancelled" }
PATCH  /api/games/:id/external-pax    requireAuth(host) → { message }
       body: { count: int ≥ 0 }
PATCH  /api/games/:id/attendance      requireAuth(host) → { message }
       body: { attendees: [{ userId, status:"attended"|"no-show", punctuality?:"punctual"|"late" }] }
POST   /api/games/:id/invite          requireAuth(host) → { message }
       body: { userIds: string[] }
```

### Notifications
```
GET   /api/notifications              requireAuth → [ NotificationDoc ]
GET   /api/notifications/unread-count requireAuth → { count }
PATCH /api/notifications/:id/read     requireAuth → { message }
PATCH /api/notifications/read-all     requireAuth → { message }
```

---

## Response DTO 形状（前端集成关键）

### GameSessionResponseDTO
```typescript
{
  id: string
  hostId: string
  venueId: string
  title: string
  date: string                  // ISO datetime
  maxPlayers: number
  currentPlayers: number
  waitlistCount: number
  minPax: number
  externalPax: number
  status: "open" | "playing" | "finished"   // 后端已映射，非原始 "Open"/"Full"
  gameType: string
  judgeMethod: string
  proficiencyRequired: number   // 0–4
  proficiency: string           // "All Welcome"|"Newbie"|"Intermediate"|"Advanced"|"Expert"
  totalLikes: number
  hostName?: string
  venueName?: string
  myInteraction?: {
    userId: string
    sessionId: string
    status: "registered" | "attended" | "no-show" | "cancelled"
    isLiked: boolean
    myRating?: number
    punctuality?: "punctual" | "late"
    waitlistPosition?: number
  }
}
```

### GameVenueResponseDTO
```typescript
{
  id: string
  ownerId: string
  name: string
  address: string
  description: string
  imageUrl: string
  type: string
  coordinates: { lat: number; lng: number }   // 注意：lng 不是 long
  isVerified: boolean
  pricePerHour: number
  amenities: string[]
  rules?: string
  averageRating: number
  totalLikes: number
  totalSubscribers: number
  myInteraction?: {             // 有 token 时一定存在（默认 false，不会缺失）
    isLiked: boolean
    isSubscribed: boolean
    myRating?: number
  }
}
```

### Validation Error 格式 (Zod)
```json
{
  "message": "Validation error",
  "errors": {
    "fieldErrors": { "fieldName": ["reason"] }
  }
}
```

---

## Frontend 集成注意事项

### URL 差异（需要改 frontend service）

| Frontend 目前调用 | 后端实际路由 | 处理方式 |
|---|---|---|
| `/api/games/my-events` | `/api/users/me/events` | 改 frontend `game.service.ts` |
| `/api/users/me/profile` | `/api/users/me` | 改 frontend `user.service.ts` |
| `PATCH /api/users/me/skill-level` | `PATCH /api/users/me` | 合并成单个 PATCH，body 含 `skillLevel` |
| `PATCH /api/users/me/bio` | `PATCH /api/users/me` | 合并成单个 PATCH，body 含 `bio` |
| `/api/venues/:id/sessions` | `/api/venues/:id/sessions` | ✅ 已实现，直接可用 |

### Token 处理
- JWT 存储：建议 `localStorage`（或 `sessionStorage`）
- 所有需要 auth 的请求加 header：`Authorization: Bearer <token>`
- Token 过期时间：7 天（`JWT_EXPIRES_IN=7d`）

### 状态码约定
| 场景 | 状态码 |
|---|---|
| 成功创建 | 201 |
| 成功操作 | 200 |
| 验证失败 / 业务规则 | 400 |
| 未登录 / 凭证错误 | 401 |
| 资源不存在 | 404 |
| 频率限制 | 429 |

---

## EventBus 通知（前端轮询 `/api/notifications`）

| 触发事件 | 通知 type | 接收者 |
|---|---|---|
| 有人加入你的局 | `MatchJoined` | 房主 |
| 候补晋升为正式玩家 | `WaitlistPromoted` | 被晋升者 |
| 局状态改变（Started / Completed / Cancelled） | `MatchStatusChanged` | 所有玩家 |
| 被房主邀请 | `MatchInvited` | 被邀请者 |

---

## 待完成事项

### 近期（前后端集成）
- [x] 替换 `client/src/services/` 中的 mock 数据为真实 API 调用
- [x] 实现 JWT token 的存储、读取、自动附加到请求
- [x] 处理 401 响应（跳转到登录页）
- [x] 修正上表列出的 URL 差异

### 中期
- [ ] 配置 Resend 真实 API Key，测试 OTP 邮件
- [ ] 配置 Telegram Bot Token，测试 Telegram 通知
- [ ] 将 `NODE_ENV` 改回 `development`（集成完成后）

### 部署（Railway）
- [ ] 创建 Railway 项目，连接 GitHub repo
- [ ] 设置环境变量：`NODE_ENV=production`, `MONGO_URI`(Atlas), `JWT_SECRET`, `FRONTEND_URL`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `FROM_EMAIL`
- [ ] 更新 frontend `VITE_API_URL` 指向 Railway URL

---

## 文件变更记录（Session 1：后端测试）

```
server/src/shared/infra/email.ts                          — Bug 1 fix
server/src/shared/middleware/rateLimiter.ts               — Bug 2 fix
server/src/modules/player-spaces/coreLogic/
  PlayerSpaceService.ts                                   — Bug 3 fix
server/src/modules/matches/coreLogic/MatchService.ts      — Bug 4 fix + 新增 getMatchById / getMatchesByVenue
server/src/modules/matches/DTOs/MatchDTOs.ts              — Bug 5 fix + PROFICIENCY_TO_LABEL + proficiency 字段
server/src/modules/matches/routes/matchRoutes.ts          — 新增 GET /games/:sessionId
server/src/modules/player-spaces/routes/
  playerSpaceRoutes.ts                                    — 新增 GET /venues/:id/sessions
server/src/app.ts                                         — CastError/ValidationError → 400
client/src/types/index.ts                                 — 补充 optional 字段
werewolf_platform/BACKEND_TEST_PLAN.html                  — 完整测试报告（新建）
werewolf_platform/docs/2026-04-30-session-summary.md      — 本文件
```

---

---

# Session 2 — 2026-04-30：前后端集成 (Frontend-Backend Integration)

## 本次 Session 目的

将 client 从纯 mock 数据切换为调用真实后端 API，同时保留 mock 模式开关方便前端持续调试。

---

## 新增文件

| 文件 | 说明 |
|---|---|
| `client/src/services/api.ts` | 统一 HTTP 客户端：自动带 `Authorization: Bearer <token>`，401 时清 token 并跳首页 |
| `client/src/services/auth.service.ts` | 注册 / OTP验证 / 登录 / 登出，token 存 `localStorage` |
| `client/src/services/game.service.mock.ts` | 保留全部 mock 实现，供 `USE_MOCK = true` 时使用 |

## 修改文件

| 文件 | 改动 |
|---|---|
| `client/src/services/game.service.ts` | 顶部 `USE_MOCK` 开关；`false` → 调真实 API，`true` → 用 mock |
| `client/src/components/AuthModal.tsx` | 注册改为 email+username+password → OTP 两步流程，接入 AuthService |
| `client/src/components/layout/AppLayout.tsx` | 用 `AuthService` 替换 `MOCK_IS_LOGGED_IN` / `MOCK_USER_NAME`；Logout 接入 |
| `client/src/components/CreateEventModal.tsx` | 场馆列表改为从 `GET /api/venues` 拉取 |
| `client/src/pages/MyEventsPage.tsx` | 用 `event.venueName` / `event.hostName` 替换 mock 查找，移除 mockDB import |
| `client/src/pages/MyProfilePage.tsx` | skill/bio 更新接入真实 API，移除 mock 场馆查找 |

---

## Mock 模式开关

**位置：** `client/src/services/game.service.ts` 第一行

```typescript
const USE_MOCK = true;   // ← 改 false = 真实 API，true = mock 数据
```

Mock 数据存放：`client/src/data/mockDB.ts` + `client/src/services/game.service.mock.ts`

**何时删除 mock：** 前端页面全部调试完成后，将 `USE_MOCK` 改为 `false` 并删除：
- `client/src/data/mockDB.ts`
- `client/src/services/game.service.mock.ts`

---

## Auth 流程（已实现）

```
注册：填 email + username + password → POST /api/auth/register（发 OTP）
         → 输入 6 位 OTP → POST /api/auth/verify-otp（返回 token + user）
         → 存 localStorage → 刷新页面

登录：email + password → POST /api/auth/login → 存 token → 刷新页面

登出：清除 localStorage → 跳转 /
```

Token 有效期 7 天，所有需要 auth 的请求自动带 `Authorization: Bearer <token>`。

---

## 待完成事项（前端精修阶段）

### 前端（USE_MOCK = true 期间调试）
- [ ] LobbyPage：`getActiveGames()` 展示 + join/leave 按钮接入
- [ ] VenueDetailPage：`getVenueById()` + `getSessionsByVenue()` + like/subscribe/rate 接入
- [ ] GameSpacePage：`getAllVenues()` 展示 + 交互按钮接入
- [ ] MyEventsPage：like/rate 实际调用 API（handleLike 目前只改 local state）
- [ ] CreateEventModal：「Create Event」按钮接入 `POST /api/games`
- [ ] MyProfilePage：LogOut 按钮 UI 接入 `AuthService.logout()`
- [ ] 全局：未登录用户访问需要 auth 的页面时弹出 AuthModal

### 切换真实 API 后
- [ ] 将 `USE_MOCK` 改为 `false`，删除 mockDB.ts 和 game.service.mock.ts
- [ ] 配置 Resend 真实 API Key，测试 OTP 邮件
- [ ] 配置 Telegram Bot Token，测试 Telegram 通知
- [ ] 将 `NODE_ENV` 改回 `development`

### 部署（Railway）
- [ ] 创建 Railway 项目，连接 GitHub repo
- [ ] 设置环境变量：`NODE_ENV=production`, `MONGO_URI`(Atlas), `JWT_SECRET`, `FRONTEND_URL`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `FROM_EMAIL`
- [ ] 更新 frontend `VITE_API_URL` 指向 Railway URL

---

# Session 3 — 2026-04-30：VenueDetailPage 活动抽屉 (Slide-over Drawer)

## 本次 Session 目的

为 VenueDetailPage 右侧操作卡的「Upcoming / Past Events」统计数字添加可点击功能：
点击后从右侧滑出抽屉，展示该场地的完整活动列表及详情。

---

## 修改文件

| 文件 | 改动说明 |
|---|---|
| `client/src/types/index.ts` | `GameSessionDTO` 新增 `venueAddress?: string` 和 `pricePerHour?: number` |
| `client/src/data/mockDB.ts` | 12 场比赛全部补充 `proficiency` + `description` 字段 |
| `client/src/services/game.service.mock.ts` | `getSessionsByVenue` 附加 `venueName` / `venueAddress` / `pricePerHour` |
| `client/src/pages/VenueDetailPage.tsx` | 完整重写，新增抽屉组件及可点击统计卡 |

---

## 新增组件（均在 VenueDetailPage.tsx 内）

### `ProficiencyBadge`
颜色编码的技能等级徽章：
| 等级 | 颜色 |
|---|---|
| All Welcome | 绿色 |
| Newbie | 天蓝 |
| Intermediate | 琥珀 |
| Advanced | 橙色 |
| Expert | 红色 |

### `UpcomingCard`
即将举行活动卡片，包含：
- 状态徽章（OPEN / FULL）+ 技能等级 + 日期时间
- 活动标题、主持人
- 活动描述（若有）
- 玩家数量 + Join 按钮（满员时自动 disabled）

### `PastCard`
历史活动卡片，包含：
- FINISHED 徽章 + 技能等级 + 日期时间
- 活动标题
- 场地地址 + 每小时价格（`$X/hr`）
- 主持人、活动描述
- 到场人数 + 点赞数

### `EventsDrawer`
从右侧滑入的抽屉面板：
- `framer-motion` spring 动画（damping 28, stiffness 260）
- 半透明黑色遮罩，点击关闭
- 顶部 sticky 标题栏 + ✕ 关闭按钮
- 根据 `kind` 切换渲染 UpcomingCard / PastCard 列表

---

## 右侧操作卡变更

统计数字卡从 `<div>` 改为 `<button>`，点击触发抽屉：
- **Upcoming（红色数字）** → 打开 Coming Events 抽屉
- **Past Events（白色数字）** → 打开 Event History 抽屉
- Hover 效果：背景加亮 + 数字颜色过渡

---

## Like 按钮升级

`handleLike` 从纯本地 state 更新改为：
1. 乐观更新 UI（立即响应）
2. 调用 `GameService.likeVenue(id)`
3. 失败时回滚到原状态

---

## Mock 数据补充（proficiency + description）

| ID | 标题 | 技能等级 |
|---|---|---|
| g1 | Friday Night Bloodbath | Advanced |
| g2 | SG League Qualifiers | Advanced |
| g6 | Bugis Brawl Night | All Welcome |
| g7 | Full Moon Ritual | Intermediate |
| g8 | Deduction Masters Vol.3 | Expert |
| g9 | Vintage Wolves Night | All Welcome |
| g3 | Yishun Chaos Night | Intermediate |
| g4 | Beginner Friendly Game | Newbie |
| g5 | Silent Mode: No Talking | Advanced |
| g10 | Midnight Logic Duel | Expert |
| g11 | Cocktails & Conspiracies | All Welcome |
| g12 | The Silent Hunt | Intermediate |

---

## 待完成事项更新

### 前端（USE_MOCK = true 期间调试）
- [x] VenueDetailPage：活动抽屉 (Slide-over Drawer) 完成
- [x] Login 黑屏 Bug 修复
- [x] 开发调试 Debug Panel 添加
- [ ] VenueDetailPage：like/subscribe/rate 按钮全部接入（subscribe、rate 尚未实现）
- [ ] LobbyPage：`getActiveGames()` 展示 + join/leave 按钮接入
- [ ] GameSpacePage：`getAllVenues()` 展示 + 交互按钮接入
- [ ] MyEventsPage：like/rate 实际调用 API
- [ ] CreateEventModal：「Create Event」按钮接入 `POST /api/games`
- [ ] MyProfilePage：LogOut 按钮 UI 接入 `AuthService.logout()`
- [ ] 全局：未登录用户访问需要 auth 的页面时弹出 AuthModal

---

# Session 4 — 2026-04-30：Bug 修复 + Debug Panel

## Bug 修复

### 1. Login 按钮黑屏
- **原因**：Login 侧边栏链接 `href="/login"` 跳转到不存在的路由，导致空白页
- **修复**：改为 `onClick` 弹出 `AuthModal`（与首页行为一致）
- **文件**：`client/src/components/layout/AppLayout.tsx`

### 2. My Events / My Profile 不显示
- **原因**：`visible: isLoggedIn`，Login 黑屏导致无法登录，所以看不到
- **修复**：Login 修好后自动恢复，不需要额外改动

---

## 新增：Debug Panel（开发专用）

**位置**：右下角浮动按钮，仅 `import.meta.env.DEV` 为 true 时渲染（生产 build 自动消失）

**功能**：
- 点击 `🐛 Debug` 展开面板
- 一键切换 4 个测试账号，写入假 token + user 到 localStorage，页面刷新生效
- 显示当前已登录账号（✓ 高亮）
- Logout 按钮清除 session

**测试账号**：
| 账号 | 角色 | 技能 |
|---|---|---|
| AlphaWolf (u1) | player | Expert |
| SeerSally (u2) | player | Advanced |
| ModeratorMike (u8) | admin | Expert |
| NoobHunter (u3) | player | Beginner |

**文件**：`client/src/components/layout/AppLayout.tsx`（新增 `DebugPanel` 组件 + `<DebugPanel />` 渲染）
