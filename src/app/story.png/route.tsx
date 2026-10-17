/**
 * The weekly Instagram story (design A), rebuilt from the published standings
 * on every deploy. Officers open /story.png on a phone, save it and post it.
 *
 * Satori draws this, not a browser: flexbox only, no CSS variables, and it
 * cannot read woff2, so the fonts come as woff from @fontsource.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { GLYPHS } from "@/components/glyphs";
import { getCurrentSemester } from "@/lib/data";
import { formatPoints } from "@/lib/format";
import { storyBoard, type Move, type StoryEntry } from "@/lib/story";

export const dynamic = "force-static";

const NUMERALS = ["", "一", "二", "三", "四", "伍", "六", "七", "八", "九"];
const INK = "#2e2e2c";
const CHIP: Record<Move["dir"], [string, string]> = {
  up: ["#dce8df", "#1f4d3d"],
  down: ["#f0dcd4", "#8a2a25"],
  held: ["#e6dbb4", "#5a4208"],
  new: ["#e6dbb4", "#5a4208"],
};
const DISPLAY = "Barlow Condensed";
const TILE_EDGE =
  "M8 1 H80 L97 18 V127 Q97 134 90 134 H18 L1 117 V8 Q1 1 8 1 Z";

/** Each SVG is drawn on its own, so each carries its own defs. */
function Tile({
  width,
  rank,
  face = true,
  dragon = false,
  shadow = 0.22,
}: {
  width: number;
  rank?: number;
  face?: boolean;
  dragon?: boolean;
  shadow?: number;
}) {
  return (
    <svg viewBox="-6 -4 110 147" width={width} height={(width * 147) / 110}>
      <defs>
        <linearGradient id="panel" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fffefa" />
          <stop offset="0.55" stopColor="#f6f3ea" />
          <stop offset="1" stopColor="#efe7d3" />
        </linearGradient>
        <pattern
          id="dots"
          width="3.2"
          height="3.2"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <circle cx="1.6" cy="1.6" r="0.8" fill="#58a992" />
        </pattern>
        <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="2.5"
            floodColor="#17372a"
            floodOpacity={shadow}
          />
        </filter>
      </defs>
      <g filter="url(#lift)">
        <path d={TILE_EDGE} fill="#a9d2c3" />
        <path d={TILE_EDGE} fill="url(#dots)" />
        {face && (
          <rect
            x="1"
            y="1"
            width="86"
            height="122"
            rx="8"
            fill="url(#panel)"
            stroke="#b5c5ae"
            strokeWidth="2"
          />
        )}
      </g>
      {rank !== undefined && (
        <g>
          <path
            d={GLYPHS[NUMERALS[rank]]}
            transform="translate(24 19) scale(0.042)"
            fill="#114ba3"
            stroke="#114ba3"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <path
            d={GLYPHS["萬"]}
            transform="translate(20 64) scale(0.048)"
            fill="#c94219"
            stroke="#c94219"
            strokeWidth="8"
            strokeLinejoin="round"
          />
        </g>
      )}
      {dragon && (
        <g
          fill="none"
          stroke="#c94219"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="28" y="51" width="32" height="22" rx="2" />
          <path d="M44 36 V90" />
        </g>
      )}
    </svg>
  );
}

/** The fonts have no ▲▼, so the arrows are drawn. */
const Arrow = ({
  up,
  size,
  color,
}: {
  up: boolean;
  size: number;
  color: string;
}) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path d={up ? "M12 3 L22 20 H2 Z" : "M12 21 L22 4 H2 Z"} fill={color} />
  </svg>
);

function Chip({ move, minWidth }: { move: Move; minWidth?: number }) {
  const [bg, fg] = CHIP[move.dir];
  const arrow = move.dir === "up" || move.dir === "down";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: minWidth ?? 0,
        padding: "6px 18px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: move.dir === "new" ? 1 : 0,
      }}
    >
      {arrow && <Arrow up={move.dir === "up"} size={22} color={fg} />}
      {move.text}
    </div>
  );
}

