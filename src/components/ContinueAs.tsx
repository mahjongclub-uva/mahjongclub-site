import type { Player } from "@/lib/meeting";

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
      <p className="meeting-intro">
        This phone was last used by {player.display}.
      </p>
      <button type="button" className="meeting-primary" onClick={yes}>
        Continue as {player.display}
      </button>
      <button type="button" className="meeting-text" onClick={no}>
        I’m someone else
      </button>
    </div>
  );
}
