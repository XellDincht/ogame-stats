from __future__ import annotations

from datetime import datetime
from os import environ
from zoneinfo import ZoneInfo
import json
import logging
import sys
import traceback

from ogame_api import OGameApi, OGameApiError, SCORE_TYPES
from supabase_store import SupabaseConfig, SupabaseError, SupabaseStore


ALLIANCE_SCORE_TYPES = {
    "total": 0,
    "economy": 1,
    "research": 2,
    "military": 3,
    "honor": 7,
}


def required_env(name: str) -> str:
    value = environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"GitHub Secret/Variable {name} fehlt.")
    return value


def score_value(scores: dict, category: str, attribute: str):
    score = scores.get(category)
    return getattr(score, attribute) if score is not None else None


def player_score_columns(scores: dict) -> dict:
    return {
        "total_points": score_value(scores, "total", "score"),
        "total_rank": score_value(scores, "total", "position"),
        "economy_points": score_value(scores, "economy", "score"),
        "economy_rank": score_value(scores, "economy", "position"),
        "research_points": score_value(scores, "research", "score"),
        "research_rank": score_value(scores, "research", "position"),
        "military_points": score_value(scores, "military", "score"),
        "military_rank": score_value(scores, "military", "position"),
        "military_lost_points": score_value(scores, "military_lost", "score"),
        "military_lost_rank": score_value(scores, "military_lost", "position"),
        "military_built_points": score_value(scores, "military_built", "score"),
        "military_built_rank": score_value(scores, "military_built", "position"),
        "military_destroyed_points": score_value(scores, "military_destroyed", "score"),
        "military_destroyed_rank": score_value(scores, "military_destroyed", "position"),
        "honor_points": score_value(scores, "honor", "score"),
        "honor_rank": score_value(scores, "honor", "position"),
        "ships": score_value(scores, "military", "ships"),
    }


def alliance_score_columns(scores: dict) -> dict:
    return {
        "total_points": score_value(scores, "total", "score"),
        "total_rank": score_value(scores, "total", "position"),
        "economy_points": score_value(scores, "economy", "score"),
        "economy_rank": score_value(scores, "economy", "position"),
        "research_points": score_value(scores, "research", "score"),
        "research_rank": score_value(scores, "research", "position"),
        "military_points": score_value(scores, "military", "score"),
        "military_rank": score_value(scores, "military", "position"),
        "honor_points": score_value(scores, "honor", "score"),
        "honor_rank": score_value(scores, "honor", "position"),
    }


def update_memberships(
    store: SupabaseStore,
    universe: str,
    alliance_id: int,
    player_ids: set[int],
    collected_at: str,
) -> None:
    active = store.select(
        "ogame_alliance_memberships",
        "id,player_id",
        universe=store.eq(universe),
        alliance_id=store.eq(alliance_id),
        is_active=store.eq("true"),
    )
    active_by_player = {int(row["player_id"]): row["id"] for row in active}

    new_ids = sorted(player_ids - set(active_by_player))
    if new_ids:
        store.insert("ogame_alliance_memberships", [
            {
                "universe": universe,
                "alliance_id": alliance_id,
                "player_id": player_id,
                "joined_at": collected_at,
                "last_seen_at": collected_at,
                "is_active": True,
            }
            for player_id in new_ids
        ])

    continuing = sorted(player_ids & set(active_by_player))
    if continuing:
        store.update(
            "ogame_alliance_memberships",
            {"last_seen_at": collected_at},
            universe=store.eq(universe),
            alliance_id=store.eq(alliance_id),
            is_active=store.eq("true"),
            player_id=store.in_(continuing),
        )

    departed = sorted(set(active_by_player) - player_ids)
    if departed:
        store.update(
            "ogame_alliance_memberships",
            {
                "is_active": False,
                "left_at": collected_at,
                "last_seen_at": collected_at,
            },
            universe=store.eq(universe),
            alliance_id=store.eq(alliance_id),
            is_active=store.eq("true"),
            player_id=store.in_(departed),
        )
        store.update(
            "ogame_public_players",
            {"is_active": False, "last_seen_at": collected_at},
            universe=store.eq(universe),
            player_id=store.in_(departed),
        )