function Podium({ entry, first }: { entry: StoryEntry; first: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ height: 185, display: "flex", alignItems: "flex-end" }}>
        <Tile
          width={first ? 139 : 108}
          rank={entry.rank}
          shadow={first ? 0.28 : 0.22}
        />
      </div>
      <div
        style={{
          marginTop: 16,
          height: 76,
          display: "flex",
          alignItems: "flex-end",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: first ? 66 : 54,
          maxWidth: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.name}
      </div>
      <div
        style={{
          height: 100,
          display: "flex",
          alignItems: "flex-end",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: first ? 92 : 72,
          color: first ? "#2a6350" : INK,
        }}
      >
        {formatPoints(entry.score)}
      </div>
      {entry.move && (
        <div style={{ display: "flex", marginTop: 6 }}>
          <Chip move={entry.move} />
        </div>
      )}
    </div>
  );
}

function Row({ entry }: { entry: StoryEntry }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        height: 88,
        borderBottom: "2px solid #c7cfbc",
      }}
    >
      <Tile width={65} rank={entry.rank} shadow={0.2} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 54,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.name}
      </div>
      {entry.move && <Chip move={entry.move} minWidth={128} />}
      <div
        style={{
          width: 104,
          display: "flex",
          justifyContent: "flex-end",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 60,
        }}
      >
        {formatPoints(entry.score)}
      </div>
    </div>
  );
}

const font = (file: string) =>
  readFile(path.join(process.cwd(), "node_modules/@fontsource", file));

export async function GET() {
  const story = storyBoard(getCurrentSemester());
  // A podium reads 2nd, 1st, 3rd.
  const podium = [story.podium[1], story.podium[0], story.podium[2]].filter(
    Boolean,
  );

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "250px 88px 270px",
        background: "#f5eedc",
        color: INK,
        fontFamily: "Public Sans",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -34,
          top: 70,
          display: "flex",
          transform: "rotate(18deg)",
        }}
      >
        <Tile width={168} dragon shadow={0.25} />
      </div>
      <div
        style={{
          position: "absolute",
          left: -40,
          bottom: 40,
          display: "flex",
          transform: "rotate(-22deg)",
        }}
      >
        <Tile width={157} face={false} shadow={0.25} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4.7,
            textTransform: "uppercase",
            color: "#9d302b",
          }}
        >
          {`Mahjong Club @ UVA · ${story.label}`}
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 140,
            lineHeight: 0.95,
            textTransform: "uppercase",
          }}
        >
          Leaderboard
        </div>
        {story.date && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 20px",
              borderRadius: 999,
              background: "#dce8df",
              color: "#1f4d3d",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 2.9,
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: "#1f4d3d",
              }}
            />
            {`Official · ${story.date}`}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {podium.map((entry) => (
            <Podium
              key={entry.name}
              entry={entry}
              first={entry === story.podium[0]}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {story.rows.map((entry) => (
            <Row key={entry.name} entry={entry} />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 32,
          minHeight: 100,
        }}
      >
        {story.climb ? (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 3.4,
                textTransform: "uppercase",
                color: "#6e5210",
              }}
            >
              Biggest climb
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 60,
                  lineHeight: 1.1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {story.climb.name}
              </div>
              <Chip move={{ dir: "up", text: String(story.climb.places) }} />
            </div>
          </div>
        ) : (
          <div />
        )}
        {story.hasMoves && (
          <div
            style={{
              flex: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              fontSize: 24,
              lineHeight: 1.4,
              color: "#585850",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Arrow up size={16} color="#585850" />
              <Arrow up={false} size={16} color="#585850" />
              <div style={{ marginLeft: 4 }}>places moved</div>
            </div>
            <div>since last meeting</div>
          </div>
        )}
      </div>

      <svg
        width="1080"
        height="1920"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.20  0 0 0 0 0.26  0 0 0 0 0.19  0 0 0 0.55 0"
          />
        </filter>
        <rect width="1080" height="1920" filter="url(#grain)" opacity="0.2" />
      </svg>
    </div>,
    {
      width: 1080,
      height: 1920,
      fonts: [
        {
          name: "Public Sans",
          data: await font(
            "public-sans/files/public-sans-latin-400-normal.woff",
          ),
          weight: 400,
        },
        {
          name: "Public Sans",
          data: await font(
            "public-sans/files/public-sans-latin-700-normal.woff",
          ),
          weight: 700,
        },
        {
          name: DISPLAY,
          data: await font(
            "barlow-condensed/files/barlow-condensed-latin-600-normal.woff",
          ),
          weight: 600,
        },
        {
          name: DISPLAY,
          data: await font(
            "barlow-condensed/files/barlow-condensed-latin-700-normal.woff",
          ),
          weight: 700,
        },
      ],
    },
  );
}
