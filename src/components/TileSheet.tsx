"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import Sheet from "@/components/Sheet";
import PlayerTile, { AvatarTile } from "@/components/PlayerTile";
import { postMeeting } from "@/lib/meeting";
import { MEETING_SERVICE_URL, PARTNERS } from "@/lib/site";
import {
  BACKS,
  BACK_NAMES,
  collabOf,
  facesOn,
  parseTile,
  tileCode,
  type Avatar,
  type Face,
} from "@/lib/avatar";
import { COLLAB_NIGHTS, seasonOn, type Collab } from "@/lib/season";
import {
  addTonightTiles,
  chooseTile,
  chosenTile,
  madeHere,
  serviceTile,
  subscribeTiles,
  tilesVersion,
} from "@/lib/tiles";

// What a screen reader hears for a face whose id isn't a word.
const SAY: Partial<Record<Face, string>> = {
  zhong: "red dragon",
  fa: "green dragon",
  fu: "fortune",
  hat: "witch's hat",
  eggtart: "egg tart",
  fishball: "curry fish balls",
  dolphin: "pink dolphin",
  neon: "neon sign",
  maple: "maple leaf",
  dog: "Shiba dog",
  cat: "ginger cat",
  bird: "blue bird",
  yuanbao: "yuanbao, gold ingot",
};

/** Sends the tile this phone made, so the rest of the meeting sees it. Fire
 * and forget: a service without tiles answers 404 and nothing changes. */
export function shareTile(id: string) {
  const tile = madeHere(id);
  if (!tile || tile === serviceTile(id)) return;
  postMeeting(MEETING_SERVICE_URL, { r: "tile", playerId: id, tile })
    .then((reply) => {
      if (reply.status === 200) addTonightTiles({ [id]: tile });
    })
    .catch(() => {});
}

/** A player's tile and what choosing one does: a bump for the tile on screen,
 * and a line for screen readers. */
export function useTileChoice(id: string) {
  const [bump, setBump] = useState(0);
  const [said, setSaid] = useState("");
  useSyncExternalStore(subscribeTiles, tilesVersion, () => -1);
  const pick = (next: Avatar) => {
    chooseTile(id, tileCode(next));
    setBump((n) => n + 1);
    setSaid(`${SAY[next.face] ?? next.face} on ${next.back}`);
  };
  return { tile: parseTile(chosenTile(id), id), bump, said, pick };
}

/** The sheet with two tabs, Icon and Color, so a player takes one choice at a
 * time. Shares the tile when it closes. */
export default function TileSheet({
  id,
  close,
}: {
  id: string;
  close: () => void;
}) {
  const [tab, setTab] = useState<"face" | "back">("face");
  const { tile, bump, said, pick } = useTileChoice(id);
  const faces = facesOn(new Date());
  // Each partner's faces under its name and logo; the club's own are Classic
  // once a partner's set is in the rack.
  const sets: { club?: Collab; faces: Face[] }[] = [];
  for (const face of faces) {
    const club = collabOf(face);
    const last = sets.at(-1);
    if (last && last.club === club) last.faces.push(face);
    else sets.push({ club, faces: [face] });
  }
  const tonight = seasonOn(new Date(), COLLAB_NIGHTS);
  useEffect(() => () => shareTile(id), [id]);
  return (
    <Sheet title="Your tile" close={close} className="tile-sheet">
      <span
        className="tile-sheet-preview"
        data-bump={bump ? bump % 2 : undefined}
      >
        <PlayerTile id={id} />
      </span>
      <div className="tile-rack-tabs">
        {(["face", "back"] as const).map((part) => (
          <button
            key={part}
            type="button"
            aria-pressed={tab === part}
            onClick={() => setTab(part)}
          >
            {part === "face" ? "Icon" : "Color"}
          </button>
        ))}
      </div>
      {/* Both racks stay in place, the other one hidden, so the sheet keeps one
          height whichever tab is open. */}
      <div className="tile-rack-panels">
        <fieldset className="tile-rack" inert={tab !== "face"}>
          <legend className="sr-only">Icon</legend>
          {sets.map((set) => (
            <div key={set.club ?? "classic"}>
              {sets.length > 1 && (
                <h3 className="tile-rack-set">
                  {set.club && (
                    <Image
                      src={PARTNERS[set.club].logo}
                      alt=""
                      width={24}
                      height={24}
                    />
                  )}
                  {set.club ? PARTNERS[set.club].name : "Classic"}
                </h3>
              )}
              <div className="tile-rack-faces">
                {set.faces.map((face) => (
                  <label key={face}>
                    <input
                      type="radio"
                      name="tile-face"
                      className="sr-only"
                      checked={tile.face === face}
                      onChange={() => pick({ ...tile, face })}
                    />
                    <AvatarTile tile={{ ...tile, face }} />
                    <span className="sr-only">
                      {SAY[face] ?? face}
                      {set.club &&
                        (set.club === tonight
                          ? `, for tonight with the ${PARTNERS[set.club].fullName}`
                          : `, from the night with the ${PARTNERS[set.club].fullName}`)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
        <fieldset className="tile-rack" inert={tab !== "back"}>
          <legend className="sr-only">Color</legend>
          <div className="tile-rack-backs">
            {BACK_NAMES.map((back) => (
              <label key={back}>
                <input
                  type="radio"
                  name="tile-back"
                  className="sr-only"
                  checked={tile.back === back}
                  onChange={() => pick({ ...tile, back })}
                />
                {/* A tile lying face down, which shows only its back. */}
                <span
                  className="player-tile tile-rack-swatch"
                  style={{ "--b": BACKS[back] } as React.CSSProperties}
                />
                <span className="sr-only">{back}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="sr-only" role="status">
        {said}
      </p>
      <button type="button" className="meeting-primary" onClick={close}>
        Done
      </button>
    </Sheet>
  );
}
