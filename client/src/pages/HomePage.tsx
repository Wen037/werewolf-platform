import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthModal } from "../components/AuthModal";
import { ContactModal } from "../components/ContactModal";
import { useLang } from "../context/LanguageContext";

// ── Parallax master config ──────────────────────────────────────────
const C = {
  LERP: 0.31,
  SHIFT: [0, 0.235, 0.10, 0.15, 0.25, 0.35, 0.22, 0.50],
  EDGE_GLOW: 0.45,
  L: [
    null,
    { name: "Sky",      spd: 0,    alpha: 1.0,  visible: true, scale: 3.0,  groundY: 0.98,  slope: 0.3,   tint: 3,    bright: 1.33 },
    { name: "Forest",   spd: 1.0,  alpha: 1.0,  visible: true, scale: 0.74, groundY: 0.72,  slope: -0.3,  tint: -7,   bright: 0.96 },
    { name: "Campfire", spd: 1.24, alpha: 1.0,  visible: true, scale: 0.61, groundY: 0.975, slope: 0,     tint: -10,  bright: 0.56, bowlDepth: 0.08, bowlW: 0.61 },
    { name: "Bushes",   spd: 1.3,  alpha: 1.0,  visible: true, scale: 1.25, groundY: 0.96,  slope: -0.14, tint: -123, bright: 0.8  },
    { name: "Wolves",   spd: 1.84, alpha: 1.0,  visible: true, scale: 1.1,  groundY: 0.975, slope: -0.04, tint: -42,  bright: 1.0  },
    { name: "Fog",      spd: 0.61, alpha: 1.0,  visible: true, scale: 0.67, groundY: 0.56,  slope: 0,     tint: -38,  bright: 0.43 },
    { name: "NearTree", spd: 2.41, alpha: 0.96, visible: true, scale: 1.01, groundY: 0.99,  slope: 0.03,  tint: -16,  bright: 0.61 },
  ] as any[],
  MOON_GLOW: 237,
  FIRE_SPD:  0.29,
  BLINK_SPD: 0.2,
  BGTREE_H:  0.30,
};

// ── Restore persisted tuning (runs once at module load) ────────────
const HP_STORAGE_KEY = "hp_scene_config";
;(() => {
  try {
    const raw = localStorage.getItem(HP_STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    (["LERP","EDGE_GLOW","MOON_GLOW","FIRE_SPD","BLINK_SPD","BGTREE_H"] as const)
      .forEach(k => { if (s[k] !== undefined) (C as any)[k] = s[k]; });
    if (Array.isArray(s.SHIFT)) s.SHIFT.forEach((v: number, i: number) => { C.SHIFT[i] = v; });
    if (Array.isArray(s.L)) s.L.forEach((l: any, i: number) => { if (l && C.L[i]) Object.assign(C.L[i], l); });
  } catch {}
})();

const IMG_FILES: Record<string, string> = {
  l2:      "/layer2Tree.png",
  fire:    "/human_fire3_processed.png",
  l4:      "/smallTrees_processed.png",
  l5:      "/layer5Trees_processed.png",
  l7:      "/treelayer7_processed.png",
  wolfR:   "/wolfRight.png",
  wolfL:   "/wolfLeft.png",
  mistJpg: "/mist_processed.png",
};

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(200,170,80,0.55)",
  borderRadius: "3px",
  color: "rgba(220,195,130,0.88)",
  fontFamily: "'Cinzel', serif",
  fontSize: "clamp(0.65rem, 1.4vw, 0.9rem)",
  letterSpacing: "0.40em",
  padding: "0.65em clamp(1.1em, 6vw, 2.8em)",
  cursor: "pointer",
  textTransform: "uppercase" as const,
  transition: "all 0.28s ease",
  textShadow: "0 0 12px rgba(255,160,0,0.4)",
  boxShadow: "0 0 18px rgba(180,130,0,0.12), inset 0 0 12px rgba(255,180,0,0.04)",
};

