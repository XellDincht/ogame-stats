(() => {
  const STORAGE_KEY = "ogame.dashboard.dataSource";
  const VALID_SOURCES = new Set(["local", "supabase"]);
  const UNIVERSE = "s282-de";
  const ALLIANCE_ID = 500219;

  function getSource() {
    const value = localStorage.getItem(STORAGE_KEY);
    return VALID_SOURCES.has(value) ? value : "local";
  }

  function setSource(value) {
    if (!VALID_SOURCES.has(value)) throw new Error(`Unbekannte Datenquelle: ${value}`);
    localStorage.setItem(STORAGE_KEY, value);
  }

  async function loadLocalData() {
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`data.json konnte nicht geladen werden (${response.status}).`);
    return response.json();
  }

  async function selectAll(query, label) {
    const { data, error } = await query;
    if (error) {
      const details = [error.message, error.details, error.hint].filter(Boolean).join(" · ");
      throw new Error(`${label}: ${details || "Unbekannter Supabase-Fehler"}`);
    }
    return data || [];
  }

  function membershipDays(joinedAt, leftAt) {
    if (!joinedAt) return 0;
    const start = new Date(joinedAt);
    const end = leftAt ? new Date(leftAt) : new Date();
    return Math.max(0, Math.floor((end - start) / 86400000) + 1);
  }

  async function loadSupabaseData() {
    const client = window.ogameSupabase;
    if (!client) throw new Error("Supabase-Client ist noch nicht initialisiert.");

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(`Supabase-Session: ${sessionError.message}`);
    if (!sessionData.session) throw new Error("Keine gültige Supabase-Anmeldung vorhanden.");

    const [players, snapshots, allianceHistory, memberships, localFallback] = await Promise.all([
      selectAll(
        client.from("ogame_public_players")
          .select("universe, player_id, player_name, status, alliance_id, first_seen_at, last_seen_at, is_active")
          .eq("universe", UNIVERSE)
          .order("player_id", { ascending: true }),
        "Spieler"
      ),
      selectAll(
        client.from("ogame_player_snapshots")
          .select("*")
          .eq("universe", UNIVERSE)
          .order("snapshot_date", { ascending: true })
          .order("player_id", { ascending: true }),
        "Spieler-Snapshots"
      ),
      selectAll(
        client.from("ogame_alliance_snapshots")
          .select("*")
          .eq("universe", UNIVERSE)
          .eq("alliance_id", ALLIANCE_ID)
          .order("snapshot_date", { ascending: true }),
        "Allianz-Snapshots"
      ),
      selectAll(
        client.from("ogame_alliance_memberships")
          .select("id, universe, alliance_id, player_id, joined_at, left_at, last_seen_at, is_active")
          .eq("universe", UNIVERSE)
          .eq("alliance_id", ALLIANCE_ID)
          .order("joined_at", { ascending: true }),
        "Mitgliedschaften"
      ),
      loadLocalData().catch(() => null)
    ]);

    const snapshotsByPlayer = new Map();
    for (const row of snapshots) {
      const list = snapshotsByPlayer.get(String(row.player_id)) || [];
      list.push({
        date: row.snapshot_date,
        collected_at: row.collected_at,
        api_timestamp: row.api_timestamp,
        total_points: row.total_points,
        total_rank: row.total_rank,
        economy_points: row.economy_points,
        economy_rank: row.economy_rank,
        research_points: row.research_points,
        research_rank: row.research_rank,
        military_points: row.military_points,
        military_rank: row.military_rank,
        military_lost_points: row.military_lost_points,
        military_lost_rank: row.military_lost_rank,
        military_built_points: row.military_built_points,
        military_built_rank: row.military_built_rank,
        military_destroyed_points: row.military_destroyed_points,
        military_destroyed_rank: row.military_destroyed_rank,
        honor_points: row.honor_points,
        honor_rank: row.honor_rank,
        ships: row.ships
      });
      snapshotsByPlayer.set(String(row.player_id), list);
    }

    const membershipsByPlayer = new Map();
    for (const row of memberships) {
      const list = membershipsByPlayer.get(String(row.player_id)) || [];
      list.push({
        id: row.id,
        joined_at: row.joined_at,
        left_at: row.left_at,
        last_seen_at: row.last_seen_at,
        is_active: row.is_active,
        days: membershipDays(row.joined_at, row.left_at)
      });
      membershipsByPlayer.set(String(row.player_id), list);
    }

    const mappedPlayers = players.map(row => {
      const playerMemberships = membershipsByPlayer.get(String(row.player_id)) || [];
      const activeMembership = [...playerMemberships].reverse().find(item => item.is_active) || playerMemberships.at(-1) || null;
      return {
        id: row.player_id,
        name: row.player_name,
        status: row.status || "",
        first_seen: row.first_seen_at,
        last_seen: row.last_seen_at,
        is_active: row.is_active,
        membership: activeMembership,
        memberships: playerMemberships,
        membership_days: playerMemberships.reduce((sum, item) => sum + item.days, 0),
        snapshots: snapshotsByPlayer.get(String(row.player_id)) || []
      };
    });

    const latestAlliance = allianceHistory.at(-1) || null;
    const generatedAtCandidates = [
      latestAlliance?.collected_at,
      ...mappedPlayers.map(player => player.snapshots.at(-1)?.collected_at)
    ].filter(Boolean).sort();
    const generatedAt = generatedAtCandidates.at(-1) || new Date().toISOString();
    const latestDate = [
      latestAlliance?.snapshot_date,
      ...mappedPlayers.map(player => player.snapshots.at(-1)?.date)
    ].filter(Boolean).sort().at(-1) || null;

    return {
      meta: {
        title: "OGame Allianzstatistik",
        server: UNIVERSE,
        generated_at: generatedAt,
        latest_date: latestDate,
        data_source: "supabase"
      },
      players: mappedPlayers,
      members: mappedPlayers.filter(player => player.is_active).map(player => ({ id: player.id, name: player.name })),
      alliance: {
        id: ALLIANCE_ID,
        name: latestAlliance?.alliance_name || localFallback?.alliance?.name || "",
        tag: latestAlliance?.alliance_tag || localFallback?.alliance?.tag || "",
        logo: localFallback?.alliance?.logo || "ally/Ally_main.png",
        latest: latestAlliance,
        history: allianceHistory
      },
      // Expeditionen werden erst in einer späteren Phase migriert.
      expeditions: localFallback?.expeditions || { events: [], summary: {} }
    };
  }

  async function load() {
    const source = getSource();
    const data = source === "supabase" ? await loadSupabaseData() : await loadLocalData();
    data.meta = { ...(data.meta || {}), data_source: source };
    return data;
  }

  window.ogameDataSource = Object.freeze({
    getSource,
    setSource,
    load,
    loadLocalData,
    loadSupabaseData
  });
})();
