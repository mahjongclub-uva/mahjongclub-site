"use client";

import Link from "next/link";
import { IconArrowRight, IconSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";
import type { Standing, Unranked } from "@/lib/schema";
import { StandingRow } from "@/components/StandingParts";

export default function PlayerSearch({
  standings,
  unranked,
  seasonNet,
  minTables,
}: {
  standings: Standing[];
  unranked: Unranked[];
  seasonNet: boolean;
  minTables: number;
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
              placeholder="Type your name"
              autoComplete="off"
              aria-describedby="search-status"
            />
            {term && (
              <span
                className="search-count"
                data-none={count === 0 || undefined}
                aria-hidden="true"
              >
                {count} found
              </span>
            )}
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  // The button goes with the text; keep focus in the box.
                  document.getElementById("player-query")?.focus();
                }}
              >
                <IconX size={20} stroke={2.4} aria-hidden="true" />
              </button>
            )}
          </div>
          {!term && (
            <p className="search-hint">
              Anyone who has played a scored table shows up here.
            </p>
          )}
          <p className="sr-only" id="search-status" role="status">
            {term
              ? `${count} ${count === 1 ? "player" : "players"} found.`
              : ""}
          </p>
          {term && count === 0 && (
            <div className="search-empty">
              <strong>Not on the board yet</strong>
              <p>
                Play {minTables === 1 ? "one table" : `${minTables} tables`} at
                a meeting and you’re on it.
              </p>
              <Link href="/#when">
                Next meeting <IconArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          )}
          {count > 0 && (
            <ul className="standings">
              {ranked.map((player) => (
                <StandingRow
                  key={player.id}
                  player={player}
                  seasonNet={seasonNet}
                  match={term}
                />
              ))}
              {waiting.map((player) => (
                <li key={player.id} className="standing">
                  <span className="standing-tile rank-plain" aria-hidden="true">
                    –
                  </span>
                  <span className="standing-player">
                    <span className="standing-name">{player.display}</span>
                    <span className="lb-tables">
                      {player.tables_needed} more{" "}
                      {player.tables_needed === 1 ? "table" : "tables"} to rank
                    </span>
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
