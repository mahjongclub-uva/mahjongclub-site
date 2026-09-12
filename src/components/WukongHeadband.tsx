/** An open oval band with inward spirals, shaped after the supplied reference. */
export default function WukongHeadband() {
  const rim = "M24 44 C-4 39 0 17 29 10 C57 3 91 6 106 17 C122 29 109 43 88 45";
  const curls =
    "M7 30 C12 41 31 51 42 43 C57 31 37 18 29 29 C23 39 37 43 38 33 M113 30 C108 41 89 51 78 43 C63 31 83 18 91 29 C97 39 83 43 82 33";
  return (
    <svg
      className="wukong-headband"
      viewBox="0 0 120 56"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(9 3) scale(.85 .9)">
        <path d={rim} fill="none" stroke="#72511e" strokeWidth="4" />
        <path d={rim} fill="none" stroke="#e4bd65" strokeWidth="2" />
        <path
          d={curls}
          fill="none"
          stroke="#78521c"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={curls}
          fill="none"
          stroke="#c99b42"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M12 23 C26 8 78 5 101 18"
          fill="none"
          stroke="#fff0b6"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
