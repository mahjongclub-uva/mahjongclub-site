import { OneDot } from "@/components/TileArtwork";

/**
 * A one-dot that rolls across the page as you scroll past it.
 *
 * Deliberately not the flip that was here before. That one pinned the viewport
 * for two and a half screens to turn a single tile over; this is a band you
 * scroll through at your own pace, and if you go quickly you simply see a dot
 * go by. Nothing is held hostage to finish an animation.
 *
 * Scroll-driven CSS on an anonymous view timeline — no pinning, no listener,
 * no JavaScript. Without support, or under reduced motion, the dot sits still
 * in the middle of the band, which is a perfectly good divider.
 *
 * It reads as rolling rather than sliding because the rotation is tied to the
 * travel, and because the dot has petals. See OneDot: concentric rings alone
 * are rotationally symmetric and cannot be seen to turn at all.
 */
export default function RollingDot() {
  return (
    <div className="roll" aria-hidden="true">
      <div className="roll-dot">
        <svg viewBox="0 0 64 64" focusable="false">
          <OneDot x={32} y={32} r={30} />
        </svg>
      </div>
    </div>
  );
}
