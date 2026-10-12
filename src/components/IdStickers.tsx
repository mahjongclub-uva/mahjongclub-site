// UVA computing IDs are six characters at most.
const ID_LENGTH = 6;
const STICKER_HUES = [28, 95, 230, 300, 160, 350];

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
            <span
              key={i}
              style={{ "--hue": STICKER_HUES[i] } as React.CSSProperties}
            >
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
