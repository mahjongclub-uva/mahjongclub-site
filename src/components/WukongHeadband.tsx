/** Original golden-fillet illustration with Wukong's familiar paired curls. */
export default function WukongHeadband() {
  const band =
    "M5 21 C12 30 60 30 67 21 M5 21 C10 17 18 16 24 17 M67 21 C62 17 54 16 48 17 M24 17 C15 15 18 4 27 5 C35 5 38 17 31 20 C27 22 23 18 26 15 M48 17 C57 15 54 4 45 5 C37 5 34 17 41 20 C45 22 49 18 46 15";
  return (
    <svg
      className="wukong-headband"
      viewBox="0 0 72 34"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={band}
        fill="none"
        stroke="#805b16"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={band}
        fill="none"
        stroke="#e8bd55"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
