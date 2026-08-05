from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET
import logging
import time


SCORE_TYPES = {
    "total": 0,
    "economy": 1,
    "research": 2,
    "military": 3,
    "military_lost": 4,
    "military_built": 5,
    "military_destroyed": 6,
    "honor": 7,
}


class OGameApiError(RuntimeError):
    pass


@dataclass(frozen=True)
class Player:
    player_id: int
    name: str
    status: str
    alliance_id: int | None


@dataclass(frozen=True)
class Score:
    player_id: int
    position: int
    score: int
    ships: int | None = None


@dataclass(frozen=True)
class Alliance:
    alliance_id: int
    name: str
    tag: str


class OGameApi:
    def __init__(self, server: str, timeout: int = 30) -> None:
        self.server = server.strip().lower()
        self.base_url = f"https://{self.server}.ogame.gameforge.com/api"
        self.timeout = timeout
        self.user_agent = "OGameAllianceStats/2.0"

    def _get_xml(self, endpoint: str, params: dict[str, object] | None = None) -> ET.Element:
        url = f"{self.base_url}/{endpoint}"
        if params:
            url += "?" + urlencode(params)

        request = Request(url, headers={"User-Agent": self.user_agent})
        retry_delays = (0, 5, 15, 30)
        payload = None
        last_error: Exception | None = None

        for attempt, delay in enumerate(retry_delays, start=1):
            if delay:
                logging.warning(
                    "OGame-API vor Versuch %d/%d: %d Sekunden warten (%s).",
                    attempt, len(retry_delays), delay, endpoint,
                )
                time.sleep(delay)
            try:
                with urlopen(request, timeout=self.timeout) as response:
                    payload = response.read()
                break
            except HTTPError as exc:
                last_error = exc
                if exc.code not in {429, 500, 502, 503, 504} or attempt == len(retry_delays):
                    raise OGameApiError(f"HTTP-Fehler {exc.code} bei {url}") from exc
                logging.warning(
                    "Temporärer HTTP-Fehler %s bei %s (Versuch %d/%d).",
                    exc.code, url, attempt, len(retry_delays),
                )
            except (URLError, TimeoutError) as exc:
                last_error = exc
                if attempt == len(retry_delays):
                    reason = getattr(exc, "reason", str(exc))
                    raise OGameApiError(f"Netzwerk-/Zeitfehler bei {url}: {reason}") from exc
                logging.warning(
                    "Temporärer Netzwerkfehler bei %s (Versuch %d/%d): %s",
                    url, attempt, len(retry_delays), exc,
                )

        if payload is None:
            raise OGameApiError(f"Keine Antwort von {url}") from last_error

        try:
            return ET.fromstring(payload)
        except ET.ParseError as exc:
            raise OGameApiError(f"Ungültige XML-Antwort von {url}") from exc

    def players(self) -> tuple[int, list[Player]]:
        root = self._get_xml("players.xml")
        timestamp = int(root.attrib.get("timestamp", "0"))
        players = []
        for node in root.findall("player"):
            alliance = node.attrib.get("alliance")
            players.append(Player(
                player_id=int(node.attrib["id"]),
                name=node.attrib["name"],
                status=node.attrib.get("status", ""),
                alliance_id=int(alliance) if alliance else None,
            ))
        return timestamp, players

    def alliances(self) -> tuple[int, list[Alliance]]:
        root = self._get_xml("alliances.xml")
        timestamp = int(root.attrib.get("timestamp", "0"))
        items = []
        for node in root.findall("alliance"):
            items.append(Alliance(
                alliance_id=int(node.attrib["id"]),
                name=node.attrib.get("name", ""),
                tag=node.attrib.get("tag", ""),
            ))
        return timestamp, items

    def alliance_id_by_tag(self, tag: str) -> int | None:
        normalized = tag.strip().casefold()
        if not normalized:
            return None
        _, alliances = self.alliances()
        for item in alliances:
            if item.tag.casefold() == normalized:
                return item.alliance_id
        return None

    def highscore(self, score_type: int, category: int = 1) -> tuple[int, dict[int, Score]]:
        root = self._get_xml("highscore.xml", {"category": category, "type": score_type})
        timestamp = int(root.attrib.get("timestamp", "0"))
        scores = {}
        node_name = "player" if category == 1 else "alliance"
        for node in root.findall(node_name):
            player_id = int(node.attrib["id"])
            scores[player_id] = Score(
                player_id=player_id,
                position=int(node.attrib["position"]),
                score=int(node.attrib["score"]),
                ships=(int(node.attrib["ships"]) if node.attrib.get("ships") else None),
            )
        return timestamp, scores

    def collect_scores(self, player_ids: Iterable[int]) -> tuple[int, dict[int, dict[str, Score]]]:
        wanted = set(player_ids)
        result = {player_id: {} for player_id in wanted}
        timestamps = []

        for name, score_type in SCORE_TYPES.items():
            timestamp, scores = self.highscore(score_type)
            timestamps.append(timestamp)
            for player_id in wanted:
                score = scores.get(player_id)
                if score:
                    result[player_id][name] = score

        return max(timestamps, default=0), result
