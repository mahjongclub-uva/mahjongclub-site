import { Tile } from "@/components/PlayingTile";

const FLOWERS = [
  { name: "Plum blossom", character: "梅" },
  { name: "Orchid", character: "蘭" },
  { name: "Chrysanthemum", character: "菊" },
  { name: "Bamboo", character: "竹" },
];

/** Traditional subjects, drawn here rather than copied from a particular set. */
export default function FlowerTile({ rank }: { rank: 1 | 2 | 3 | 4 }) {
  const flower = FLOWERS[rank - 1];
  return (
    <Tile name={`${flower.name} flower tile, ${rank}`} rank={rank}>
      <text
        x="66"
        y="32"
        textAnchor="middle"
        fontSize="19"
        fontFamily="var(--font-han)"
        fill="#114ba3"
      >
        {flower.character}
      </text>
      <g
        fill="none"
        stroke="#236951"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {rank === 1 && (
          <>
            <path
              d="M27 103 Q44 77 46 47 M36 84 L25 62 M43 66 L60 54"
              stroke="#765239"
              strokeWidth="3"
            />
            {[
              [26, 61],
              [46, 47],
              [58, 55],
            ].map(([x, y]) => (
              <g key={x} transform={`translate(${x} ${y})`}>
                {[0, 72, 144, 216, 288].map((angle) => (
                  <ellipse
                    key={angle}
                    cx="0"
                    cy="-5"
                    rx="3.6"
                    ry="4.8"
                    transform={`rotate(${angle})`}
                    fill="#f4f2e9"
                    stroke="#b6412c"
                    strokeWidth="1.5"
                  />
                ))}
                <circle r="2" fill="#c29431" stroke="none" />
              </g>
            ))}
          </>
        )}
        {rank === 2 && (
          <>
            <path d="M39 103 Q14 67 28 45 Q22 73 39 103 Q56 71 51 50 Q63 78 39 103 M39 103 Q43 74 38 56" />
            <g transform="translate(38 53)" stroke="#114ba3" strokeWidth="1.5">
              <path
                d="M0 0 C-19 -2 -16 -12 -3 -5 C-9 -22 5 -22 3 -6 C17 -17 20 -5 6 1 C18 9 10 15 2 6 C-4 17 -12 10 -3 3 Z"
                fill="#f4f2e9"
              />
              <path
                d="M-3 2 Q0 -2 4 2 L1 6 Z"
                fill="#b6412c"
                stroke="#b6412c"
              />
            </g>
          </>
        )}
        {rank === 3 && (
          <>
            <path d="M39 103 Q45 81 42 57 M42 87 Q24 76 26 71 Q43 71 42 87 M43 79 Q60 63 63 70 Q60 82 43 79" />
            <g transform="translate(41 51)" stroke="#b6412c" strokeWidth="1.1">
              {Array.from({ length: 12 }, (_, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-9"
                  rx="2.7"
                  ry="9"
                  transform={`rotate(${i * 30})`}
                  fill="#f4f2e9"
                />
              ))}
              <circle r="4" fill="#c29431" stroke="#b17c25" />
            </g>
          </>
        )}
        {rank === 4 && (
          <>
            <path d="M35 103 L38 40 M49 103 L52 56" strokeWidth="3" />
            <path d="M33 86 L40 86 M34 67 L41 67 M46 88 L53 88 M47 73 L54 73" />
            <path
              d="M38 62 Q20 43 19 51 Q23 62 38 62 M39 69 Q58 47 59 55 Q54 68 39 69 M50 83 Q64 67 67 73 Q63 84 50 83 M35 91 Q20 76 19 82 Q23 92 35 91"
              fill="#236951"
              strokeWidth="1"
            />
          </>
        )}
      </g>
    </Tile>
  );
}
