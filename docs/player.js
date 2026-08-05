const METRICS = [
  ["Gesamtpunkte", "total_points", false],
  ["Gesamtrang", "total_rank", true],
  ["Ökonomiepunkte", "economy_points", false],
  ["Ökonomierang", "economy_rank", true],
  ["Forschungspunkte", "research_points", false],
  ["Forschungsrang", "research_rank", true],
  ["Militärpunkte", "military_points", false],
  ["Militärrang", "military_rank", true],
  ["Militär gebaut", "military_built_points", false],
  ["Militär verloren", "military_lost_points", false],
  ["Militär zerstört", "military_destroyed_points", false],
  ["Ehrenpunkte", "honor_points", false],
  ["Ehrenrang", "honor_rank", true],
  ["Schiffe", "ships", false]
];

const $ = selector => document.querySelector(selector);
const numberFormat = new Intl.NumberFormat("de-DE");
const fmt = value => value == null ? "–" : numberFormat.format(value);
const dateFmt = value => {
  const [year, month, day] = String(value || "").split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
};

function metricDelta(current, previous, isRank) {
  if (current == null || previous == null) return null;
  return isRank ? Number(previous) - Number(current) : Number(current) - Number(previous);
}

function deltaText(delta) {
  if (delta == null) return "";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${fmt(delta)}`;
}

function deltaClass(delta) {
  if (delta > 0) return "history-delta-positive";
  if (delta < 0) return "history-delta-negative";
  return "history-delta-neutral";
}

function historyCell(snapshot, previous, field, isRank) {
  const value = snapshot[field];
  const delta = metricDelta(value, previous?.[field], isRank);
  const tooltip = delta == null ? "Kein Vergleichswert vorhanden" : deltaText(delta);

  return `<td class="history-value-cell ${delta == null ? "" : deltaClass(delta)}"
              data-delta="${delta == null ? "" : deltaText(delta)}"
              title="${tooltip}">
            ${fmt(value)}
          </td>`;
}

function render(player) {
  const snapshots = [...(player.snapshots || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  $("#historyTitle").textContent = `Historie: ${player.name}`;

  if (!snapshots.length) {
    $("#historyHead").innerHTML = "<tr><th>Kennzahl</th></tr>";
    $("#historyBody").innerHTML = '<tr><td>Keine Tageswerte vorhanden.</td></tr>';
    $("#historySummary").innerHTML = "";
    return;
  }

  $("#historyHead").innerHTML =
    `<tr><th>Kennzahl</th>${snapshots.map(item => `<th>${dateFmt(item.date)}</th>`).join("")}</tr>`;

  $("#historyBody").innerHTML = METRICS.map(([label, field, isRank]) => {
    const cells = snapshots.map((snapshot, index) =>
      historyCell(snapshot, snapshots[index - 1], field, isRank)
    ).join("");
    return `<tr><td>${label}</td>${cells}</tr>`;
  }).join("");

  const first = snapshots[0];
  const last = snapshots.at(-1);
  const sinceStart = field =>
    first[field] != null && last[field] != null ? Number(last[field]) - Number(first[field]) : null;

  $("#historySummary").innerHTML = [
    ["Snapshots", snapshots.length, null],
    ["Gesamt aktuell", last.total_points, sinceStart("total_points")],
    ["Forschung aktuell", last.research_points, sinceStart("research_points")],
    ["Militär aktuell", last.military_points, sinceStart("military_points")],
    ["Schiffe aktuell", last.ships, sinceStart("ships")]
  ].map(([label, value, delta]) =>
    `<article class="summary-card">
      <span class="summary-label">${label}</span>
      <strong class="summary-value">${fmt(value)}</strong>
      ${delta == null ? "" :
        `<div class="summary-delta ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}">
          ${delta > 0 ? "+" : ""}${fmt(delta)} seit Beginn
        </div>`}
    </article>`
  ).join("");
}

async function init() {
  try {
    // Die öffentliche Statistik verwendet ab jetzt immer Supabase.
    window.ogameDataSource?.setSource?.("supabase");
    const data = await window.ogameDataSource.load();

    const select = $("#historyPlayer");
    select.innerHTML = "";
    data.players.forEach(player =>
      select.insertAdjacentHTML("beforeend", `<option value="${player.id}">${player.name}</option>`)
    );

    const wanted = new URLSearchParams(location.search).get("id");
    const initial =
      data.players.find(player => String(player.id) === String(wanted)) ||
      data.players[0];

    if (!initial) throw new Error("Keine Spieler gefunden.");

    select.value = String(initial.id);
    render(initial);

    select.addEventListener("change", () => {
      const selected = data.players.find(player => String(player.id) === select.value);
      if (selected) render(selected);
    });

    $("#footer").textContent =
      `Supabase-Stand ${new Date(data.meta.generated_at).toLocaleString("de-DE")}`;
  } catch (error) {
    $("#footer").textContent = `Spieler-Historie konnte nicht geladen werden: ${error.message}`;
    console.error(error);
  }
}

init();
