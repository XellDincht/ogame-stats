(() => {
  "use strict";

  const STORAGE_KEY = "ogame.dashboard.dataSource";
  const MAX_SNAPSHOTS_PER_ACCOUNT = 31;
  const PAGE_SIZE = 1000;

  function source() {
    return localStorage.getItem(STORAGE_KEY) === "supabase" ? "supabase" : "local";
  }

  async function localJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  function client() {
    const value = window.parent?.ogameSupabase || window.ogameSupabase;
    if (!value) throw new Error("Supabase-Client der Hauptseite ist nicht verfügbar.");
    return value;
  }

  function err(error) {
    return [error?.message, error?.details, error?.hint].filter(Boolean).join(" · ") || "Unbekannter Supabase-Fehler";
  }

  async function rows(query, label) {
    const { data, error } = await query;
    if (error) throw new Error(`${label}: ${err(error)}`);
    return data || [];
  }

  async function paged(table, select, snapshotIds, label) {
    if (!snapshotIds.length) return [];
    const result = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = await rows(
        client().from(table).select(select).in("snapshot_id", snapshotIds).range(from, from + PAGE_SIZE - 1),
        label
      );
      result.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return result;
  }

  function chunks(values, size = 100) {
    const out = [];
    for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
    return out;
  }

  async function loadSupabase() {
    const sb = client();
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw new Error(`Supabase-Session: ${sessionError.message}`);
    if (!sessionData?.session) throw new Error("Keine gültige Supabase-Anmeldung vorhanden.");

    const accounts = await rows(
      sb.from("ogame_accounts")
        .select("id, ogame_player_id, current_player_name, universe, is_active")
        .eq("is_active", true)
        .order("current_player_name"),
      "Accounts"
    );

    const snapshotRows = [];
    for (const account of accounts) {
      const found = await rows(
        sb.from("ogame_account_snapshots")
          .select("id, account_id, source_snapshot_id, created_at, imported_at, collector_version")
          .eq("account_id", account.id)
          .order("created_at", { ascending: false })
          .limit(MAX_SNAPSHOTS_PER_ACCOUNT),
        `Snapshots für ${account.current_player_name}`
      );
      for (const snapshot of found) snapshotRows.push({ ...snapshot, account });
    }

    const snapshotIds = snapshotRows.map(row => row.id);
    const objectRows = [];
    const productionRows = [];
    const technologyRows = [];
    const flightRows = [];

    for (const ids of chunks(snapshotIds)) {
      objectRows.push(...await paged(
        "ogame_account_objects",
        "id, snapshot_id, source_object_id, object_type, object_order, name, coordinates, image_url, background_image_url, lifeform_name, diameter_km, fields_used, fields_total, temperature_min_c, temperature_max_c",
        ids,
        "Objekte"
      ));
      technologyRows.push(...await paged(
        "ogame_account_technologies",
        "snapshot_id, object_id, category, technology_id, name, value",
        ids,
        "Technologien"
      ));
      flightRows.push(...await paged(
        "ogame_account_flights",
        "snapshot_id, source_flight_id, mission, origin_coordinates, destination_coordinates, arrival_text, is_returning, ship_count, ships, raw_text",
        ids,
        "Flüge"
      ));
    }

    const objectIds = objectRows.map(row => row.id);
    for (const ids of chunks(objectIds)) {
      if (!ids.length) continue;
      const page = await rows(
        sb.from("ogame_account_production")
          .select("object_id, metal_per_hour, crystal_per_hour, deuterium_per_hour, energy_available, energy_production, metal_current, crystal_current, deuterium_current, metal_storage, crystal_storage, deuterium_storage, source")
          .in("object_id", ids),
        "Produktion"
      );
      productionRows.push(...page);
    }

    const snapById = new Map(snapshotRows.map(row => [row.id, row]));
    const objectById = new Map(objectRows.map(row => [row.id, row]));
    const snapshots = snapshotRows.map(row => ({
      snapshot_id: row.source_snapshot_id,
      created_at: row.created_at,
      imported_at: row.imported_at,
      player_id: row.account.ogame_player_id,
      player_name: row.account.current_player_name,
      universe: row.account.universe,
      collector_version: row.collector_version
    }));

    const planets = objectRows.map(row => {
      const snap = snapById.get(row.snapshot_id);
      return {
        snapshot_id: snap.source_snapshot_id,
        created_at: snap.created_at,
        player_name: snap.account.current_player_name,
        universe: snap.account.universe,
        planet_id: row.source_object_id,
        name: row.name,
        coordinates: row.coordinates ? `[${String(row.coordinates).replace(/[\[\]]/g, "")}]` : "",
        object_type: row.object_type,
        planet_order: row.object_order,
        image_url: row.image_url,
        background_image_url: row.background_image_url,
        lifeform_name: row.lifeform_name,
        diameter_km: row.diameter_km,
        fields_used: row.fields_used,
        fields_total: row.fields_total,
        temperature_min_c: row.temperature_min_c,
        temperature_max_c: row.temperature_max_c
      };
    });

    const production = productionRows.map(row => {
      const object = objectById.get(row.object_id);
      const snap = snapById.get(object.snapshot_id);
      return {
        snapshot_id: snap.source_snapshot_id,
        created_at: snap.created_at,
        player_name: snap.account.current_player_name,
        universe: snap.account.universe,
        planet_id: object.source_object_id,
        planet_name: object.name,
        coordinates: object.coordinates ? `[${String(object.coordinates).replace(/[\[\]]/g, "")}]` : "",
        ...row
      };
    });

    const technologies = technologyRows.map(row => {
      const snap = snapById.get(row.snapshot_id);
      const object = row.object_id ? objectById.get(row.object_id) : null;
      return {
        snapshot_id: snap.source_snapshot_id,
        created_at: snap.created_at,
        player_name: snap.account.current_player_name,
        universe: snap.account.universe,
        planet_id: object?.source_object_id ?? null,
        planet_name: object?.name ?? null,
        coordinates: object?.coordinates ? `[${String(object.coordinates).replace(/[\[\]]/g, "")}]` : null,
        category: row.category,
        technology_id: row.technology_id,
        name: row.name,
        value: row.value
      };
    });

    const flights = flightRows.map(row => {
      const snap = snapById.get(row.snapshot_id);
      return {
        snapshot_id: snap.source_snapshot_id,
        created_at: snap.created_at,
        player_name: snap.account.current_player_name,
        universe: snap.account.universe,
        flight_id: row.source_flight_id,
        mission: row.mission,
        origin_coordinates: row.origin_coordinates,
        destination_coordinates: row.destination_coordinates,
        arrival: row.arrival_text,
        is_returning: row.is_returning ? 1 : 0,
        ship_count: row.ship_count,
        ships: row.ships || {},
        raw_text: row.raw_text
      };
    });

    const latestByAccount = new Map();
    for (const row of snapshotRows) {
      const current = latestByAccount.get(row.account_id);
      if (!current || new Date(row.created_at) > new Date(current.created_at)) latestByAccount.set(row.account_id, row);
    }
    const summary = {
      export_version: "supabase-v1",
      accounts: accounts.map(account => {
        const latest = latestByAccount.get(account.id);
        const ownPlanets = latest ? planets.filter(p => p.snapshot_id === latest.source_snapshot_id) : [];
        const ownProduction = latest ? production.filter(p => p.snapshot_id === latest.source_snapshot_id) : [];
        return {
          snapshot_id: latest?.source_snapshot_id || null,
          created_at: latest?.created_at || null,
          player_id: account.ogame_player_id,
          player_name: account.current_player_name,
          universe: account.universe,
          collector_version: latest?.collector_version || null,
          planet_count: ownPlanets.length,
          production_per_hour: {
            metal: ownProduction.reduce((sum, p) => sum + (Number(p.metal_per_hour) || 0), 0),
            crystal: ownProduction.reduce((sum, p) => sum + (Number(p.crystal_per_hour) || 0), 0),
            deuterium: ownProduction.reduce((sum, p) => sum + (Number(p.deuterium_per_hour) || 0), 0)
          }
        };
      }).filter(a => a.snapshot_id)
    };

    return { summary, snapshots, planets, production, technologies, flights };
  }

  async function loadLocal() {
    const [summary, snapshots, planets, production, technologies, flights] = await Promise.all(
      ["summary", "snapshots", "planets", "production", "technologies", "active_flights"]
        .map(name => localJson(`data/${name}.json`))
    );
    return { summary, snapshots, planets, production, technologies, flights };
  }

  async function load() {
    return source() === "supabase" ? loadSupabase() : loadLocal();
  }

  window.ogameAccountDashboardDataSource = Object.freeze({ source, load, loadLocal, loadSupabase });
})();
