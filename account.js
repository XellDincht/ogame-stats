const TEST_PASSWORD = "Test1234!";
const $ = selector => document.querySelector(selector);
const fmt = value => value == null ? "–" : new Intl.NumberFormat("de-DE").format(Number(value) || 0);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

let DATA = { players: [] };
let dashboardLoaded = false;
let productionPeriod = "24h";

const PRODUCTION_PERIODS = {
  "1h": { multiplier: 1, label: "1 Stunde", shortLabel: "1h" },
  "24h": { multiplier: 24, label: "24 Stunden", shortLabel: "24h" },
  "1w": { multiplier: 24 * 7, label: "1 Woche", shortLabel: "1w" }
};

function applyDashboardHeight(height) {
  const frame = $("#dashboardFrame");
  const value = Math.max(420, Math.ceil(Number(height) || 0));
  if (frame && value) frame.style.height = `${value}px`;
}

window.addEventListener("message", event => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "ogame-dashboard-height") return;
  applyDashboardHeight(event.data.height);
});

function setLoginError(message = "") {
  const node = $("#loginError");
  if (node) node.textContent = message;
}

function unlockShell() {
  const login = $("#login");
  const app = $("#app");
  if (login) {
    login.hidden = true;
    login.style.display = "none";
  }
  if (app) {
    app.hidden = false;
    app.style.display = "block";
  }
}

function showAccountView() {
  const main = $("#accountMain");
  const dashboard = $("#dashboardView");
  if (main) {
    main.hidden = false;
    main.style.display = "block";
  }
  if (dashboard) {
    dashboard.hidden = true;
    dashboard.style.display = "none";
  }
  $("#showAccountStats")?.classList.add("active");
  $("#showDashboard")?.classList.remove("active");
}

function showDashboardView() {
  const main = $("#accountMain");
  const dashboard = $("#dashboardView");
  if (main) {
    main.hidden = true;
    main.style.display = "none";
  }
  if (dashboard) {
    dashboard.hidden = false;
    dashboard.style.display = "block";
  }
  $("#showAccountStats")?.classList.remove("active");
  $("#showDashboard")?.classList.add("active");

  const frame = $("#dashboardFrame");
  if (frame && !dashboardLoaded) {
    frame.src = `account-dashboard/index.html?v=${Date.now()}`;
    dashboardLoaded = true;
  }
}

function table(obj, empty = "Noch nicht erfasst") {
  const rows = Object.entries(obj || {});
  if (!rows.length) return `<p class="missing-data">${empty}</p>`;
  return `<table class="data-table"><tbody>${rows.map(([key,value]) => `<tr><td>${esc(key)}</td><td>${fmt(value)}</td></tr>`).join("")}</tbody></table>`;
}

function productionPeriodControl() {
  return `<label class="production-period-control" for="productionPeriod">
    <span>Zeitraum</span>
    <select id="productionPeriod" aria-label="Produktionszeitraum">
      ${Object.entries(PRODUCTION_PERIODS).map(([value, config]) =>
        `<option value="${value}"${value === productionPeriod ? " selected" : ""}>${config.shortLabel}</option>`
      ).join("")}
    </select>
  </label>`;
}

function resources(planet) {
  const current = planet.resources || {};
  const hourly = planet.production_hour || {};
  const labels = {metal:"Metall", crystal:"Kristall", deuterium:"Deuterium"};
  const period = PRODUCTION_PERIODS[productionPeriod] || PRODUCTION_PERIODS["24h"];
  const production = Object.fromEntries(
    ["metal", "crystal", "deuterium"].map(key => [key, (Number(hourly[key]) || 0) * period.multiplier])
  );
  const productionSum = production.metal + production.crystal + production.deuterium;

  return `<div class="production-grid">${["metal","crystal","deuterium"].map(key => `
    <div class="production-item">
      <strong>${labels[key]}</strong>
      <div>Bestand: ${fmt(current[key])}</div>
      <div>Pro Stunde: ${fmt(hourly[key])}</div>
      <div><strong>Produktion (${period.shortLabel}): ${fmt(production[key])}</strong></div>
    </div>`).join("")}
    <div class="production-item production-total">
      <strong><span class="sum-symbol" aria-hidden="true">∑</span> Gesamt (${period.shortLabel})</strong>
      <div>Metall + Kristall + Deuterium</div>
      <div class="production-sum-value">${fmt(productionSum)}</div>
    </div>
  </div>`;
}

