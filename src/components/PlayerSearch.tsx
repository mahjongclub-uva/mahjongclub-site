"use client";

import { IconSearch, IconCards, IconTrophy } from "@tabler/icons-react";
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
        <div className="search-panel">
          <IconCards
            className="search-decoration"
            size={76}
            stroke={1.2}
            aria-hidden="true"
          />
          <h2 className="section-title" id="find-player">
            Don’t see yourself?
          </h2>
          <label className="sr-only" htmlFor="player-query">
            Search for your name
          </label>
          <div className="search-field">
            <IconSearch className="search-icon" size={22} aria-hidden="true" />
            <input
              id="player-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for your name"
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
          <p
            className={term ? "quiet" : "sr-only"}
            id="search-status"
            role="status"
          >
            {term
              ? `${count} ${count === 1 ? "player" : "players"} found.`
              : ""}
          </p>
          {term && count === 0 && (
            <p>Try a first name or a shorter spelling.</p>
          )}
          {count > 0 && (
            <ul className="search-results">
              {ranked.map((player) => (
                <li key={player.id}>
                  <strong>{player.display}</strong>
                  <span>
                    <IconTrophy size={18} aria-hidden="true" /> Rank{" "}
                    <b>{player.rank}</b>
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
      </div>
    </section>
  );
}
