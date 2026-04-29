import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthModal } from "../components/AuthModal";
import { ContactModal } from "../components/ContactModal";

// ── Parallax master config ──────────────────────────────────────────
const C = {
  LERP: 0.31,
  SHIFT: [0, 0.0, 0.10, 0.15, 0.25, 0.35, 0.22, 0.50],
  EDGE_GLOW: 0.45,
  L: [
    null,
    { name: "Sky",      spd: 0,    alpha: 1.0, visible: true, scale: 3.0,  groundY: 0.98, slope: 0.3,   tint: 3,    bright: 0.32 },
    { name: "Forest",   spd: 1.0,  alpha: 1.0, visible: true, scale: 0.91, groundY: 0.65, slope: -0.3,  tint: -7,   bright: 0.96 },
    { name: "Campfire", spd: 1.24, alpha: 1.0, visible: true, scale: 0.61, groundY: 0.89, slope: 0,     tint: 3,    bright: 0.56, bowlDepth: 0.08, bowlW: 0.61 },
    { name: "Bushes",   spd: 1.3,  alpha: 1.0, visible: true, scale: 1.25, groundY: 0.96, slope: -0.14, tint: -123, bright: 0.8  },
    { name: "Wolves",   spd: 1.84, alpha: 1.0, visible: true, scale: 0.93, groundY: 0.93, slope: -0.04, tint: 0,    bright: 1.0  },
    { name: "Fog",      spd: 0.61, alpha: 1.0, visible: true, scale: 0.67, groundY: 0.59, slope: 0,     tint: -38,  bright: 0.43 },
    { name: "NearTree", spd: 2.41, alpha: 1.0, visible: true, scale: 1.01, groundY: 0.99, slope: 0.03,  tint: -134, bright: 0.61 },
  ] as any[],
  MOON_GLOW: 237,
  FIRE_SPD:  0.29,
  BLINK_SPD: 0.2,
  BGTREE_H:  0.30,
};

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
  padding: "0.65em 2.8em",
  cursor: "pointer",
  textTransform: "uppercase" as const,
  transition: "all 0.28s ease",
  textShadow: "0 0 12px rgba(255,160,0,0.4)",
  boxShadow: "0 0 18px rgba(180,130,0,0.12), inset 0 0 12px rgba(255,180,0,0.04)",
};

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [isContactOpen, setContactOpen] = useState(false);
  const navigate = useNavigate();

  const openAuth = (view: "login" | "register") => {
    setAuthView(view);
    setAuthOpen(true);
  };

  useEffect(() => {
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
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
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

    // ── Layer save/restore with alpha+filter ───────────────────────
    function beginLayer(i: number) {
      const L = C.L[i]; ctx.save();
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
        drawPano(IMGS.l2, ox, gfn, W * 2.2 * sc);
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

      const eyeDefs: [number, number, string][] = [[0.14, 0.0, "blood"], [0.50, 2.3, "yellow"], [0.83, 4.7, "blood"]];
      const RX2 = 10, RY2 = 5;
      eyeDefs.forEach(([rx, phase, col]) => {
        const cyclePos = (time * C.BLINK_SPD * 3 + phase) % (Math.PI * 2);
        if (cyclePos < 0.28) return;
        const ex = W * rx + ox, ey = gfn(ex) - H * 0.26;
        const isBlood = col === "blood";
        const irisC = isBlood ? "#8b0000" : "#c8a800";
        const rimC  = isBlood ? "#cc0000" : "#ffe040";
        [-18, 18].forEach(dx => {
          const px = ex + dx;
          ctx.save();
          ctx.beginPath(); ctx.ellipse(px, ey, RX2, RY2, 0, 0, Math.PI * 2);
          ctx.fillStyle = irisC; ctx.fill();
          ctx.strokeStyle = rimC; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(px, ey, RX2 * 0.18, RY2 * 0.82, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,0.95)"; ctx.fill();
          ctx.beginPath(); ctx.ellipse(px - RX2 * 0.28, ey - RY2 * 0.3, RX2 * 0.14, RY2 * 0.28, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill();
          ctx.restore();
        });
      });
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
        drawPano(IMGS.l5, ox, gfn, W * 2.1 * sc);
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
        const wdh = H * 0.38 * sc, wdw = wdh / IMGS.wolfR.height * IMGS.wolfR.width;
        wolfGlow(w1x, gfn(w1x), wdh, wdw);
        drawChar(IMGS.wolfR, w1x, gfn(w1x), wdh, 1);
        const sg1 = ctx.createLinearGradient(w1x - wdw * 0.5, 0, w1x + wdw * 0.4, 0);
        sg1.addColorStop(0, "rgba(0,0,12,0.78)"); sg1.addColorStop(0.48, "rgba(0,0,6,0.22)"); sg1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sg1; ctx.fillRect(w1x - wdw * 0.5 - 2, gfn(w1x) - wdh - 2, wdw * 0.85, wdh + 4);
      }

      const w2x = W * 1.08 + ox;
      if (IMGS.wolfL) {
        const wdh = H * 0.35 * sc, wdw = wdh / IMGS.wolfL.height * IMGS.wolfL.width;
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

    // No-op — kept for clarity; effects are now embedded in their respective layers
    function drawTopEffects(_ox: number) { /* fireflies in L5, lightning in L1 */ }

    // ─────────────────────────────────────────────────────────────────
    //  L7 — NEAR TREES
    // ─────────────────────────────────────────────────────────────────
    function drawForeground(ox: number) {
      beginLayer(7);
      const sc = C.L[7].scale, gfn = (x: number) => gL(x, 7);
      fillGround(gfn, "#040804", -W * 0.55 + ox, W * 1.55 + ox, 5);
      if (IMGS.l7) {
        ctx.shadowColor = `rgba(210,225,255,${C.EDGE_GLOW.toFixed(2)})`; ctx.shadowBlur = 18;
        drawPano(IMGS.l7, ox, gfn, W * 2.2 * sc);
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
    rafId = requestAnimationFrame(loop);

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

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      <div
        className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none z-50"
        style={{ paddingTop: "6vh" }}
      >
        <div className="absolute top-0 w-full p-6 flex justify-end pointer-events-auto">
          <button
            onClick={() => setContactOpen(true)}
            className="text-neutral-400 hover:text-white font-medium text-sm transition-colors border border-transparent hover:border-white/20 px-4 py-2 rounded-full"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Contact Us
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
          A Night of Deception
        </p>

        {/* Buttons — absolutely positioned in the lower third of the screen */}
        <div
          className="pointer-events-auto flex gap-8 absolute"
          style={{ bottom: "14vh", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}
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
            Login / Register
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
            Find a Game
          </button>
        </div>
      </div>
    </div>
  );
}
