import React, { useCallback, useEffect, useRef, useState } from "react";
import StarKid from "./StarKid.jsx";

/*
 * 悬浮版星星小人：可在页面上任意拖动，说明文字跟着一起走，右上角可关闭。
 *
 * props
 *   state      角色状态
 *   caption    角色下方显示的文字
 *   micLevel   0-1，驱动嘴巴开合
 *   size       角色渲染宽度
 *   storageKey localStorage 键名前缀
 *   onClose    关闭后的回调
 */

const PAD = 12;
const DRAG_THRESHOLD = 4;

export default function FloatingStarKid({
  state = "idle",
  caption = "",
  micLevel = 0,
  size = 190,
  storageKey = "starkid",
  onClose,
}) {
  const cardRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(`${storageKey}:dismissed`) === "1";
    } catch {
      return false;
    }
  });
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);

  const clamp = useCallback((x, y) => {
    const el = cardRef.current;
    const w = el ? el.offsetWidth : size;
    const h = el ? el.offsetHeight : size;
    return {
      x: Math.min(Math.max(x, PAD), Math.max(PAD, window.innerWidth - w - PAD)),
      y: Math.min(Math.max(y, PAD), Math.max(PAD, window.innerHeight - h - PAD)),
    };
  }, [size]);

  const paint = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transform =
        `translate3d(${Math.round(posRef.current.x)}px, ${Math.round(posRef.current.y)}px, 0)`;
    }
  }, []);

  /* 首次挂载：读回上次位置，没有就落在左下角 */
  useEffect(() => {
    let start = null;
    try {
      const raw = localStorage.getItem(`${storageKey}:pos`);
      if (raw) start = JSON.parse(raw);
    } catch { /* 读不到就用默认位置 */ }
    const el = cardRef.current;
    const h = el ? el.offsetHeight : size + 60;
    posRef.current = clamp(
      start && Number.isFinite(start.x) ? start.x : PAD + 12,
      start && Number.isFinite(start.y) ? start.y : window.innerHeight - h - 24,
    );
    paint();
    setReady(true);
  }, [clamp, paint, size, storageKey]);

  /* 窗口尺寸变化时拉回可视区 */
  useEffect(() => {
    const onResize = () => {
      posRef.current = clamp(posRef.current.x, posRef.current.y);
      paint();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp, paint]);

  const commit = useCallback(() => {
    try {
      localStorage.setItem(`${storageKey}:pos`, JSON.stringify(posRef.current));
    } catch { /* 无痕模式下写不进去，忽略 */ }
  }, [storageKey]);

  const onPointerDown = (e) => {
    if (e.target.closest("[data-no-drag]")) return;
    if (e.button != null && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: posRef.current.x,
      oy: posRef.current.y,
      moved: false,
    };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
    }
    posRef.current = clamp(d.ox + dx, d.oy + dy);
    paint();
  };

  const endDrag = (e) => {
    if (!dragRef.current) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;
    if (e && e.pointerId != null && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (moved) {
      setDragging(false);
      commit();
    }
  };

  /* 方向键微调，给键盘用户 */
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 24 : 6;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    posRef.current = clamp(posRef.current.x + d[0], posRef.current.y + d[1]);
    paint();
    commit();
  };

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(`${storageKey}:dismissed`, "1");
    } catch { /* 忽略 */ }
    onClose?.();
  };

  if (dismissed) return null;

  return (
    <div
      ref={cardRef}
      role="group"
      aria-label="星星，可拖动的练习伙伴"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 60,
        width: size + 40,
        padding: "8px 10px 10px",
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        WebkitUserSelect: "none",
        opacity: ready ? 1 : 0,
        transition: dragging ? "none" : "opacity 0.3s ease, filter 0.2s ease",
        filter: dragging ? "drop-shadow(0 10px 20px rgba(42, 37, 33, 0.16))" : "none",
        outline: "none",
      }}
      className="starkid-float"
    >
      <button
        data-no-drag
        type="button"
        onClick={close}
        aria-label="关闭星星"
        className="starkid-close"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 26,
          height: 26,
          display: "grid",
          placeItems: "center",
          borderRadius: 999,
          border: "1px solid #EDE4D6",
          background: "#FFFFFF",
          color: "#5C5349",
          cursor: "pointer",
          padding: 0,
          lineHeight: 0,
          boxShadow: "0 1px 3px rgba(42, 37, 33, 0.10)",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <StarKid state={state} micLevel={micLevel} size={size} style={{ margin: "0 auto", pointerEvents: "none" }} />

      {caption ? (
        <p
          style={{
            margin: "2px 0 0",
            textAlign: "center",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#5C5349",
            background: "#FFFFFF",
            border: "1px solid #EDE4D6",
            borderRadius: 14,
            padding: "7px 12px",
            boxShadow: "0 1px 3px rgba(42, 37, 33, 0.06)",
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
