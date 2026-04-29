// ─── Mock 模式开关 ───────────────────────────────────────────────────────────
// true  = 使用本地 mock 数据（前端调试期间）
// false = 调用真实后端 API
const USE_MOCK = true;
// ─────────────────────────────────────────────────────────────────────────────

import { MockGameService } from './game.service.mock';
import { RealGameService } from './game.service.real';

export const GameService = USE_MOCK ? MockGameService : RealGameService;
