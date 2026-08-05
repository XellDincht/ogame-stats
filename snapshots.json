(() => {
  "use strict";

  const STORAGE_KEY = "ogame.dashboard.dataSource";
  const PAGE_SIZE = 1000;
  const snapshotCache = new Map();
  const snapshotMetaBySourceId = new Map();

  function source() {
    return "supabase";
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

  async function pagedBySnapshot(table, select, dbSnapshotId, label) {
    const result = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = await rows(
        client().from(table).select(select).eq("snapshot_id", dbSnapshotId).range(from, from + PAGE_SIZE - 1),
        label
      );
      result.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return result;
  }

  async function loadSupabaseMetadata() {
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

    const snapshots = [];
    snapshotMetaBySourceId.clear();
    for (const account of accounts) {
      const found = await rows(
        sb.from("ogame_account_snapshots")
          .select("id, account_id, source_snapshot_id, created_at, imported_at, collector_version")
          .eq("account_id", account.id)
          .order("created_at", { ascending: true }),
        `Snapshot-Liste für ${account.current_player_name}`
      );
      for (const row of found) {
        const meta = {
          db_snapshot_id: row.id,
          snapshot_id: row.source_snapshot_id,
          created_at: row.created_at,
          imported_at: row.imported_at,
          player_id: account.ogame_player_id,
          player_name: account.current_player_name,
          universe: account.universe,
          collector_version: row.collector_version,
          account_id: account.id
        };
        snapshots.push(meta);
        snapshotMetaBySourceId.set(meta.snapshot_id, meta);
      }
    }

    const latestByAccount = new Map();
    for (const snapshot of snapshots) {
      const current = latestByAccount.get(snapshot.account_id);
      if (!current || new Date(snapshot.created_at) > new Date(current.created_at)) {
        latestByAccount.set(snapshot.account_id, snapshot);
      }
    }

    const summary = {
      export_version: "supabase-lazy-v1",
      accounts: accounts.map(account => {
        const latest = latestByAccount.get(account.id);
        return {
          snapshot_id: latest?.snapshot_id || null,
          created_at: latest?.created_at || null,
          player_id: account.ogame_player_id,
          player_name: account.current_player_name,
          universe: account.universe,
          collector_version: latest?.collector_version || null,
          planet_count: null,
          production_per_hour: { metal: 0, crystal: 0, deuterium: 0 }
        };
      }).filter(account => account.snapshot_id)
    };

    return { summary, snapshots, planets: [], production: [], technologies: [], flights: [], lazy: true };
  }

  async function loadSupabaseSnapshot(sourceSnapshotId) {
    if (snapshotCache.has(sourceSnapshotId)) return snapshotCache.get(sourceSnapshotId);
    const sb = client();
    let meta = snapshotMetaBySourceId.get(sourceSnapshotId);
    if (!meta) {
      const found = await rows(
        sb.from("ogame_account_snapshots")
          .select("id, account_id, source_snapshot_id, created_at, imported_at, collector_version, ogame_accounts!inner(ogame_player_id, current_player_name, universe)")
          .eq("source_snapshot_id", sourceSnapshotId)
          .limit(1),
        "Snapshot"
      );
      const row = found[0];
      if (!row) throw new Error(`Snapshot nicht gefunden: ${sourceSnapshotId}`);
      const account = row.ogame_accounts;
      meta = {
        db_snapshot_id: row.id,
        snapshot_id: row.source_snapshot_id,
        created_at: row.created_at,
        imported_at: row.imported_at,
        player_id: account.ogame_player_id,
        player_name: account.current_player_name,
        universe: account.universe,
        collector_version: row.collector_version,
        account_id: row.account_id
      };
      snapshotMetaBySourceId.set(sourceSnapshotId, meta);
    }

    const dbId = meta.db_snapshot_id;
    const [objectRows, technologyRows, flightRows] = await Promise.all([
      pagedBySnapshot(
        "ogame_account_objects",
        "id, snapshot_id, source_object_id, object_type, object_order, name, coordinates, image_url, background_image_url, lifeform_name, diameter_km, fields_used, fields_total, temperature_min_c, temperature_max_c",
        dbId,
        "Objekte"
      ),
      pagedBySnapshot(
        "ogame_account_technologies",
        "snapshot_id, object_id, category, technology_id, name, value",
        dbId,
        "Technologien"
      ),
      pagedBySnapshot(
        "ogame_account_flights",
        "snapshot_id, source_flight_id, mission, origin_coordinates, destination_coordinates, arrival_text, is_returning, ship_count, ships, raw_text",
        dbId,
        "Flüge"
      )
    ]);

    const objectIds = objectRows.map(row => row.id);
    const productionRows = objectIds.length
      ? await rows(
          sb.from("ogame_account_production")
            .select("object_id, metal_per_hour, crystal_per_hour, deuterium_per_hour, energy_available, energy_production, metal_current, crystal_current, deuterium_current, metal_storage, crystal_storage, deuterium_storage, source")
            .in("object_id", objectIds),
          "Produktion"
        )
      : [];

    const objectById = new Map(objectRows.map(row => [row.id, row]));
    const common = {
      snapshot_id: meta.snapshot_id,
      created_at: meta.created_at,
      player_name: meta.player_name,
      universe: meta.universe
    };

    const planets = objectRows.map(row => ({
      ...common,
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
    }));

    const production = productionRows.map(row => {
      const object = objectById.get(row.object_id);
      return {
        ...common,
        planet_id: object?.source_object_id ?? null,
        planet_name: object?.name ?? null,
        coordinates: object?.coordinates ? `[${String(object.coordinates).replace(/[\[\]]/g, "")}]` : "",
        ...row
      };
    });

    const technologies = technologyRows.map(row => {
      const object = row.object_id ? objectById.get(row.object_id) : null;
      return {
        ...common,
        planet_id: object?.source_object_id ?? null,
        planet_name: object?.name ?? null,
        coordinates: object?.coordinates ? `[${String(object.coordinates).replace(/[\[\]]/g, "")}]` : null,
        category: row.category,
        technology_id: row.technology_id,
        name: row.name,
        value: row.value
      };
    });

    const flights = flightRows.map(row => ({
      ...common,
      flight_id: row.source_flight_id,
      mission: row.mission,
      origin_coordinates: row.origin_coordinates,
      destination_coordinates: row.destination_coordinates,
      arrival: row.arrival_text,
      is_returning: row.is_returning ? 1 : 0,
      ship_count: row.ship_count,
      ships: row.ships || {},
      raw_text: row.raw_text
    }));

    const result = { snapshot: meta, planets, production, technologies, flights };
    snapshotCache.set(sourceSnapshotId, result);
    return result;
  }

  let localDataPromise = null;
  async function loadLocal() {
    if (!localDataPromise) {
      localDataPromise = Promise.all(
        ["summary", "snapshots", "planets", "production", "technologies", "active_flights"]
          .map(name => localJson(`data/${name}.json`))
      ).then(([summary, snapshots, planets, production, technologies, flights]) => ({
        summary, snapshots, planets, production, technologies, flights, lazy: false
      }));
    }
    return localDataPromise;
  }

  async function loadLocalSnapshot(sourceSnapshotId) {
    const all = await loadLocal();
    const snapshot = all.snapshots.find(row => row.snapshot_id === sourceSnapshotId);
    return {
      snapshot,
      planets: all.planets.filter(row => row.snapshot_id === sourceSnapshotId),
      production: all.production.filter(row => row.snapshot_id === sourceSnapshotId),
      technologies: all.technologies.filter(row => row.snapshot_id === sourceSnapshotId),
      flights: all.flights.filter(row => row.snapshot_id === sourceSnapshotId)
    };
  }

  async function load() {
    return loadSupabaseMetadata();
  }

  async function loadSnapshot(sourceSnapshotId) {
    return loadSupabaseSnapshot(sourceSnapshotId);
  }

  window.ogameAccountDashboardDataSource = Object.freeze({
    source,
    load,
    loadSnapshot,
    loadLocal,
    loadSupabase: loadSupabaseMetadata,
    clearCache: () => snapshotCache.clear()
  });
})();
