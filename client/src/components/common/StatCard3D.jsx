import React, { useRef, useState } from "react";
import useCountUp from "../../hooks/useCountUp";

const THEME = {
  orange: { text: "text-yellow-700", glow: "rgba(202,138,4,.28)", ring: "rgba(202,138,4,.55)" },
  cyan: { text: "text-cyan-700", glow: "rgba(8,145,178,.22)", ring: "rgba(8,145,178,.5)" },
  yellow: { text: "text-yellow-700", glow: "rgba(202,138,4,.28)", ring: "rgba(202,138,4,.55)" },
  purple: { text: "text-purple-700", glow: "rgba(126,34,206,.22)", ring: "rgba(126,34,206,.5)" },
  green: { text: "text-green-700", glow: "rgba(21,128,61,.22)", ring: "rgba(21,128,61,.5)" },
};

/**
 * Glass stat card with cursor-tracked 3D tilt, a glow that follows the
 * pointer, layered depth (icon/value/label sit at different Z offsets),
 * and an animated count-up value. Falls back to a static card on touch
 * devices (no mousemove).
 */
export default function StatCard3D({ icon, value, label, color = "orange", delay = 0 }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [hover, setHover] = useState(false);
  const count = useCountUp(value, 1100);
  const c = THEME[color] || THEME.orange;
  const isNumeric = typeof value === "number" || (!isNaN(parseFloat(value)) && isFinite(value));

  const handleMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (py - 0.5) * -12, y: (px - 0.5) * 12 });
    setGlow({ x: px * 100, y: py * 100 });
  };

  const handleLeave = () => {
    setHover(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="animate-fade-up opacity-0" style={{ animationDelay: `${delay}ms`, perspective: "800px" }}>
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={handleLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hover ? "scale3d(1.03,1.03,1.03)" : "scale3d(1,1,1)"}`,
          transformStyle: "preserve-3d",
          transition: hover ? "transform 90ms ease-out" : "transform 450ms cubic-bezier(.22,1,.36,1)",
        }}
        className="glass relative rounded-2xl p-5 text-center border border-black/10 overflow-hidden cursor-default"
      >
        {/* cursor-follow glow */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: hover ? 1 : 0,
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${c.glow}, transparent 60%)`,
          }}
        />
        {/* hover ring */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{ opacity: hover ? 1 : 0, boxShadow: `inset 0 0 0 1px ${c.ring}, 0 0 24px -6px ${c.ring}` }}
        />

        <div style={{ transform: "translateZ(38px)" }} className="relative mb-2">
          <div className="text-2xl inline-block animate-float3d">{icon}</div>
        </div>
        <div style={{ transform: "translateZ(22px)" }} className={`relative font-bold text-2xl tabular-nums ${c.text}`}>
          {isNumeric ? count : value}
        </div>
        <div style={{ transform: "translateZ(10px)" }} className="relative text-xs text-slate-500 mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}
