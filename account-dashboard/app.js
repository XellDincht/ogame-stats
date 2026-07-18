const state = {
  summary: null,
  snapshots: [],
  planets: [],
  production: [],
  technologies: [],
  selectedAccount: null
};

const $ = (selector) => document.querySelector(selector);
const formatNumber = new Intl.NumberFormat("de-DE");
const formatDate = (value) => value
  ? new Date(value).toLocaleString("de-DE")
  : "–";

function compactProductionNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "–";
  const mode = $("#numberFormatSelect")?.value || "K";
  if (mode === "E") return formatNumber.format(Math.trunc(numeric));
  if (mode === "M") {
    const floored = Math.floor(numeric / 100000) / 10;
    return `${floored.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  return `${Math.round(numeric / 1000).toLocaleString("de-DE")}K`;
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return response.json();
}

function showMessage(message) {
  const box = $("#message");
  box.textContent = message;
  box.classList.remove("hidden");
}

function hideMessage() {
  $("#message").classList.add("hidden");
}

function accountKey(account) {
  return `${account.player_id}|${account.universe}`;
}

function selectedAccount() {
  return state.summary.accounts.find(
    account => accountKey(account) === state.selectedAccount
  );
}

function latestSnapshotFor(account) {
  return state.snapshots
    .filter(item =>
      item.player_id === account.player_id &&
      item.universe === account.universe
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

function renderSummary() {
  const account = selectedAccount();
  $("#playerName").textContent = account?.player_name || "–";
  $("#universe").textContent = account?.universe || "–";
  $("#planetCount").textContent = account
    ? formatNumber.format(account.planet_count)
    : "–";
  $("#latestSnapshot").textContent = account
    ? formatDate(account.created_at)
    : "–";
}

function renderPlanets() {
  const account = selectedAccount();
  const latest = latestSnapshotFor(account);
  const tbody = $("#planetRows");
  tbody.innerHTML = "";

  if (!latest) return;

  const planets = state.planets
    .filter(item => item.snapshot_id === latest.snapshot_id)
    .sort((a,b)=>(a.planet_order??999999)-(b.planet_order??999999));

  const productionByPlanet = new Map(
    state.production
      .filter(item => item.snapshot_id === latest.snapshot_id)
      .map(item => [item.planet_id, item])
  );

  const totals = {
    metal_per_hour: 0,
    crystal_per_hour: 0,
    deuterium_per_hour: 0
  };

  for (const planet of planets) {
    const prod = productionByPlanet.get(planet.planet_id) || {};

    for (const key of Object.keys(totals)) {
      totals[key] += Number(prod[key] || 0);
    }

    const overviewSuspicious =
      planets.length > 1 &&
      planets.every(other =>
        other.fields_used === planet.fields_used &&
        other.fields_total === planet.fields_total &&
        other.temperature_min_c === planet.temperature_min_c &&
        other.temperature_max_c === planet.temperature_max_c
      );

    const fieldsText =
      `${numberOrDash(planet.fields_used)} / ${numberOrDash(planet.fields_total)}`;
    const temperatureText =
      `${numberOrDash(planet.temperature_min_c)} bis ` +
      `${numberOrDash(planet.temperature_max_c)} °C`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(planet.name)}</td>
      <td>${escapeHtml(planet.coordinates || "–")}</td>
      <td>${numberOrDash(planet.diameter_km)} km</td>
      <td class="${overviewSuspicious ? "suspect-value" : ""}"
          title="${overviewSuspicious ? "Diese alten Werte sind auf allen Planeten identisch und stammen wahrscheinlich aus dem früheren Parser." : ""}">
        ${fieldsText}
      </td>
      <td class="${overviewSuspicious ? "suspect-value" : ""}"
          title="${overviewSuspicious ? "Diese alten Werte sind auf allen Planeten identisch und stammen wahrscheinlich aus dem früheren Parser." : ""}">
        ${temperatureText}
      </td>
      <td>${numberOrDash(prod.metal_per_hour)}</td>
      <td>${numberOrDash(prod.crystal_per_hour)}</td>
      <td>${numberOrDash(prod.deuterium_per_hour)}</td>
    `;
    tbody.append(row);
  }

  const totalRow = document.createElement("tr");
  totalRow.className = "total-row";
  totalRow.innerHTML = `
    <td>Summe</td>
    <td>Alle Planeten</td>
    <td>–</td>
    <td>–</td>
    <td>–</td>
    <td>${numberOrDash(totals.metal_per_hour)}</td>
    <td>${numberOrDash(totals.crystal_per_hour)}</td>
    <td>${numberOrDash(totals.deuterium_per_hour)}</td>
  `;
  tbody.append(totalRow);
}

