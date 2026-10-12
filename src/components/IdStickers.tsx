// UVA computing IDs are six characters at most.
const ID_LENGTH = 6;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/**
 * Each character always gets the same colour, so an ID keeps its pattern
 * from phone to phone. Digits are a plain rainbow, 0 red through 9 pink, in
 * bold colour. Letters are soft pastels, stepped by the golden angle so
 * neighbouring letters land far apart on the colour wheel. Both read at
 * least 5.5:1 against the ink letters.
 */
function stickerStyle(char: string) {
  const digit = "0123456789".indexOf(char);
  return (
    digit >= 0
      ? {
          "--hue": 25 + digit * 34,
          // 2 lands on yellow, which only reads as yellow when it's light.
          "--l": digit === 2 ? 0.87 : 0.72,
          "--c": digit === 2 ? 0.17 : 0.15,
        }
      : {
          "--hue": Math.round(LETTERS.indexOf(char) * 137.508) % 360,
          "--l": 0.86,
          "--c": 0.08,
        }
  ) as React.CSSProperties;
}

/**
 * The computing ID field: six sticker slots that fill as the ID is typed.
 * The real input sits on top, so typing, pasting and focus work as usual.
 */
export default function IdStickers({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  describedBy: string;
}) {
  return (
    <div className="id-stickers">
      <span aria-hidden="true">
        {Array.from({ length: ID_LENGTH }, (_, i) => {
          const char = value[i]?.toLowerCase();
          return char ? (
            <span key={i} style={stickerStyle(char)}>
              {char}
            </span>
          ) : (
            <span key={i} data-slot={i === value.length ? "next" : "open"} />
          );
        })}
      </span>
      <input
        id={id}
        value={value}
        onChange={(event) =>
          // A pasted email keeps only the ID before the @.
          onChange(
            event.target.value
              .replace(/\s/g, "")
              .replace(/@.*$/, "")
              .slice(0, ID_LENGTH),
          )
        }
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
    </div>
  );
}

/** A computing ID already entered, drawn as small tiles. */
export function IdBadge({ value }: { value: string }) {
  return (
    <span className="id-badge" aria-hidden="true">
      {[...value.toLowerCase()].map((char, i) => (
        <span key={i} style={stickerStyle(char)}>
          {char}
        </span>
      ))}
    </span>
  );
}