function renderAccountData() {
  const players = Array.isArray(DATA?.players) ? DATA.players : [];
  const select = $("#accountPlayer");
  const id = select?.value;
  const player = players.find(item => String(item.id) === id) || players[0];
  const main = $("#accountMain");

  if (!player || !player.latest) {
    if ($("#accountTitle")) $("#accountTitle").textContent = "OGame Dashboard";
    if ($("#accountSubtitle")) $("#accountSubtitle").textContent = "Dashboard erfolgreich freigeschaltet.";
    if (main) main.innerHTML = '<section class="panel account-card account-section"><h2>Keine separaten Accountdaten</h2><p>Das aktuelle OGame-Dashboard ist über den Reiter „Dashboard“ geöffnet.</p></section>';
    return;
  }

  const data = player.latest;
  const planets = Object.values(data.planets || {});
  const previous = player.history?.length > 1 ? player.history.at(-2) : null;
  $("#accountTitle").textContent = `${player.name} – Accountstatistik`;
  $("#accountSubtitle").textContent = `${data.universe_name || data.universe} · letzter Upload ${new Date(data.captured_at).toLocaleString("de-DE")}`;
  const totals = data.totals || {};
  const cards = [
    ["Spieler-ID",data.player?.id],["Spielername",data.player?.name],["Universum",data.universe],
    ["Accountklasse",data.classes?.account],["Allianzklasse",data.classes?.alliance],
    ["Planeten/Monde",planets.length],["Schiffe gesamt",totals.ships],["Verteidigung gesamt",totals.defense]
  ];
  let html = `<section class="account-grid">${cards.map(([label,value]) => `<article class="panel account-card"><span class="summary-label">${esc(label)}</span><strong class="summary-value">${typeof value === "number" ? fmt(value) : esc(value || "–")}</strong></article>`).join("")}</section>`;
  html += `<section class="panel account-card account-section production-section"><div class="section-heading-row"><div><h2>Gesamtproduktion aller Planeten</h2><p class="production-hint">Die ∑-Karte addiert Metall, Kristall und Deuterium. Hier werden zusätzlich alle Planeten zusammengefasst.</p></div>${productionPeriodControl()}</div>${resources({resources:totals.resources,production_hour:totals.production_hour})}</section>`;
  html += '<section class="planet-grid">';
  for (const planet of planets) {
    html += `<article class="panel planet-card"><h2>${esc(planet.name || "Unbekannt")} <small>${esc(planet.coordinates || "")}</small></h2>
      <p>${esc(planet.type || "planet")} · Durchmesser ${fmt(planet.diameter_km)} km · Felder ${fmt(planet.fields_used)}/${fmt(planet.fields_total)} · Temperatur ${planet.temperature_min ?? "–"} bis ${planet.temperature_max ?? "–"} °C</p>
      <h3>Ressourcen und Produktion</h3>${resources(planet)}
      <h3>Speichergrößen</h3>${table(planet.storage)}
      <h3>Energie, DM, Population und Nahrung</h3>${table({Energie:planet.resources?.energy,Dunkle_Materie:planet.resources?.dark_matter,Population:planet.resources?.population,Nahrung:planet.resources?.food})}
      <h3>Gebäude</h3>${table(planet.buildings)}<h3>Forschungen</h3>${table(planet.research)}
      <h3>Lebensformgebäude</h3>${table(planet.lifeform_buildings)}<h3>Lebensformforschungen</h3>${table(planet.lifeform_research)}
      <h3>Schiffe</h3>${table(planet.ships)}<h3>Verteidigung</h3>${table(planet.defense)}</article>`;
  }
  html += '</section>';
  const shipDelta = previous ? ((totals.ships || 0) - (previous.ships_total || 0)) : null;
  html += `<section class="panel account-card account-section"><h2>Entwicklung</h2><p>Flottenwachstum seit letztem Snapshot: <strong>${shipDelta == null ? "Noch kein Vergleich" : `${shipDelta >= 0 ? "+" : ""}${fmt(shipDelta)}`}</strong></p></section>`;
  if (main) main.innerHTML = html;
  $("#productionPeriod")?.addEventListener("change", event => {
    productionPeriod = event.target.value in PRODUCTION_PERIODS ? event.target.value : "24h";
    renderAccountData();
  });
  if ($("#accountFooter") && DATA.generated_at) $("#accountFooter").textContent = `Datendatei erzeugt ${new Date(DATA.generated_at).toLocaleString("de-DE")}`;
}

async function loadAccountData() {
  try {
    const response = await fetch(`account-data.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`account-data.json konnte nicht geladen werden (HTTP ${response.status})`);
    DATA = await response.json();
  } catch (error) {
    DATA = { players: [] };
    console.error("Accountdaten konnten nicht geladen werden:", error);
  }

  const players = Array.isArray(DATA?.players) ? DATA.players : [];
  const select = $("#accountPlayer");
  if (select) {
    select.innerHTML = players.length
      ? players.map(player => `<option value="${player.id}">${esc(player.name)}</option>`).join("")
      : '<option value="">Keine Accountdaten</option>';
    select.disabled = players.length === 0;
  }
  renderAccountData();
}

function start() {
  unlockShell();
  showDashboardView();
  if ($("#accountSubtitle")) $("#accountSubtitle").textContent = "Dashboard wird geladen …";
  loadAccountData();
}

function init() {
  $("#loginForm")?.addEventListener("submit", event => {
    event.preventDefault();
    setLoginError();
    if ($("#password")?.value !== TEST_PASSWORD) {
      setLoginError("Falsches Passwort.");
      return;
    }
    sessionStorage.setItem("oasAccountUnlocked", "1");
    start();
  });

  $("#accountPlayer")?.addEventListener("change", () => {
    renderAccountData();
    showAccountView();
  });
  $("#showAccountStats")?.addEventListener("click", showAccountView);
  $("#showDashboard")?.addEventListener("click", showDashboardView);
  $("#logout")?.addEventListener("click", () => {
    sessionStorage.removeItem("oasAccountUnlocked");
    location.reload();
  });

  if (sessionStorage.getItem("oasAccountUnlocked") === "1") start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
