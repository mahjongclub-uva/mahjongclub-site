"use client";

import { useState } from "react";
import type { Standing, Unranked } from "@/lib/schema";

export default function PlayerSearch({
  standings,
  unranked,
}: {
  standings: Standing[];
  unranked: Unranked[];
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase();
  const ranked = term
    ? standings.filter((p) => p.display.toLocaleLowerCase().includes(term))
    : [];
  const waiting = term
    ? unranked.filter((p) => p.display.toLocaleLowerCase().includes(term))
    : [];
  const count = ranked.length + waiting.length;

  return (
    <section className="section player-search" aria-labelledby="find-player">
      <div className="section-wrap">
        <p className="eyebrow">Beyond the top nine</p>
        <h2 className="section-title" id="find-player">
          Find your place
        </h2>
        <label htmlFor="player-query">Search by public display name</label>
        <div className="search-field">
          <input
            id="player-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter a name"
            autoComplete="off"
            aria-describedby="search-status"
          />
          {query && (
            <button
              type="button"
              className="action-link"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          )}
        </div>
        <p className="quiet" id="search-status" role="status">
          {term
            ? `${count} ${count === 1 ? "player" : "players"} found.`
            : "Search all players this semester. The leaderboard above always shows the top nine."}
        </p>
        {term && count === 0 && (
          <p>
            Try a first name or a shorter spelling. Only public display names
            are searchable.
          </p>
        )}
        {count > 0 && (
          <ul className="search-results">
            {ranked.map((player) => (
              <li key={player.id}>
                <strong>{player.display}</strong>
                <span>
                  Rank <b>{player.rank}</b>
                </span>
                <span>
                  <b>{player.total_gain}</b> points
                </span>
              </li>
            ))}
            {waiting.map((player) => (
              <li key={player.id}>
                <strong>{player.display}</strong>
                <span>Not yet ranked</span>
                <span>
                  {player.tables_needed} more{" "}
                  {player.tables_needed === 1 ? "table" : "tables"} to qualify
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
