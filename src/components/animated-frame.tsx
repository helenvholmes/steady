import { frameColor, gradientColors } from "@/lib/frame";
import { AnimatedFrameLayer } from "./animated-frame-layer";

/**
 * The "animated gradient" frame: Fancy Components' AnimatedGradient (fancycomponents.dev) in shades of the frame
 * color, behind the page, showing through the frame (the page itself stays white). Turned on in Settings.
 * Motion stops with reduced motion.
 */
export function AnimatedFrame({ colorId }: { colorId: string }) {
  const frame = frameColor(colorId);
  const light = gradientColors(frame.light);
  const dark = gradientColors(frame.dark);
  return (
    <>
      <style>{`
        body { border-color: transparent; background-clip: padding-box; }
        .animated-frame { --g0: ${light[0]}; --g1: ${light[1]}; --g2: ${light[2]}; --g3: ${light[3]}; }
        @media (prefers-color-scheme: dark) {
          .animated-frame { --g0: ${dark[0]}; --g1: ${dark[1]}; --g2: ${dark[2]}; --g3: ${dark[3]}; }
        }
      `}</style>
      <AnimatedFrameLayer />
    </>
  );
}