def run() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    supabase_url = required_env("SUPABASE_URL")
    service_key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    universe = required_env("OGAME_UNIVERSE").lower()
    alliance_id = int(required_env("OGAME_ALLIANCE_ID"))
    timezone_name = environ.get("OGAME_TIMEZONE", "Europe/Vienna").strip()

    now = datetime.now(ZoneInfo(timezone_name))
    snapshot_date = now.date().isoformat()
    started_at = now.isoformat()

    store = SupabaseStore(SupabaseConfig(supabase_url, service_key))
    run_rows = store.insert(
        "ogame_collector_runs",
        {
            "universe": universe,
            "started_at": started_at,
            "status": "running",
            "snapshot_date": snapshot_date,
            "alliance_id": alliance_id,
        },
        returning=True,
    )
    run_id = run_rows[0]["id"] if isinstance(run_rows, list) and run_rows else None

    try:
        api = OGameApi(universe)
        players_timestamp, all_players = api.players()
        alliance_players = [p for p in all_players if p.alliance_id == alliance_id]
        if not alliance_players:
            raise RuntimeError(f"Keine Mitglieder für Allianz-ID {alliance_id} gefunden.")

        alliances_timestamp, alliances = api.alliances()
        alliance = next((item for item in alliances if item.alliance_id == alliance_id), None)
        if alliance is None:
            raise RuntimeError(f"Allianz-ID {alliance_id} fehlt in alliances.xml.")

        wanted_ids = {player.player_id for player in alliance_players}
        api_timestamp, player_scores = api.collect_scores(wanted_ids)
        api_timestamp = max(api_timestamp, players_timestamp, alliances_timestamp)

        alliance_scores = {}
        for name, score_type in ALLIANCE_SCORE_TYPES.items():
            try:
                timestamp, scores = api.highscore(score_type, category=2)
                api_timestamp = max(api_timestamp, timestamp)
                if alliance_id in scores:
                    alliance_scores[name] = scores[alliance_id]
            except OGameApiError as exc:
                logging.warning(
                    "Allianz-Highscore %s vorübergehend nicht verfügbar: %s",
                    name,
                    exc,
                )

        collected_at = datetime.now(ZoneInfo(timezone_name)).isoformat()

        existing_players = store.select(
            "ogame_public_players",
            "player_id,first_seen_at",
            universe=store.eq(universe),
            player_id=store.in_(sorted(wanted_ids)),
        )
        first_seen = {
            int(row["player_id"]): row.get("first_seen_at")
            for row in existing_players
        }

        store.upsert(
            "ogame_public_players",
            [
                {
                    "universe": universe,
                    "player_id": player.player_id,
                    "player_name": player.name,
                    "status": player.status,
                    "alliance_id": alliance_id,
                    "first_seen_at": first_seen.get(player.player_id) or collected_at,
                    "last_seen_at": collected_at,
                    "is_active": True,
                }
                for player in alliance_players
            ],
            "universe,player_id",
        )

        # Tageshistorie ist unveränderlich: Der erste erfolgreiche Lauf des
        # Kalendertages bleibt bestehen. Weitere manuelle oder geplante Läufe
        # dürfen diesen 24h-Vergleichspunkt nicht überschreiben.
        store.insert_ignore_conflicts(
            "ogame_player_snapshots",
            [
                {
                    "universe": universe,
                    "snapshot_date": snapshot_date,
                    "collected_at": collected_at,
                    "api_timestamp": api_timestamp,
                    "player_id": player.player_id,
                    **player_score_columns(player_scores.get(player.player_id, {})),
                }
                for player in alliance_players
            ],
            "universe,snapshot_date,player_id",
        )

        store.insert_ignore_conflicts(
            "ogame_alliance_snapshots",
            {
                "universe": universe,
                "snapshot_date": snapshot_date,
                "collected_at": collected_at,
                "api_timestamp": api_timestamp,
                "alliance_id": alliance_id,
                "alliance_name": alliance.name,
                "alliance_tag": alliance.tag,
                "member_count": len(alliance_players),
                **alliance_score_columns(alliance_scores),
            },
            "universe,snapshot_date,alliance_id",
        )

        update_memberships(store, universe, alliance_id, wanted_ids, collected_at)

        if run_id is not None:
            store.update(
                "ogame_collector_runs",
                {
                    "status": "success",
                    "finished_at": datetime.now(ZoneInfo(timezone_name)).isoformat(),
                    "player_count": len(alliance_players),
                    "details": {
                        "api_timestamp": api_timestamp,
                        "alliance_name": alliance.name,
                        "alliance_tag": alliance.tag,
                        "source": "github-actions-python",
                    },
                },
                id=store.eq(run_id),
            )

        logging.info(
            "Erfolgreich: %s Spieler, Allianz %s [%s], Snapshot %s.",
            len(alliance_players),
            alliance.name,
            alliance.tag,
            snapshot_date,
        )
        return 0

    except Exception as exc:
        logging.error("Collector fehlgeschlagen: %s", exc)
        logging.debug("%s", traceback.format_exc())
        if run_id is not None:
            try:
                store.update(
                    "ogame_collector_runs",
                    {
                        "status": "error",
                        "finished_at": datetime.now(ZoneInfo(timezone_name)).isoformat(),
                        "error_message": str(exc)[:2000],
                        "details": {
                            "source": "github-actions-python",
                            "traceback": traceback.format_exc()[-8000:],
                        },
                    },
                    id=store.eq(run_id),
                )
            except Exception as log_exc:
                logging.error("Fehlerlauf konnte nicht protokolliert werden: %s", log_exc)
        raise


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except (RuntimeError, ValueError, OGameApiError, SupabaseError) as exc:
        logging.error("Abbruch: %s", exc)
        raise SystemExit(1)
