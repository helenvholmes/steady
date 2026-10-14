"use client";

import dynamic from "next/dynamic";

// Fancy Components' AnimatedGradient picks random positions while rendering, so it renders in the browser only
// (a server render would never match).
const AnimatedGradient = dynamic(() => import("./fancy/animated-gradient-with-svg"), { ssr: false });

export function AnimatedFrameLayer() {
  return (
    <div aria-hidden className="animated-frame">
      <AnimatedGradient colors={["var(--g0)", "var(--g1)", "var(--g2)", "var(--g3)"]} speed={20} blur="heavy" />
    </div>
  );
}