function renderProductionChart() {
  const account = selectedAccount();
  const chart = $("#productionChart");
  chart.innerHTML = "";

  const grouped = new Map();
  for (const row of state.production) {
    if (
      row.player_name !== account.player_name ||
      row.universe !== account.universe
    ) continue;

    const current = grouped.get(row.snapshot_id) || {
      created_at: row.created_at,
      metal: 0,
      crystal: 0,
      deuterium: 0
    };
    current.metal += row.metal_per_hour || 0;
    current.crystal += row.crystal_per_hour || 0;
    current.deuterium += row.deuterium_per_hour || 0;
    grouped.set(row.snapshot_id, current);
  }

  const points = [...grouped.values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const max = Math.max(
    1,
    ...points.flatMap(point => [
      point.metal, point.crystal, point.deuterium
    ])
  );

  for (const point of points) {
    const group = document.createElement("div");
    group.className = "chart-group";
    group.title = [
      `Metall: ${formatNumber.format(point.metal)}/h`,
      `Kristall: ${formatNumber.format(point.crystal)}/h`,
      `Deuterium: ${formatNumber.format(point.deuterium)}/h`
    ].join("\n");

    for (const [resource, value] of [
      ["metal", point.metal],
      ["crystal", point.crystal],
      ["deuterium", point.deuterium]
    ]) {
      const bar = document.createElement("div");
      bar.className = `bar ${resource}`;
      bar.style.height = `${Math.max(1, value / max * 210)}px`;
      group.append(bar);
    }

    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = new Date(point.created_at).toLocaleDateString("de-DE");
    group.append(label);
    chart.append(group);
  }

  const latestPoint = points.at(-1);
  const metalDaily = (latestPoint?.metal || 0) * 24;
  const crystalDaily = (latestPoint?.crystal || 0) * 24;
  const deuteriumDaily = (latestPoint?.deuterium || 0) * 24;

  $("#dailyMetal").textContent = compactProductionNumber(metalDaily);
  $("#dailyCrystal").textContent = compactProductionNumber(crystalDaily);
  $("#dailyDeuterium").textContent = compactProductionNumber(deuteriumDaily);
  $("#dailyTotal").textContent =
    compactProductionNumber(metalDaily + crystalDaily + deuteriumDaily);
}

function renderTechnologies() {
  const account = selectedAccount();
  const latest = latestSnapshotFor(account);
  const category = $("#categorySelect").value;
  const thead = $("#technologyHead");
  const tbody = $("#technologyRows");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!latest) return;

  const latestPlanets = state.planets
    .filter(item => item.snapshot_id === latest.snapshot_id)
    .sort((a,b)=>(a.planet_order??999999)-(b.planet_order??999999));

  const records = state.technologies
    .filter(item =>
      item.snapshot_id === latest.snapshot_id &&
      item.category === category
    );

  const isAccountWide = category === "research";
  const columns = isAccountWide
    ? [{ planet_id: null, name: "Accountweit" }]
    : latestPlanets.map(planet => ({
        planet_id: planet.planet_id,
        name: `${planet.name} [${planet.coordinates}]`
      }));

  const headerRow = document.createElement("tr");
  headerRow.innerHTML =
    `<th>Technologie</th>` +
    columns.map(column => `<th>${escapeHtml(column.name)}</th>`).join("");
  thead.append(headerRow);

  const technologyNames = [...new Set(records.map(item => item.name))]
    .sort((a, b) => a.localeCompare(b, "de"));

  for (const technologyName of technologyNames) {
    const row = document.createElement("tr");
    const cells = columns.map(column => {
      const record = records.find(item =>
        item.name === technologyName &&
        (
          isAccountWide
            ? item.planet_id === null
            : Number(item.planet_id) === Number(column.planet_id)
        )
      );
      const value=record?.value; return `<td class="matrix-value" data-value="${value ?? ""}">${numberOrDash(value)}</td>`;
    }).join("");

    row.innerHTML = `<td>${escapeHtml(technologyName)}</td>${cells}`;
    const valueCells=Array.from(row.querySelectorAll(".matrix-value"));
    const vals=valueCells.map(c=>Number(c.dataset.value)).filter(Number.isFinite);
    const highest=vals.length?Math.max(...vals):null;
    for(const cell of valueCells){const value=Number(cell.dataset.value); if(!Number.isFinite(value))cell.classList.add("value-empty"); else if(value===0)cell.classList.add("value-zero"); else if(value===highest)cell.classList.add("value-highest"); else cell.classList.add("value-normal");}
    tbody.append(row);
  }
}

function renderAll() {
  renderSummary();
  renderPlanets();
  renderProductionChart();
  renderTechnologies();
}

function numberOrDash(value) {
  return value === null || value === undefined
    ? "–"
    : formatNumber.format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDashboard() {
  hideMessage();
  try {
    const [summary, snapshots, planets, production, technologies] =
      await Promise.all([
        loadJson("data/summary.json"),
        loadJson("data/snapshots.json"),
        loadJson("data/planets.json"),
        loadJson("data/production.json"),
        loadJson("data/technologies.json")
      ]);

    state.summary = summary;
    state.snapshots = snapshots;
    state.planets = planets;
    state.production = production;
    state.technologies = technologies;

    const select = $("#accountSelect");
    select.innerHTML = "";

    for (const account of summary.accounts) {
      const option = document.createElement("option");
      option.value = accountKey(account);
      option.textContent = `${account.player_name} · ${account.universe}`;
      select.append(option);
    }

    state.selectedAccount =
      state.selectedAccount &&
      summary.accounts.some(a => accountKey(a) === state.selectedAccount)
        ? state.selectedAccount
        : select.options[0]?.value || null;

    select.value = state.selectedAccount || "";
    renderAll();
  } catch (error) {
    showMessage(
      "Dashboard-Daten konnten nicht geladen werden. " +
      "Starte zuerst export_dashboard.bat oder die Bridge. " +
      error.message
    );
  }
}

$("#accountSelect").addEventListener("change", event => {
  state.selectedAccount = event.target.value;
  renderAll();
});

$("#categorySelect").addEventListener("change", renderTechnologies);
$("#numberFormatSelect")?.addEventListener("change", renderProductionChart);
$("#reloadButton").addEventListener("click", loadDashboard);

loadDashboard();