// ── Mobile CSS cartoon scene (triangular trees + moon + fireflies) ─
// Shown only on mobile (md:hidden). Canvas parallax is desktop-only.
const MOBILE_FIREFLIES = [
  { x: 7,  y: 42, d: 1.2 }, { x: 23, y: 31, d: 1.7 }, { x: 16, y: 57, d: 2.1 },
  { x: 36, y: 26, d: 1.4 }, { x: 43, y: 47, d: 0.9 }, { x: 56, y: 36, d: 1.8 },
  { x: 61, y: 29, d: 2.4 }, { x: 71, y: 52, d: 1.1 }, { x: 79, y: 39, d: 1.6 },
  { x: 86, y: 23, d: 2.0 }, { x: 91, y: 61, d: 0.8 }, { x: 31, y: 21, d: 1.3 },
  { x: 66, y: 68, d: 1.9 }, { x: 48, y: 19, d: 2.2 }, { x: 20, y: 72, d: 1.5 },
  { x: 94, y: 37, d: 1.0 }, { x: 5,  y: 29, d: 2.3 }, { x: 76, y: 21, d: 1.4 },
  { x: 52, y: 63, d: 1.7 }, { x: 13, y: 44, d: 0.9 },
];

const MOBILE_TREES = [
  // left edge — taller, bases sit on hill top (~30-32% from bottom)
  { x: -2, b: 30, w: 18, h: 46 },
  { x:  9, b: 31, w: 13, h: 34 },
  { x: 20, b: 31, w: 11, h: 28 },
  { x: 29, b: 31, w: 10, h: 25 },
  // centre-left
  { x: 38, b: 30, w: 12, h: 30 },
  { x: 48, b: 31, w: 10, h: 25 },
  // centre-right
  { x: 57, b: 30, w: 11, h: 28 },
  { x: 67, b: 31, w: 10, h: 25 },
  // right
  { x: 76, b: 30, w: 12, h: 30 },
  { x: 85, b: 31, w: 13, h: 34 },
  { x: 93, b: 30, w: 17, h: 44 },
];

