// ─── Mock mode switch ───────────────────────────────────────────────────────
// true  = use local mock data (frontend development)
// false = call real backend API
const USE_MOCK = true;
// ─────────────────────────────────────────────────────────────────────────────

import { MockGameService } from './game.service.mock';
import { RealGameService } from './game.service.real';

export const GameService = USE_MOCK ? MockGameService : RealGameService;
