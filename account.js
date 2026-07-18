const TEST_PASSWORD = "Test1234!";
const $ = selector => document.querySelector(selector);
const fmt = value => value == null ? "–" : new Intl.NumberFormat("de-DE").format(Number(value) || 0);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

let DATA = null;
let dashboardLoaded = false;

function setLoginError(message = "") {
  const node = $("#loginError");
  if (node) node.textContent = message;
}

function unlockShell() {
  $("#login").hidden = true;
  $("#app").hidden = false;
}

function showAccountView() {
  $("#accountMain").hidden = false;
  $("#dashboardView").hidden = true;
  $("#showAccountStats")?.classList.add("active");
  $("#showDashboard")?.classList.remove("active");
}

function showDashboardView() {
  $("#accountMain").hidden = true;
  $("#dashboardView").hidden = false;
  $("#showAccountStats")?.classList.remove("active");
  $("#showDashboard")?.classList.add("active");
  if (!dashboardLoaded) {
    $("#dashboardFrame").src = "account-dashboard/index.html";
    dashboardLoaded = true;
  }
}

function table(obj, empty = "Noch nicht erfasst") {
  const rows = Object.entries(obj || {});
  if (!rows.length) return `<p class="missing-data">${empty}</p>`;
  return `<table class="data-table"><tbody>${rows.map(([key,value]) => `<tr><td>${esc(key)}</td><td>${fmt(value)}</td></tr>`).join("")}</tbody></table>`;
}

function resources(planet) {
  const current = planet.resources || {};
  const hourly = planet.production_hour || {};
  const labels = {metal:"Metall", crystal:"Kristall", deuterium:"Deuterium"};
  return `<div class="production-grid">${["metal","crystal","deuterium"].map(key => `<div class="production-item"><strong>${labels[key]}</strong><div>Bestand: ${fmt(current[key])}</div><div>1 h: ${fmt(hourly[key])}</div><div>24 h: ${fmt((hourly[key] || 0) * 24)}</div></div>`).join("")}</div>`;
}

function render() {
  const players = Array.isArray(DATA?.players) ? DATA.players : [];
  const id = $("#accountPlayer").value;
  const player = players.find(item => String(item.id) === id) || players[0];

  if (!player || !player.latest) {
    $("#accountTitle").textContent = "OGame Dashboard";
    $("#accountSubtitle").textContent = "Keine separaten Accountstatistiken vorhanden – das Dashboard ist verfügbar.";
    $("#accountMain").innerHTML = '<section class="panel account-card account-section"><h2>Keine Accountdaten vorhanden</h2><p>Öffne über den Reiter „Dashboard“ die aktuelle OGame-Auswertung.</p></section>';
    showDashboardView();
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
  html += `<section class="panel account-card account-section"><h2>Gesamtproduktion aller Planeten</h2>${resources({resources:totals.resources,production_hour:totals.production_hour})}</section>`;
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
  $("#accountMain").innerHTML = html;
  $("#accountFooter").textContent = `Datendatei erzeugt ${new Date(DATA.generated_at).toLocaleString("de-DE")}`;
  showAccountView();
}

async function start() {
  unlockShell();
  $("#accountSubtitle").textContent = "Daten werden geladen …";

  try {
    const response = await fetch(`account-data.json?v=${Date.now()}`, {cache:"no-store"});
    if (!response.ok) throw new Error(`account-data.json konnte nicht geladen werden (HTTP ${response.status})`);
    DATA = await response.json();
  } catch (error) {
    DATA = {players:[]};
    console.error(error);
  }

  const players = Array.isArray(DATA.players) ? DATA.players : [];
  $("#accountPlayer").innerHTML = players.length
    ? players.map(player => `<option value="${player.id}">${esc(player.name)}</option>`).join("")
    : '<option value="">Keine Accountdaten</option>';
  $("#accountPlayer").disabled = players.length === 0;
  render();
}

$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();
  setLoginError();
  if ($("#password").value !== TEST_PASSWORD) {
    setLoginError("Falsches Passwort.");
    return;
  }
  sessionStorage.setItem("oasAccountUnlocked", "1");
  start();
});

$("#accountPlayer").addEventListener("change", render);
$("#showAccountStats").addEventListener("click", showAccountView);
$("#showDashboard").addEventListener("click", showDashboardView);
$("#logout").addEventListener("click", () => {
  sessionStorage.removeItem("oasAccountUnlocked");
  location.reload();
});

if (sessionStorage.getItem("oasAccountUnlocked") === "1") start();