function MobileScene() {
  return (
    <div className="absolute inset-0 overflow-hidden md:hidden" style={{ background: "#030508" }}>
      {/* Moon */}
      <div
        style={{
          position: "absolute", top: "18%", right: "6%",
          width: "28vw", height: "28vw", maxWidth: 140, maxHeight: 140,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 35%, #ffffff 0%, #f0f4ff 65%, #c8d4f0 100%)",
          boxShadow: "0 0 50px rgba(200,220,255,0.35), 0 0 100px rgba(180,200,255,0.12)",
        }}
      >
        <div style={{ position:"absolute", top:"22%", left:"28%", width:"17%", height:"17%", borderRadius:"50%", background:"rgba(0,10,40,0.09)" }} />
        <div style={{ position:"absolute", top:"50%", left:"58%", width:"13%", height:"13%", borderRadius:"50%", background:"rgba(0,10,40,0.08)" }} />
        <div style={{ position:"absolute", top:"36%", left:"11%", width:"10%", height:"10%", borderRadius:"50%", background:"rgba(0,10,40,0.07)" }} />
      </div>

      {/* Hill */}
      <div
        style={{
          position: "absolute", bottom: 0, left: "-20%", right: "-20%",
          height: "33%",
          background: "linear-gradient(to bottom, #162a1a 0%, #0d1f10 100%)",
          borderRadius: "50% 50% 0 0 / 28% 28% 0 0",
        }}
      />

      {/* Trees */}
      {MOBILE_TREES.map((tr, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${tr.x}%`,
            bottom: `${tr.b}%`,
            width: `${tr.w}vw`,
            height: `${tr.h}vw`,
            background: i % 3 === 0 ? "#1e4a25" : i % 3 === 1 ? "#1a4020" : "#163618",
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
      ))}

      {/* Fireflies */}
      {MOBILE_FIREFLIES.map((ff, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${ff.x}%`,
            top: `${ff.y}%`,
            width: 7, height: 7,
            borderRadius: "50%",
            background: "rgba(255,55,0,0.9)",
            boxShadow: "0 0 9px 2px rgba(255,55,0,0.6)",
            animation: `mobile-firefly ${ff.d}s ease-in-out ${(i * 0.27) % ff.d}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [isContactOpen, setContactOpen] = useState(false);
  const navigate = useNavigate();
  const { lang, toggle, t } = useLang();

  const openAuth = (view: "login" | "register") => {
    setAuthView(view);
    setAuthOpen(true);
  };

  useEffect(() => {
    // Canvas parallax is desktop-only — skip entirely on mobile to save battery
    if (window.matchMedia("(max-width: 767px)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let W = 0, H = 0;
    let mouseX = 0, smoothX = 0, time = 0;
    let stars: { x: number; y: number; r: number; p: number; s: number }[] = [];
    let rafId = 0;

    // ── Image loading ──────────────────────────────────────────────
    const IMGS: Record<string, HTMLImageElement> = {};
    Object.entries(IMG_FILES).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => { IMGS[key] = img; };
      img.src = src;
    });

    // ── Firefly data (initialised once, Y in mist zone) ───────────
    const fireflyData = Array.from({ length: 20 }, () => ({
      baseX:  Math.random(),
      baseY:  0.30 + Math.random() * 0.35,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.25 + Math.random() * 0.45,   // faster frequency
      ampX:   50 + Math.random() * 80,        // larger horizontal sweep
      ampY:   25 + Math.random() * 45,        // larger vertical sweep
      size:   2.5 + Math.random() * 3,
      isFg:   Math.random() < 0.5,            // more foreground (brighter) ones
    }));

    // ── Lightning state ────────────────────────────────────────────
    const lightning = { active: false, x: 0.5, scale: 1, rotate: 0 };
    let ltTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleLightning() {
      const delay = Math.random() * 12000 + 8000;
      ltTimer = setTimeout(() => {
        lightning.active = true;
        lightning.x      = Math.random() * 0.8 + 0.1;
        lightning.scale  = Math.random() * 0.5 + 0.8;
        lightning.rotate = Math.random() * 30 - 15;
        setTimeout(() => {
          lightning.active = false;
          scheduleLightning();
        }, 300);
      }, delay);
    }
    setTimeout(scheduleLightning, 5000);

    // ── Resize ─────────────────────────────────────────────────────
    function resize() {
      W = canvas!.width  = window.innerWidth;
      H = canvas!.height = window.innerHeight;
      smoothX = mouseX = W / 2;
      buildStars();
    }

    function buildStars() {
      stars = Array.from({ length: 70 }, () => ({
        x: Math.random(), y: Math.random() * 0.88,
        r: Math.random() * 1.6 + 0.3,
        p: Math.random() * Math.PI * 2,
        s: 0.6 + Math.random() * 1.5,
      }));
    }

    // ── Parallax offsets ───────────────────────────────────────────
    function getOffsets() {
      const norm = smoothX / W - 0.5;
      return C.SHIFT.map((sh: number, i: number) => {
        const spd = C.L[i] ? C.L[i].spd : 1;
        return norm * W * sh * spd;
      });
    }

    // ── Ground helpers ─────────────────────────────────────────────
    function gL(x: number, i: number) {
      const L = C.L[i], nx = x / W;
      return H * (L.groundY + L.slope * (nx - 0.5));
    }
    function gL3(x: number) {
      const L = C.L[3], dx = (x - W * 0.5) / (W * L.bowlW);
      return H * (L.groundY + L.bowlDepth * Math.min(dx * dx * 2.5, 1.0));
    }

    // ── Returns the min panoramic width so the image covers from y=0 to ground ─
    function panoW(img: HTMLImageElement, groundY: number, baseW: number): number {
      const minW = groundY / img.height * img.width;
      return Math.max(baseW, minW);
    }

    // ── Layer save/restore with alpha+filter ───────────────────────
    function beginLayer(i: number) {
      const L = C.L[i]; ctx.save();
      if (!L.visible) { ctx.globalAlpha = 0; return; }
      if (L.alpha < 0.999) ctx.globalAlpha = L.alpha;
      if (L.tint !== 0 || Math.abs(L.bright - 1) > 0.01)
        ctx.filter = `hue-rotate(${L.tint}deg) brightness(${L.bright})`;
    }
    function endLayer() { ctx.restore(); }

    // ── Ground fill / stroke ───────────────────────────────────────
    function fillGround(fn: (x: number) => number, color: string, xL: number, xR: number, step = 5) {
      ctx.beginPath(); ctx.moveTo(xL, fn(xL));
      for (let x = xL + step; x <= xR; x += step) ctx.lineTo(x, fn(x));
      ctx.lineTo(xR, H + 2); ctx.lineTo(xL, H + 2);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }
    function strokeGround(fn: (x: number) => number, color: string, xL: number, xR: number, step = 4) {
      ctx.beginPath(); ctx.moveTo(xL, fn(xL));
      for (let x = xL + step; x <= xR; x += step) ctx.lineTo(x, fn(x));
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // ── Image draw helpers ─────────────────────────────────────────
    function drawPano(img: HTMLImageElement, ox: number, groundFn: (x: number) => number, targetW: number) {
      const dw = targetW, dh = dw / img.width * img.height;
      ctx.drawImage(img, W / 2 - dw / 2 + ox, groundFn(W * 0.5 + ox) - dh, dw, dh);
    }
    function drawChar(img: HTMLImageElement, cx: number, groundY: number, targetH: number, alpha: number) {
      if (alpha <= 0) return;
      const dh = targetH, dw = dh / img.height * img.width;
      ctx.save();
      if (alpha < 1) ctx.globalAlpha *= alpha;
      ctx.drawImage(img, cx - dw / 2, groundY - dh, dw, dh);
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────
    //  L1 — SKY
    // ─────────────────────────────────────────────────────────────────
    function drawSky() {
      beginLayer(1);
      // Base fill prevents any transparent gaps between layers at all window sizes
      ctx.fillStyle = "#010206";
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.22);
      g.addColorStop(0, "#010308"); g.addColorStop(0.5, "#040818"); g.addColorStop(1, "#081228");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.22);
      const g2 = ctx.createLinearGradient(0, H * 0.14, 0, H * 0.34);
      g2.addColorStop(0, "#081228"); g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2; ctx.fillRect(0, H * 0.14, W, H * 0.22);
      endLayer();
    }

    function drawStars() {
      beginLayer(1);
      stars.forEach(s => {
        const a = 0.28 + 0.72 * Math.sin(s.p + time * s.s);
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H * 0.90, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,235,215,${a})`; ctx.fill();
      });
      endLayer();
    }

    function drawMoon(ox: number) {
      beginLayer(1);
      const mx = W * 0.82 + ox * 0.12, my = H * 0.115, r = H * 0.043 * C.L[1].scale;
      const ha = ctx.createRadialGradient(mx, my, r * 0.9, mx, my, C.MOON_GLOW);
      ha.addColorStop(0, "rgba(210,225,255,0.42)");
      ha.addColorStop(0.3, "rgba(190,210,255,0.14)");
      ha.addColorStop(0.65, "rgba(170,195,255,0.05)");
      ha.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(mx, my, C.MOON_GLOW, 0, Math.PI * 2); ctx.fillStyle = ha; ctx.fill();
      const mg = ctx.createRadialGradient(mx - r * .28, my - r * .28, r * .08, mx, my, r);
      mg.addColorStop(0, "#ffffff"); mg.addColorStop(0.55, "#edf0ff"); mg.addColorStop(1, "#b8c4e0");
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fillStyle = mg; ctx.fill();
      [[-.28, .22, .17], [.24, -.30, .13], [.10, .35, .10]].forEach(([dx, dy, cr]) => {
        ctx.beginPath(); ctx.arc(mx + r * dx, my + r * dy, r * cr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,10,40,0.09)"; ctx.fill();
      });
      endLayer();
    }

    // ─────────────────────────────────────────────────────────────────
    //  L2 — FAR FOREST + blinking eyes
    // ─────────────────────────────────────────────────────────────────
    function drawForest(ox: number) {
      beginLayer(2);
      const sc = C.L[2].scale;
      const gfn = (x: number) => gL(x, 2);
      const xL = -W * 0.12 + ox, xR = W * 1.22 + ox;
      fillGround(gfn, "#060c08", xL, xR);

      if (IMGS.l2) {
        ctx.shadowColor = `rgba(210,225,255,${(C.EDGE_GLOW * 0.90).toFixed(2)})`; ctx.shadowBlur = 14;
        drawPano(IMGS.l2, ox, gfn, panoW(IMGS.l2, gfn(W * 0.5 + ox), W * 2.2 * sc));
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      } else {
        strokeGround(gfn, "#0f2820", xL, xR);
        const treeH = H * C.BGTREE_H * sc;
        [{ rx: -0.07, w: 0.044 }, { rx: 0.06, w: 0.054 }, { rx: 0.19, w: 0.058 }, { rx: 0.33, w: 0.050 },
         { rx: 0.47, w: 0.055 }, { rx: 0.60, w: 0.045 }, { rx: 0.73, w: 0.060 }, { rx: 0.87, w: 0.048 },
         { rx: 1.02, w: 0.052 }, { rx: 1.13, w: 0.040 }].forEach((t, i) => {
          const tx = W * t.rx + ox, tw = W * t.w * (0.85 + (i % 3) * .1) * sc, th = treeH * (0.78 + (i % 4) * .07);
          ctx.fillStyle = "#183e20";
          ctx.beginPath(); ctx.moveTo(tx, gfn(tx) - th); ctx.lineTo(tx - tw * 0.4, gfn(tx) - th * 0.42); ctx.lineTo(tx + tw * 0.4, gfn(tx) - th * 0.42); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(tx, gfn(tx) - th * 0.42); ctx.lineTo(tx - tw * 0.58, gfn(tx)); ctx.lineTo(tx + tw * 0.58, gfn(tx)); ctx.closePath(); ctx.fill();
        });
      }

      endLayer();
    }

    // ─────────────────────────────────────────────────────────────────
    //  L3 — CAMPFIRE SCENE
    // ─────────────────────────────────────────────────────────────────
    let campfireOff: HTMLCanvasElement | null = null;

    function drawCampfire(ox: number) {
      beginLayer(3);
      const sc = C.L[3].scale, fx = W * 0.50 + ox;
      const xL = -W * 0.16 + ox, xR = W * 1.17 + ox;
      fillGround(gL3, "#0c1809", xL, xR, 4);

      if (IMGS.fire) {
        const dw = W * 1.6 * sc, dh = dw / IMGS.fire.width * IMGS.fire.height;
        if (!campfireOff || campfireOff.width !== W || campfireOff.height !== H) {
          campfireOff = document.createElement("canvas");
          campfireOff.width = W; campfireOff.height = H;
        }
        const oc = campfireOff.getContext("2d")!;
        oc.clearRect(0, 0, W, H);
        oc.drawImage(IMGS.fire, fx - dw / 2, gL3(fx) - dh, dw, dh);
        const fadeW = dw * 0.22;
        oc.globalCompositeOperation = "destination-out";
        const lgL = oc.createLinearGradient(fx - dw / 2, 0, fx - dw / 2 + fadeW, 0);
        lgL.addColorStop(0, "rgba(0,0,0,1)"); lgL.addColorStop(1, "rgba(0,0,0,0)");
        oc.fillStyle = lgL; oc.fillRect(0, 0, fx - dw / 2 + fadeW, H);
        const lgR = oc.createLinearGradient(fx + dw / 2 - fadeW, 0, fx + dw / 2, 0);
        lgR.addColorStop(0, "rgba(0,0,0,0)"); lgR.addColorStop(1, "rgba(0,0,0,1)");
        oc.fillStyle = lgR; oc.fillRect(fx + dw / 2 - fadeW, 0, W - (fx + dw / 2 - fadeW), H);
        oc.globalCompositeOperation = "source-over";
        ctx.drawImage(campfireOff, 0, 0);
      }
      endLayer();
    }

    // ─────────────────────────────────────────────────────────────────
    //  L4 — BUSHES
    // ─────────────────────────────────────────────────────────────────
    function drawBushLayer(ox: number) {
      beginLayer(4);
      const gfn = (x: number) => gL(x, 4), xL = -W * 0.27 + ox, xR = W * 1.27 + ox;
      fillGround(gfn, "#0a1208", xL, xR, 5);
      if (IMGS.l4) {
        const dh = H * 0.32 * C.L[4].scale;
        const dw = dh / IMGS.l4.height * IMGS.l4.width;
        ctx.drawImage(IMGS.l4, W / 2 - dw / 2 + ox, gfn(W * 0.5 + ox) - dh, dw, dh);
      } else {
        strokeGround(gfn, "#254025", xL, xR, 5);
      }
      endLayer();
    }

    // ─────────────────────────────────────────────────────────────────
    //  L5 — WOLVES + MID TREES
    // ─────────────────────────────────────────────────────────────────
    function drawWolfLayer(ox: number) {
      beginLayer(5);
      const sc = C.L[5].scale, gfn = (x: number) => gL(x, 5);
      const xL = -W * 0.37 + ox, xR = W * 1.37 + ox;
      fillGround(gfn, "#07100a", xL, xR, 5);

      if (IMGS.l5) {
        ctx.shadowColor = `rgba(210,225,255,${(C.EDGE_GLOW * 0.72).toFixed(2)})`; ctx.shadowBlur = 12;
        drawPano(IMGS.l5, ox, gfn, panoW(IMGS.l5, gfn(W * 0.5 + ox), W * 2.1 * sc));
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      } else {
        strokeGround(gfn, "#1e3a1e", xL, xR, 5);
      }

      function wolfGlow(cx: number, groundY: number, charH: number, charW: number) {
        const gy = groundY - charH * 0.5;
        const gr = Math.max(charH, charW) * 0.72;
        const gd = ctx.createRadialGradient(cx, gy, 0, cx, gy, gr);
        gd.addColorStop(0, "rgba(180,120,30,0.22)");
        gd.addColorStop(0.45, "rgba(140,80,10,0.10)");
        gd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cx, gy, gr, 0, Math.PI * 2);
        ctx.fillStyle = gd; ctx.fill();
      }

      const w1x = W * 0.32 + ox;
      if (IMGS.wolfR) {
        const wdh = H * 0.57 * sc, wdw = wdh / IMGS.wolfR.height * IMGS.wolfR.width;
        wolfGlow(w1x, gfn(w1x), wdh, wdw);
        drawChar(IMGS.wolfR, w1x, gfn(w1x), wdh, 1);
        const sg1 = ctx.createLinearGradient(w1x - wdw * 0.5, 0, w1x + wdw * 0.4, 0);
        sg1.addColorStop(0, "rgba(0,0,12,0.78)"); sg1.addColorStop(0.48, "rgba(0,0,6,0.22)"); sg1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sg1; ctx.fillRect(w1x - wdw * 0.5 - 2, gfn(w1x) - wdh - 2, wdw * 0.85, wdh + 4);
      }

      if (IMGS.wolfL) {
        const wdh = H * 0.525 * sc, wdw = wdh / IMGS.wolfL.height * IMGS.wolfL.width;
        const w2x = W * 1.08 + wdw * 0.5 + ox;
        wolfGlow(w2x, gfn(w2x), wdh, wdw);
        drawChar(IMGS.wolfL, w2x, gfn(w2x), wdh, 1);
        const sg2 = ctx.createLinearGradient(w2x - wdw * 0.4, 0, w2x + wdw * 0.5, 0);
        sg2.addColorStop(0, "rgba(0,0,0,0)"); sg2.addColorStop(0.52, "rgba(0,0,6,0.22)"); sg2.addColorStop(1, "rgba(0,0,12,0.78)");
        ctx.fillStyle = sg2; ctx.fillRect(w2x - wdw * 0.4 - 2, gfn(w2x) - wdh - 2, wdw * 0.9, wdh + 4);
      }

      // Fireflies live in the wolf layer
      drawFireflies(ox);
      endLayer();
    }

    // ─────────────────────────────────────────────────────────────────
    //  L6 — FOG + FIREFLIES + LIGHTNING
    // ─────────────────────────────────────────────────────────────────
    function drawBoltPath(s: number) {
      const o = -50 * s;
      ctx.beginPath();
      ctx.moveTo(o + 50 * s, 0);
      ctx.lineTo(o + 20 * s, 80 * s);
      ctx.lineTo(o + 60 * s, 80 * s);
      ctx.lineTo(o + 10 * s, 180 * s);
      ctx.lineTo(o + 50 * s, 180 * s);
      ctx.lineTo(o + 0,      300 * s);
    }

    function drawLightning() {
      if (!lightning.active) return;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#93c5fd";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      const lx = W * lightning.x;
      const s = H * 0.85 / 300;
      ctx.save();
      ctx.translate(lx, -H * 0.08);
      ctx.scale(lightning.scale, lightning.scale);
      ctx.rotate(lightning.rotate * Math.PI / 180);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(147,197,253,0.7)";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "rgba(147,197,253,0.45)";
      ctx.lineWidth = 8;
      drawBoltPath(s); ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      drawBoltPath(s); ctx.stroke();
      ctx.restore();
    }

    function drawFireflies(ox: number) {
      fireflyData.forEach(fly => {
        const t = time + fly.phase;
        const fx = fly.baseX * W + Math.sin(t * fly.speed) * fly.ampX + ox * 0.45;
        const fy = fly.baseY * H + Math.cos(t * fly.speed * 0.7) * fly.ampY;
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * fly.speed * 1.5));
        ctx.save();
        if (fly.isFg) {
          ctx.shadowColor = "rgba(255,60,20,0.95)";
          ctx.shadowBlur = 14;
          ctx.fillStyle = `rgba(255,60,0,${alpha.toFixed(2)})`;
        } else {
          ctx.shadowColor = "rgba(200,40,0,0.6)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(220,80,20,${(alpha * 0.75).toFixed(2)})`;
        }
        ctx.beginPath();
        ctx.arc(fx, fy, fly.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawFog(ox: number) {
      beginLayer(6);
      const L = C.L[6], baseY = H * L.groundY;

      if (IMGS.mistJpg) {
        ctx.save();
        ctx.globalAlpha *= 0.75;
        const dw = W * 2.2, dh = dw / IMGS.mistJpg.width * IMGS.mistJpg.height;
        ctx.drawImage(IMGS.mistJpg, W / 2 - dw / 2 + ox, baseY - dh * 0.45, dw, dh);
        ctx.restore();
      }

      endLayer();
    }

    // ─────────────────────────────────────────────────────────────────
    //  L7 — NEAR TREES
    // ─────────────────────────────────────────────────────────────────
    function drawForeground(ox: number) {
      beginLayer(7);
      const sc = C.L[7].scale, gfn = (x: number) => gL(x, 7);
      fillGround(gfn, "#040804", -W * 0.55 + ox, W * 1.55 + ox, 5);
      if (IMGS.l7) {
        ctx.shadowColor = `rgba(210,225,255,${C.EDGE_GLOW.toFixed(2)})`; ctx.shadowBlur = 18;
        drawPano(IMGS.l7, ox, gfn, panoW(IMGS.l7, gfn(W * 0.5 + ox), W * 2.2 * sc));
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      }
      endLayer();
    }

    // ─────────────────────────────────────────────────────────────────
    //  MAIN LOOP
    // ─────────────────────────────────────────────────────────────────
    function loop() {
      time += 0.016;
      smoothX += (mouseX - smoothX) * C.LERP;
      stars.forEach(s => { s.p += 0.005 * s.s; });
      const o = getOffsets();
      ctx.clearRect(0, 0, W, H);
      drawSky();
      drawStars();
      drawMoon(o[2]);
      drawLightning();   // innermost layer — behind the forest
      drawForest(o[2]);
      drawCampfire(o[3]);
      drawBushLayer(o[4]);
      drawWolfLayer(o[5]);
      drawFog(o[6]);
      drawForeground(o[7]);
      rafId = requestAnimationFrame(loop);
    }

    const onMouseMove = (e: MouseEvent) => { mouseX = e.clientX; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", resize);

    resize();
    // Respect prefers-reduced-motion (WCAG 2.3.3): render one static frame
    // instead of a continuous rAF loop. Also keeps headless E2E runs responsive.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      loop();
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
      if (ltTimer) clearTimeout(ltTimer);
    };
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#010206] relative" style={{ cursor: "crosshair" }}>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setContactOpen(false)}
      />

      {/* Desktop: canvas parallax; Mobile: CSS cartoon scene */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full hidden md:block" />
      <MobileScene />

      <div
        className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none z-50"
        style={{ paddingTop: "6vh" }}
      >
        <div className="absolute top-0 w-full p-6 flex justify-end gap-3 pointer-events-auto">
          <button
            onClick={toggle}
            className="text-neutral-400 hover:text-white font-medium text-sm transition-colors border border-white/20 hover:border-white/40 px-4 py-2 rounded-full"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {lang === 'en' ? 'CN' : 'EN'}
          </button>
          <button
            onClick={() => setContactOpen(true)}
            className="text-neutral-400 hover:text-white font-medium text-sm transition-colors border border-transparent hover:border-white/20 px-4 py-2 rounded-full"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {t('Contact Us')}
          </button>
        </div>

        <h1
          style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: "clamp(2.2rem, 6vw, 5rem)",
            fontWeight: 900,
            letterSpacing: "0.18em",
            color: "#f0e8c8",
            textShadow:
              "0 0 30px rgba(255,180,40,0.55), 0 0 80px rgba(255,120,0,0.25), 0 2px 8px rgba(0,0,0,0.9)",
            userSelect: "none",
          }}
        >
          WEREWOLF SG
        </h1>

        <p
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(0.7rem, 1.8vw, 1.1rem)",
            letterSpacing: "0.45em",
            color: "rgba(200,185,150,0.70)",
            marginTop: "0.55em",
            textShadow: "0 0 20px rgba(255,150,0,0.3), 0 1px 4px rgba(0,0,0,0.8)",
            userSelect: "none",
            textTransform: "uppercase",
          }}
        >
          {t('A Night of Deception')}
        </p>

        {/* Buttons — mobile: directly below subtitle text; desktop: pinned above description */}
        <div
          className="pointer-events-auto flex flex-col sm:flex-row gap-4 sm:gap-8 items-center w-full px-6 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 md:top-auto md:translate-y-0 md:bottom-[14vh]"
          style={{ whiteSpace: "nowrap", maxWidth: "32rem" }}
        >
          <button
            style={btnStyle}
            onClick={() => openAuth("register")}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(180,130,20,0.18)";
              b.style.borderColor = "rgba(220,185,90,0.88)";
              b.style.color = "#f5e8c0";
              b.style.boxShadow = "0 0 32px rgba(220,160,20,0.30), inset 0 0 20px rgba(255,180,0,0.08)";
              b.style.textShadow = "0 0 20px rgba(255,180,0,0.65)";
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.borderColor = "rgba(200,170,80,0.55)";
              b.style.color = "rgba(220,195,130,0.88)";
              b.style.boxShadow = "0 0 18px rgba(180,130,0,0.12), inset 0 0 12px rgba(255,180,0,0.04)";
              b.style.textShadow = "0 0 12px rgba(255,160,0,0.4)";
            }}
          >
            {t('Login / Register')}
          </button>

          <button
            style={btnStyle}
            onClick={() => navigate("/lobby")}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(180,130,20,0.18)";
              b.style.borderColor = "rgba(220,185,90,0.88)";
              b.style.color = "#f5e8c0";
              b.style.boxShadow = "0 0 32px rgba(220,160,20,0.30), inset 0 0 20px rgba(255,180,0,0.08)";
              b.style.textShadow = "0 0 20px rgba(255,180,0,0.65)";
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.borderColor = "rgba(200,170,80,0.55)";
              b.style.color = "rgba(220,195,130,0.88)";
              b.style.boxShadow = "0 0 18px rgba(180,130,0,0.12), inset 0 0 12px rgba(255,180,0,0.04)";
              b.style.textShadow = "0 0 12px rgba(255,160,0,0.4)";
            }}
          >
            {t('Find a Game')}
          </button>
        </div>

        {/* Mobile description */}
        <div
          className="md:hidden absolute pointer-events-none text-center px-8"
          style={{ bottom: "0.8rem", userSelect: "none" }}
        >
          <p style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "0.55rem",
            letterSpacing: "0.06em",
            color: "rgba(200,185,150,0.50)",
            lineHeight: 1.7,
          }}>
            {t('Find & host in-person Werewolf game in Singapore.')}
            <br />
            {t('Browse open game events, discover venues, and meet local players.')}
          </p>
          <p style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "0.5rem",
            letterSpacing: "0.04em",
            color: "rgba(251,191,36,0.60)",
            lineHeight: 1.6,
            marginTop: "0.4em",
            fontWeight: "bold",
          }}>
            {t('Offline game gathering only')}
          </p>
        </div>

        {/* Desktop description */}
        <div
          className="hidden md:block absolute pointer-events-none text-center"
          style={{
            bottom: "3vh",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "36rem",
            userSelect: "none",
          }}
        >
          <p style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(0.56rem, 0.95vw, 0.75rem)",
            letterSpacing: "0.08em",
            color: "rgba(200,185,150,0.55)",
            lineHeight: 1.8,
          }}>
            {t('Find & host in-person Werewolf game in Singapore.')}
            <br />
            {t('Browse open game events, discover venues, and meet local players.')}
          </p>
          <p style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(0.50rem, 0.85vw, 0.65rem)",
            letterSpacing: "0.06em",
            color: "rgba(251,191,36,0.65)",
            lineHeight: 1.6,
            marginTop: "0.5em",
            fontWeight: "bold",
          }}>
            {t('Offline game gathering only')}
          </p>
        </div>

      </div>

    </div>
  );
}
