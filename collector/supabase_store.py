from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable
from urllib.parse import quote

import requests


class SupabaseError(RuntimeError):
    pass


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    service_role_key: str


class SupabaseStore:
    def __init__(self, config: SupabaseConfig, timeout: int = 45) -> None:
        self.base_url = config.url.rstrip("/") + "/rest/v1"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": config.service_role_key,
            "Authorization": f"Bearer {config.service_role_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "OGameAllianceStats-GitHubActions/1.0",
        })

    def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        payload: Any = None,
        prefer: str | None = None,
    ) -> Any:
        headers = {"Prefer": prefer} if prefer else None
        response = self.session.request(
            method,
            f"{self.base_url}/{quote(table, safe='')}",
            params=params,
            json=payload,
            headers=headers,
            timeout=self.timeout,
        )
        if not response.ok:
            try:
                body = response.json()
            except ValueError:
                body = response.text
            raise SupabaseError(
                f"Supabase {method} {table}: HTTP {response.status_code}: {body}"
            )
        if response.status_code == 204 or not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            return response.text

    def select(
        self,
        table: str,
        columns: str = "*",
        **filters: str,
    ) -> list[dict[str, Any]]:
        params = {"select": columns, **filters}
        data = self._request("GET", table, params=params)
        return data if isinstance(data, list) else []

    def insert(self, table: str, rows: Any, *, returning: bool = False) -> Any:
        prefer = "return=representation" if returning else "return=minimal"
        return self._request("POST", table, payload=rows, prefer=prefer)

    def upsert(self, table: str, rows: Any, conflict: str) -> Any:
        return self._request(
            "POST",
            table,
            params={"on_conflict": conflict},
            payload=rows,
            prefer="resolution=merge-duplicates,return=minimal",
        )

    def insert_ignore_conflicts(
        self, table: str, rows: Any, conflict: str
    ) -> Any:
        """Insert rows, but keep an already existing conflict row unchanged."""
        return self._request(
            "POST",
            table,
            params={"on_conflict": conflict},
            payload=rows,
            prefer="resolution=ignore-duplicates,return=minimal",
        )

    def update(self, table: str, values: dict[str, Any], **filters: str) -> None:
        self._request(
            "PATCH",
            table,
            params=filters,
            payload=values,
            prefer="return=minimal",
        )

    @staticmethod
    def eq(value: Any) -> str:
        return f"eq.{value}"

    @staticmethod
    def in_(values: Iterable[Any]) -> str:
        encoded = ",".join(str(value) for value in values)
        return f"in.({encoded})"
