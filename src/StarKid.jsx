import React, { useRef, useEffect, useLayoutEffect } from "react";
import { STATES as D } from "./starkidStates.js";

/*
 * 星星小人。9 个状态之间做路径形变，叠加一层持续运行的待机动画。
 *
 * props
 *   state      当前状态名，见 D.order
 *   micLevel   0-1，实时麦克风音量，直接驱动嘴巴开合
 *   gaze       true 时眼睛与星星棒朝鼠标方向偏一点
 *   size       渲染宽度 px
 *
 * 架构要点（沿用 svg-character-animator 的做法）：
 *   1. 逐路径策略检测：命令结构一致的路径走控制点精确插值，否则退回等弧长重采样
 *   2. 路径只在挂载时渲染一次，之后全部通过 setAttribute('d') 改，React 不重建元素
 *   3. 待机动画常驻不销毁，形变期间只把幅度降到 0.1 再升回来
 *   4. 元素离开视口或用户偏好减少动态时停掉 rAF
 */

const NS = "http://www.w3.org/2000/svg";
const IDS = Object.keys(D.states[D.order[0]].paths);

function parsePath(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const segs = [];
  let i = 0, cmd = null, cx = 0, cy = 0, sx = 0, sy = 0;
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const up = cmd.toUpperCase(), rel = cmd !== up;
    let pts = [];
    if (up === "M" || up === "L") {
      let x = num(), y = num();
      if (rel) { x += cx; y += cy; }
      pts = [[x, y]]; cx = x; cy = y;
      if (up === "M") { sx = x; sy = y; }
    } else if (up === "H") {
      let x = num(); if (rel) x += cx; pts = [[x, cy]]; cx = x;
    } else if (up === "V") {
      let y = num(); if (rel) y += cy; pts = [[cx, y]]; cy = y;
    } else if (up === "C") {
      const a = [];
      for (let k = 0; k < 3; k++) {
        let x = num(), y = num();
        if (rel) { x += cx; y += cy; }
        a.push([x, y]);
      }
      pts = a; cx = a[2][0]; cy = a[2][1];
    } else if (up === "Z") {
      cx = sx; cy = sy;
    } else continue;
    segs.push({ c: up === "H" || up === "V" ? "L" : up, p: pts });
  }
  return segs;
}

const fingerprint = (segs) => segs.map((s) => s.c).join("");
const emit = (segs) =>
  segs.map((s) => (s.c === "Z" ? "Z" : s.c + " " + s.p.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" "))).join(" ");

function lerpSegs(A, B, t) {
  return emit(
    A.map((s, i) => ({
      c: s.c,
      p: s.p.map((p, j) => {
        const q = B[i].p[j];
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      }),
    })),
  );
}

