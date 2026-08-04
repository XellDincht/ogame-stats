(() => {
  "use strict";

  const STORAGE_KEY = "ogame.dashboard.dataSource";
  const VALID_SOURCES = new Set(["local", "supabase"]);
  const MAX_HISTORY = 31;

  function getSource() {
    const value = localStorage.getItem(STORAGE_KEY);
    return VALID_SOURCES.has(value) ? value : "local";
  }

  function setSource(value) {
    if (!VALID_SOURCES.has(value)) {
      throw new Error(`Unbekannte Account-Datenquelle: ${value}`);
    }
    localStorage.setItem(STORAGE_KEY, value);
  }

  function errorText(error) {
    return [error?.message, error?.details, error?.hint]
      .filter(Boolean)
      .join(" · ") || "Unbekannter Supabase-Fehler";
  }

  async function requireRows(query, label) {
    const { data, error } = await query;
    if (error) throw new Error(`${label}: ${errorText(error)}`);
    return data || [];
  }

  async function loadLocalData() {
    const response = await fetch(`account-data.json?v=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(
        `account-data.json konnte nicht geladen werden (HTTP ${response.status})`
      );
    }
    return response.json();
  }

  function number(value) {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function technologyObject(records) {
    const result = {};
    for (const entry of records || []) {
      const name = String(entry?.name || `Technologie ${entry?.id || "?"}`).trim();
      if (!name) continue;
      result[name] = number(entry?.value ?? entry?.level ?? entry?.amount);
    }
    return result;
  }

  function addObject(target, source) {
    for (const [key, value] of Object.entries(source || {})) {
      target[key] = number(target[key]) + number(value);
    }
    return target;
  }

  function emptyResourceTotals() {
    return {
      metal: 0,
      crystal: 0,
      deuterium: 0,
      energy: 0,
      dark_matter: 0,
      population: 0,
      food: 0
    };
  }

  function emptyProductionTotals() {
    return { metal: 0, crystal: 0, deuterium: 0 };
  }

  function rawPlanetToLegacy(planet) {
    const production = planet?.production || {};
    const overview = planet?.overview || {};
    const buildings = {
      ...technologyObject(planet?.buildings),
      ...technologyObject(planet?.facilities)
    };

    return {
      id: planet?.id ?? null,
      name: planet?.name || "Unbekannt",
      coordinates: planet?.coordinates || "",
      type: planet?.type || "planet",
      order: planet?.order ?? null,
      lifeform_name: planet?.lifeform_name || null,
      diameter_km: overview?.diameter_km ?? null,
      fields_used: overview?.fields_used ?? null,
      fields_total: overview?.fields_total ?? null,
      temperature_min: overview?.temperature_min_c ?? null,
      temperature_max: overview?.temperature_max_c ?? null,
      resources: {
        metal: production?.metal_current ?? 0,
        crystal: production?.crystal_current ?? 0,
        deuterium: production?.deuterium_current ?? 0,
        energy: production?.energy_available ?? 0,
        dark_matter: production?.dark_matter_current ?? 0,
        population: production?.population_current ?? 0,
        food: production?.food_current ?? 0
      },
      production_hour: {
        metal: production?.metal_per_hour ?? 0,
        crystal: production?.crystal_per_hour ?? 0,
        deuterium: production?.deuterium_per_hour ?? 0
      },
      storage: {
        Metall: production?.metal_storage ?? 0,
        Kristall: production?.crystal_storage ?? 0,
        Deuterium: production?.deuterium_storage ?? 0
      },
      buildings,
      research: technologyObject(planet?.research),
      lifeform_buildings: technologyObject(planet?.lifeform_buildings),
      lifeform_research: technologyObject(planet?.lifeform_research),
      ships: technologyObject(planet?.ships),
      defense: technologyObject(planet?.defenses)
    };
  }

  function snapshotToLegacy(rawPayload, snapshotRow, accountRow) {
    const raw = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
    const planetList = Array.isArray(raw.planets) ? raw.planets : [];
    const planets = {};
    const resources = emptyResourceTotals();
    const productionHour = emptyProductionTotals();
    let ships = 0;
    let defense = 0;

    for (const rawPlanet of planetList) {
      const planet = rawPlanetToLegacy(rawPlanet);
      const key = String(planet.id ?? `${planet.type}:${planet.coordinates}:${planet.name}`);
      planets[key] = planet;
      addObject(resources, planet.resources);
      addObject(productionHour, planet.production_hour);
      ships += Object.values(planet.ships || {}).reduce((sum, value) => sum + number(value), 0);
      defense += Object.values(planet.defense || {}).reduce((sum, value) => sum + number(value), 0);
    }

    const context = raw?.account?.context || {};
    const accountClass =
      context?.class?.name || context?.class?.label || context?.class || null;
    const allianceClass =
      context?.alliance_class?.name ||
      context?.allianceClass?.name ||
      context?.alliance_class ||
      context?.allianceClass ||
      null;

    const capturedAt =
      snapshotRow?.created_at || raw?.created_at || new Date().toISOString();
    const playerId =
      raw?.player?.id ?? accountRow?.ogame_player_id ?? null;
    const playerName =
      raw?.player?.name || accountRow?.current_player_name || "Unbekannt";

    return {
      snapshot_id: snapshotRow?.source_snapshot_id || raw?.snapshot_id || null,
      captured_at: capturedAt,
      created_at: capturedAt,
      universe: raw?.universe || accountRow?.universe || "",
      universe_name: raw?.universe || accountRow?.universe || "",
      player: { id: playerId, name: playerName },
      classes: {
        account: accountClass,
        alliance: allianceClass
      },
      planets,
      totals: {
        resources,
        production_hour: productionHour,
        ships,
        defense
      },
      points: raw?.points || {},
      active_flights: raw?.account?.active_flights || [],
      complete: snapshotRow?.complete ?? raw?.complete ?? false,
      collector_version:
        snapshotRow?.collector_version || raw?.collector_version || null
    };
  }

  function historyEntry(snapshot) {
    return {
      captured_at: snapshot.captured_at,
      resources_total: snapshot.totals?.resources || {},
      production_hour: snapshot.totals?.production_hour || {},
      ships_total: snapshot.totals?.ships || 0,
      defense_total: snapshot.totals?.defense || 0,
      points: snapshot.points || {}
    };
  }

  async function loadSupabaseData() {
    const client = window.ogameSupabase;
    if (!client) throw new Error("Supabase-Client ist noch nicht initialisiert.");

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(`Supabase-Session: ${sessionError.message}`);
    if (!sessionData?.session) throw new Error("Keine gültige Supabase-Anmeldung vorhanden.");

    const accounts = await requireRows(
      client
        .from("ogame_accounts")
        .select("id, owner_id, player_id, universe, ogame_player_id, current_player_name, is_active, updated_at")
        .eq("is_active", true)
        .order("current_player_name", { ascending: true }),
      "OGame-Accounts"
    );

    const players = [];
    let newestGeneratedAt = null;

    for (const account of accounts) {
      const rows = await requireRows(
        client
          .from("ogame_account_snapshots")
          .select("id, account_id, source_snapshot_id, schema_version, collector_version, created_at, complete, raw_payload")
          .eq("account_id", account.id)
          .order("created_at", { ascending: false })
          .limit(MAX_HISTORY),
        `Snapshots für ${account.current_player_name}`
      );

      if (!rows.length) continue;

      const chronological = [...rows].reverse();
      const converted = chronological.map(row =>
        snapshotToLegacy(row.raw_payload, row, account)
      );
      const latest = converted.at(-1);
      if (!latest) continue;

      if (!newestGeneratedAt || new Date(latest.captured_at) > new Date(newestGeneratedAt)) {
        newestGeneratedAt = latest.captured_at;
      }

      players.push({
        id: account.ogame_player_id,
        account_id: account.id,
        owner_id: account.owner_id,
        name: account.current_player_name,
        universe: account.universe,
        latest,
        history: converted.map(historyEntry)
      });
    }

    return {
      generated_at: newestGeneratedAt || new Date().toISOString(),
      data_source: "supabase",
      players
    };
  }

  async function load() {
    const source = getSource();
    const data = source === "supabase"
      ? await loadSupabaseData()
      : await loadLocalData();
    return { ...(data || {}), data_source: source };
  }

  window.ogameAccountDataSource = Object.freeze({
    getSource,
    setSource,
    load,
    loadLocalData,
    loadSupabaseData
  });
})();
