import { useState } from "react";
import {
  playerConfirmed,
  rememberPlayer,
  savedPlayer,
  type Meeting,
  type Player,
} from "@/lib/meeting";

/**
 * This phone's player. Choosing one, or switching away, is an explicit
 * identity choice; a player remembered from an earlier visit must confirm
 * first, so `prompt` is the question to show until they do.
 */
export function useConfirmedPlayer(meeting: Meeting) {
  const [player, setPlayerState] = useState(() => savedPlayer(meeting));
  const [confirmed, setConfirmed] = useState(() => playerConfirmed());
  // Check-in passes the meeting id from its reply, which it may have sent
  // before this page heard back about the meeting.
  function setPlayer(next: Player | null, meetingId = meeting.meetingId) {
    setPlayerState(next);
    setConfirmed(Boolean(next));
    rememberPlayer({ ...meeting, meetingId }, next);
  }
  const prompt =
    player && !confirmed ? (
      <ContinueAs
        player={player}
        yes={() => setPlayer(player)}
        no={() => setPlayer(null)}
      />
    ) : null;
  return { player, setPlayer, prompt };
}

/** Reopening the browser asks before acting as the last person on this phone. */
export default function ContinueAs({
  player,
  yes,
  no,
}: {
  player: Player;
  yes: () => void;
  no: () => void;
}) {
  return (
    <div className="meeting-form">
      <h1>Continue as {player.display.split(" ")[0]}?</h1>
      <button type="button" className="meeting-primary" onClick={yes}>
        Continue as {player.display}
      </button>
      <button type="button" className="meeting-text" onClick={no}>
        I’m someone else
      </button>
    </div>
  );
}