function flatten(segs, N) {
  const pts = [];
  let cur = [0, 0], start = [0, 0];
  for (const s of segs) {
    if (s.c === "M") { cur = s.p[0]; start = cur; pts.push(cur); }
    else if (s.c === "L") { cur = s.p[0]; pts.push(cur); }
    else if (s.c === "C") {
      const [c1, c2, e] = s.p;
      for (let k = 1; k <= 12; k++) {
        const u = k / 12, v = 1 - u;
        pts.push([
          v * v * v * cur[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * e[0],
          v * v * v * cur[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * e[1],
        ]);
      }
      cur = e;
    } else if (s.c === "Z") { pts.push(start); cur = start; }
  }
  const L = [0];
  let tot = 0;
  for (let k = 1; k < pts.length; k++) {
    tot += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    L.push(tot);
  }
  const out = [];
  for (let k = 0; k < N; k++) {
    const target = (tot * k) / N;
    let j = 1;
    while (j < L.length - 1 && L[j] < target) j++;
    const f = (target - L[j - 1]) / (L[j] - L[j - 1] || 1);
    out.push([
      pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f,
      pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f,
    ]);
  }
  return out;
}

const lerpPoly = (A, B, t) =>
  "M " +
  A.map((p, i) => {
    const q = B[i];
    return (p[0] + (q[0] - p[0]) * t).toFixed(2) + " " + (p[1] + (q[1] - p[1]) * t).toFixed(2);
  }).join(" L ") +
  " Z";

/* 模块级预计算，所有实例共享 */
const PARSED = {}, STRAT = {}, POLY = {};
IDS.forEach((id) => {
  PARSED[id] = {};
  const fps = new Set();
  D.order.forEach((s) => {
    const g = parsePath(D.states[s].paths[id].d);
    PARSED[id][s] = g;
    fps.add(fingerprint(g));
  });
  STRAT[id] = fps.size === 1 ? "TRANSFORM" : "MORPH";
  if (STRAT[id] === "MORPH") {
    POLY[id] = {};
    D.order.forEach((s) => (POLY[id][s] = flatten(PARSED[id][s], 120)));
  }
});

const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sineInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

let uid = 0;

export default function StarKid({
  state = "idle",
  micLevel = 0,
  gaze = false,
  size = 260,
  duration = 800,
  className,
  style,
}) {
  const hostRef = useRef(null);
  const elRef = useRef({});
  const sparkRef = useRef(null);
  const sparkItems = useRef([]);
  const idleRootRef = useRef(null);

  const cur = useRef(state);
  const amp = useRef(1);
  const morph = useRef(null);
  const mic = useRef(0);
  const gazeVec = useRef([0, 0]);
  const sparkPos = useRef(D.states[state] ? D.states[state].sparkleCenter.slice() : [463, 50]);
  const sparkOp = useRef(D.states[state] && D.states[state].sparkles ? 1 : 0);
  const sparkMode = useRef((D.states[state] && D.states[state].sparkleMode) || "orbit");

  const fid = useRef("sk" + ++uid).current;

  useEffect(() => { mic.current = Math.max(0, Math.min(1, micLevel || 0)); }, [micLevel]);

  /* 建立 DOM：路径只渲染一次 */
  useLayoutEffect(() => {
    const shared = hostRef.current.querySelector("[data-shared]");
    const spark = hostRef.current.querySelector("[data-sparkles]");
    sparkRef.current = spark;
    idleRootRef.current = hostRef.current.querySelector("[data-idle-root]");

    const first = D.states[cur.current] || D.states[D.order[0]];
    IDS.forEach((id) => {
      const a = first.paths[id];
      const el = document.createElementNS(NS, "path");
      el.setAttribute("d", a.d);
      el.setAttribute("fill", a.fill || "none");
      if (a.opacity != null) el.setAttribute("fill-opacity", a.opacity);
      if (a.stroke) {
        el.setAttribute("stroke", a.stroke);
        el.setAttribute("stroke-width", a.strokeWidth);
      }
      if (a.filter) el.setAttribute("filter", `url(#${fid}-${a.filter})`);
      shared.appendChild(el);
      elRef.current[id] = el;
    });

    for (let i = 0; i < 25; i++) {
      const ang = (i / 25) * Math.PI * 2 + (i % 3) * 0.21;
      const r = 62 + ((i * 37) % 5) * 22;
      const sc = 0.13 + ((i * 53) % 7) * 0.032;
      const g = document.createElementNS(NS, "g");
      const u = document.createElementNS(NS, "use");
      u.setAttribute("href", `#${fid}-ministar`);
      u.setAttribute("fill", i % 2 ? "#5DDAEE" : "#FFC96B");
      u.setAttribute("transform", `scale(${sc.toFixed(3)})`);
      g.appendChild(u);
      spark.appendChild(g);
      sparkItems.current.push({ g, ang0: ang, r, spin: 3.4 + ((i * 29) % 6) * 0.9, tw: (i * 0.17) % 1.3, ph: i / 25 });
    }

    const root = idleRootRef.current;
    root.style.transformBox = "view-box";
    root.style.transformOrigin = `${D.idleAnchor[0]}px ${D.idleAnchor[1]}px`;
    ["eyeL", "eyeR", "mouth"].forEach((id) => {
      elRef.current[id].style.transformBox = "fill-box";
      elRef.current[id].style.transformOrigin = "center";
    });
    ["wand", "star"].forEach((id) => {
      elRef.current[id].style.transformBox = "view-box";
      elRef.current[id].style.transformOrigin = "374.2px 168.9px";
    });

    return () => {
      shared.replaceChildren();
      spark.replaceChildren();
      sparkItems.current = [];
      elRef.current = {};
    };
  }, [fid]);

  /* 状态切换：形变 + 填充色插值 + 待机幅度斜坡 */
  useEffect(() => {
    if (!D.states[state] || state === cur.current) return;
    const from = cur.current, to = state;
    cur.current = to;
    if (morph.current) cancelAnimationFrame(morph.current);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      IDS.forEach((id) => {
        elRef.current[id].setAttribute("d", D.states[to].paths[id].d);
        if (D.states[to].paths[id].fill) elRef.current[id].setAttribute("fill", D.states[to].paths[id].fill);
      });
      sparkPos.current = D.states[to].sparkleCenter.slice();
      sparkOp.current = D.states[to].sparkles ? 1 : 0;
      sparkMode.current = D.states[to].sparkleMode || "orbit";
      return;
    }

    if (D.states[to].sparkles) sparkMode.current = D.states[to].sparkleMode || "orbit";
    const pFrom = D.states[from].sparkleCenter, pTo = D.states[to].sparkleCenter;
    const oFrom = D.states[from].sparkles ? 1 : 0, oTo = D.states[to].sparkles ? 1 : 0;
    const t0 = performance.now();

    const step = (now) => {
      const raw = Math.min((now - t0) / duration, 1), t = easeInOutQuad(raw);
      IDS.forEach((id) => {
        const el = elRef.current[id];
        if (!el) return;
        el.setAttribute(
          "d",
          STRAT[id] === "TRANSFORM"
            ? lerpSegs(PARSED[id][from], PARSED[id][to], t)
            : lerpPoly(POLY[id][from], POLY[id][to], t),
        );
        const fa = D.states[from].paths[id].fill, fb = D.states[to].paths[id].fill;
        if (fa && fb && fa !== fb && fa[0] === "#") {
          const a = hex2rgb(fa), b = hex2rgb(fb);
          el.setAttribute("fill", rgb2hex(a.map((v, k) => v + (b[k] - v) * t)));
        }
      });
      sparkPos.current = [pFrom[0] + (pTo[0] - pFrom[0]) * t, pFrom[1] + (pTo[1] - pFrom[1]) * t];
      sparkOp.current = oFrom + (oTo - oFrom) * t;
      amp.current = raw < 0.4 ? 1 - 0.9 * sineInOut(raw / 0.4) : raw > 0.6 ? 0.1 + 0.9 * sineInOut((raw - 0.6) / 0.4) : 0.1;
      if (raw < 1) morph.current = requestAnimationFrame(step);
      else { morph.current = null; amp.current = 1; }
    };
    morph.current = requestAnimationFrame(step);

    return () => {
      if (morph.current) cancelAnimationFrame(morph.current);
      morph.current = null;
    };
  }, [state, duration]);

  /* 目光追随 */
  useEffect(() => {
    if (!gaze) { gazeVec.current = [0, 0]; return; }
    const onMove = (e) => {
      const host = hostRef.current;
      if (!host) return;
      const r = host.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      gazeVec.current = [Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy))];
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [gaze]);

  /* 待机循环：常驻，离屏或减少动态时暂停 */
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = null, visible = true;

    const tick = (now) => {
      const t = now / 1000;
      const st = D.states[cur.current] || D.states[D.order[0]];
      const parts = (st.idle && st.idle.parts) || [];
      let ry = 1, dy = 0, rot = 0;
      const elT = {};
      const a = amp.current;

      for (const p of parts) {
        if (p.kind === "breathe-y") ry += Math.sin((t / p.duration) * 2 * Math.PI) * p.amplitude * a;
        else if (p.kind === "bob") dy += Math.sin((t / p.duration) * 2 * Math.PI) * p.amplitude * a;
        else if (p.kind === "sway" || p.kind === "shake") rot += Math.sin((t / p.duration) * 2 * Math.PI) * p.amplitude * a;
        else if (p.kind === "blink") {
          const ph = (t % p.every) / p.every;
          const k = ph > 0.94 ? Math.abs(Math.cos(((ph - 0.94) / 0.06) * Math.PI)) : 1;
          const s = 1 - (1 - Math.max(k, 0.08)) * a;
          p.selector.forEach((id) => (elT[id] = (elT[id] || "") + ` scaleY(${s.toFixed(3)})`));
        } else if (p.kind === "pulse") {
          const s = 1 + Math.sin((t / p.duration) * 2 * Math.PI) * p.amplitude * a;
          p.selector.forEach((id) => (elT[id] = (elT[id] || "") + ` scale(${s.toFixed(3)})`));
        } else if (p.kind === "rotate-around-point") {
          const deg = Math.sin((t / p.duration) * 2 * Math.PI) * p.amplitude * a;
          p.selector.forEach((id) => (elT[id] = (elT[id] || "") + ` rotate(${deg.toFixed(2)}deg)`));
        }
      }

      /* 麦克风音量直接驱动嘴巴：横向略张，纵向大幅张开 */
      if (mic.current > 0.01) {
        const m = Math.pow(mic.current, 0.6);
        elT.mouth = (elT.mouth || "") + ` scale(${(1 + m * 0.35).toFixed(3)}, ${(1 + m * 1.5).toFixed(3)})`;
      }

      /* 目光追随：眼睛平移，星星棒轻微转向 */
      const [gx, gy] = gazeVec.current;
      if (gx || gy) {
        const ox = (gx * 5).toFixed(2), oy = (gy * 3.5).toFixed(2);
        ["eyeL", "eyeR"].forEach((id) => (elT[id] = `translate(${ox}px, ${oy}px) ` + (elT[id] || "")));
        const wr = (gx * 7).toFixed(2);
        ["wand", "star"].forEach((id) => (elT[id] = (elT[id] || "") + ` rotate(${wr}deg)`));
      }

      idleRootRef.current.style.transform =
        `translate(0px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scaleY(${ry.toFixed(4)})`;
      IDS.forEach((id) => {
        const el = elRef.current[id];
        if (el) el.style.transform = elT[id] || "";
      });

      const c = sparkPos.current, vis = sparkOp.current;
      sparkRef.current.setAttribute("transform", `translate(${c[0].toFixed(1)},${c[1].toFixed(1)})`);
      sparkRef.current.style.opacity = vis;
      if (vis > 0.01) {
        for (const s of sparkItems.current) {
          if (sparkMode.current === "burst") {
            const ph = (t / 1.9 + s.ph) % 1;
            const rr = s.r * (0.18 + 1.05 * ph);
            s.g.setAttribute(
              "transform",
              `translate(${(Math.cos(s.ang0) * rr).toFixed(1)},${(Math.sin(s.ang0) * rr).toFixed(1)}) scale(${(0.5 + 0.8 * (1 - ph)).toFixed(3)})`,
            );
            s.g.style.opacity = ((1 - ph) * Math.min(ph * 6, 1)).toFixed(2);
          } else {
            const ang = s.ang0 + ((t / s.spin) * 2 * Math.PI) % (2 * Math.PI);
            s.g.setAttribute("transform", `translate(${(Math.cos(ang) * s.r).toFixed(1)},${(Math.sin(ang) * s.r).toFixed(1)})`);
            s.g.style.opacity = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(((t + s.tw) / 1.3) * 2 * Math.PI))).toFixed(2);
          }
        }
      }
      if (visible) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && raf === null) raf = requestAnimationFrame(tick);
      else if (!visible && raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }, { threshold: 0 });
    io.observe(hostRef.current);
    raf = requestAnimationFrame(tick);

    return () => {
      io.disconnect();
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={hostRef} className={className} style={{ width: size, maxWidth: "100%", ...style }} aria-hidden="true">
      <svg viewBox={D.viewBox} xmlns={NS} style={{ width: "100%", height: "auto", overflow: "visible", display: "block" }}>
        <defs>
          <filter id={`${fid}-liquid`} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves="3" seed="3" result="n">
              <animate attributeName="baseFrequency" dur="10s" repeatCount="indefinite"
                values="0.009 0.013;0.018 0.007;0.006 0.017;0.009 0.013" />
              <animate attributeName="seed" dur="13.3s" repeatCount="indefinite" values="3;9;3" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" xChannelSelector="R" yChannelSelector="G" result="disp">
              <animate attributeName="scale" dur="6.7s" repeatCount="indefinite" values="25;60;38;25" />
            </feDisplacementMap>
            <feGaussianBlur in="disp" stdDeviation="7.5" />
          </filter>
          <filter id={`${fid}-softblur`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id={`${fid}-wandtex`} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feTurbulence type="fractalNoise" baseFrequency="0.25 0.25" numOctaves="3" seed="8982" />
            <feDisplacementMap in="b" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={`${fid}-facetex`} x="-90%" y="-90%" width="280%" height="280%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.25 0.25" numOctaves="3" seed="6601" />
            <feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
          <filter id={`${fid}-mouthtex`} x="-90%" y="-90%" width="280%" height="280%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.25 0.25" numOctaves="3" seed="7318" />
            <feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <path id={`${fid}-ministar`} transform="translate(-58,-52)"
            d="M85.887 9.196C90.921 16.751 78.446 42.886 78.446 42.886C73.778 42.722 97.410 47.726 106.708 55.553C116.007 63.379 74.620 64.267 74.620 64.267C74.620 64.267 77.864 97.327 71.994 95.365C66.125 93.404 49.367 66.934 49.367 66.934C49.367 66.934 13.541 74.263 8.507 71.250C3.473 68.237 37.585 47.202 37.585 47.202C37.585 47.202 12.939 18.766 18.522 15.273C24.105 11.781 55.557 32.339 55.557 32.339C55.557 32.339 80.854 1.641 85.887 9.196Z" />
        </defs>
        <g data-idle-root>
          <g data-shared />
          <g data-sparkles filter={`url(#${fid}-softblur)`} />
        </g>
      </svg>
    </div>
  );
}
