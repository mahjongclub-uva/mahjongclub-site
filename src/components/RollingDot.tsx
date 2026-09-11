import { OneDot } from "@/components/TileArtwork";

/** Decorative dot; RevealSection aligns its trailing edge with the text reveal. */
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
