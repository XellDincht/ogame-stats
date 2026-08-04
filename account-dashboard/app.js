const state = { summary: null, snapshots: [], planets: [], production: [], technologies: [], flights: [], selectedAccount: null, selectedSnapshot: null, productionHours: 24, renderToken: 0, objectView: new Map() };
const $ = s => document.querySelector(s); const nf = new Intl.NumberFormat('de-DE');
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const fmt = v => Number.isFinite(Number(v)) ? nf.format(Math.trunc(Number(v))) : '–';
const prodFmt = v => {
  v = Number(v) || 0;

  if (Math.abs(v) < 1000) return fmt(v);

  if (Math.abs(v) < 1e6) {
    return `${Math.floor(v / 100) / 10} K`;
  }

  return `${(v / 1e6).toFixed(1)} M`;
};const dateFmt = v => v ? new Date(v).toLocaleString('de-DE') : '–';
const LIFEFORM_TECH_NAMES = {
  "11101": "Wohnsektor", "11102": "Biosphären-Farm", "11103": "Forschungszentrum", "11104": "Akademie der Wissenschaften", "11105": "Neuro-Kalibrierungszentrum", "11106": "Hochenergie-Schmelze", "11107": "Nahrungsspeicher", "11108": "Fusionsbetriebene Förderung", "11109": "Skyscraper", "11110": "Biotech-Labor", "11111": "Metropolis", "11112": "Planetar-Schild",
  "11201": "Intergalaktische Botschafter", "11202": "Hochleistungs-Extraktoren", "11203": "Fusionstriebwerke", "11204": "Tarnfeld-Generator", "11205": "Orbital-Versteck", "11206": "Forschungs-KI", "11207": "Hochleistungs-Terraformer", "11208": "Verbesserte Förderungstechnologien", "11209": "Leichter Jäger Mk II", "11210": "Kreuzer Mk II", "11211": "Verbesserte Labortechnik", "11212": "Plasma-Terraformer", "11213": "Niedrigtemperatur-Triebwerke", "11214": "Bomber Mk II", "11215": "Zerstörer Mk II", "11216": "Schlachtkreuzer Mk II", "11217": "Roboter-Assistenten", "11218": "Supercomputer",
  "12101": "Meditationsenklave", "12102": "Kristallzucht", "12103": "Runentechnologikum", "12104": "Runenschmiede", "12105": "Oriktorium", "12106": "Magma-Schmelze", "12107": "Disruptionskammer", "12108": "Felsenmonument", "12109": "Kristall-Raffinerie", "12110": "Deuterium-Syntonisierer", "12111": "Mineral-Forschungszentrum", "12112": "Hochleistungs-Verwertungsanlage",
  "12201": "Vulkanische Batterien", "12202": "Akustische Sondierung", "12203": "Hochenergie-Pumpsysteme", "12204": "Laderaum-Erweiterung (Zivile Schiffe)", "12205": "Magmabetriebene Förderung", "12206": "Geothermie-Kraftwerke", "12207": "Tiefensondierung", "12208": "Ionenkristall-Verstärkung (Schwerer Jäger)", "12209": "Verbesserter Stellarator", "12210": "Gehärtete Diamant-Bohrköpfe", "12211": "Seismische Abbautechnologien", "12212": "Magmabetriebenes Pumpsystem", "12213": "Ionenkristall-Module", "12214": "Optimierte Silo-Bauweise", "12215": "Diamant-Energietransmitter", "12216": "Obsidian-Schildverstärkung", "12217": "Runenschilde", "12218": "Rock’tal-Kollektorverstärkung",
  "13101": "Fertigungsstraße", "13102": "Fusionszellen-Fabrik", "13103": "Robotik-Forschungszentrum", "13104": "Update-Netzwerk", "13105": "Quanten-Computerzentrum", "13106": "Automatisiertes Montagezentrum", "13107": "Hochleistungs-Transformator", "13108": "Mikrochip-Fertigungsstraße", "13109": "Fließband-Montagehalle", "13110": "Hochleistungs-Synthetisierer", "13111": "Chip-Massenproduktion", "13112": "Nano-Reparaturbots",
  "13201": "Katalysator-Technik", "13202": "Plasma-Antrieb", "13203": "Effizienz-Modul", "13204": "Depot-KI", "13205": "Generalüberholung (Leichter Jäger)", "13206": "Automatisierte Förderstraßen", "13207": "Verbesserte Drohnen-KI", "13208": "Experimentelle Wiederaufbereitungstechnik", "13209": "Generalüberholung (Kreuzer)", "13210": "Slingshot-Autopilot", "13211": "Hochtemperatur-Supraleiter", "13212": "Generalüberholung (Schlachtschiff)", "13213": "Künstliche Schwarmintelligenz", "13214": "Generalüberholung (Schlachtkreuzer)", "13215": "Generalüberholung (Bomber)", "13216": "Generalüberholung (Zerstörer)", "13217": "Experimentelle Waffentechnik", "13218": "Mecha-Generalverstärkung",
  "14101": "Refugium", "14102": "Antimaterie-Kondensator", "14103": "Vortexkammer", "14104": "Hallen der Erkenntnis", "14105": "Forum der Transzendenz", "14106": "Antimaterie-Konvektor", "14107": "Klonlabor", "14108": "Chrysalis-Akzelerator", "14109": "Bio-Modifikator", "14110": "Psionischer Modulator", "14111": "Schiffs-Fabrikationshalle", "14112": "Supra-Refraktor",
  "14201": "Wärme-Rückgewinnung", "14202": "Sulfid-Prozesstechnik", "14203": "Psionisches Netzwerk", "14204": "Telekinese-Traktorstrahl", "14205": "Verbesserte Sensortechnik", "14206": "Neuromodaler Komprimator", "14207": "Neuro-Interface", "14208": "Superglobales Analysenetzwerk", "14209": "Übertaktung (Schwerer Jäger)", "14210": "Telekinetisches Schubsystem", "14211": "Sechster Sinn", "14212": "Psycho-Harmonisierer", "14213": "Effiziente Schwarmintelligenz", "14214": "Übertaktung (Großer Transporter)", "14215": "Gravitationssensoren", "14216": "Übertaktung (Schlachtschiff)", "14217": "Psionische Schutzmatrix", "14218": "Kaelesh-Entdeckerverstärkung"
};
function technologyName(t) { const raw = String(t.name || t.technology_name || '').trim(); const id = String(t.technology_id); if (raw && !/^Technologie\s+\d+$/i.test(raw)) return raw; return LIFEFORM_TECH_NAMES[id] || raw || `Technologie ${id}` }
let heightFrame = 0;
function notifyParentHeight() { if (window.parent === window) return; const height = Math.ceil(Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0)); if (height === heightFrame) return; heightFrame = height; window.parent.postMessage({ type: 'ogame-dashboard-height', height }, window.location.origin) }
async function json(path) { const r = await fetch(path, { cache: 'no-store' }); if (!r.ok) throw Error(`${path}: HTTP ${r.status}`); return r.json() }
function accountKey(a) { return `${a.player_id}|${a.universe}` }
function account() { return state.summary.accounts.find(a => accountKey(a) === state.selectedAccount) }
function localDay(v) { const d = new Date(v); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function dailySnapshots(a) {
  const all = state.snapshots
    .filter(s => s.player_id === a.player_id && s.universe === a.universe)
    .sort((x, y) => x.created_at.localeCompare(y.created_at));
  const byDay = new Map();
  for (const snapshot of all) {
    const day = localDay(snapshot.created_at);
    const group = byDay.get(day) || [];
    group.push(snapshot);
    byDay.set(day, group);
  }
  const today = localDay(new Date().toISOString());
  return [...byDay.entries()]
    .map(([day, group]) => day === today ? group.at(-1) : group[0])
    .sort((x, y) => y.created_at.localeCompare(x.created_at));
}
function selectedSnapshot(a) { const daily = dailySnapshots(a); return daily.find(s => s.snapshot_id === state.selectedSnapshot) || daily[0] }
function previousDailySnapshot(a, s) { const daily = dailySnapshots(a); const i = daily.findIndex(x => x.snapshot_id === s.snapshot_id); return i >= 0 ? daily[i + 1] || null : null }
function ownRows(list, s) { return s ? list.filter(x => x.snapshot_id === s.snapshot_id) : [] }
function sumShipsMap(flights) { const out = {}; for (const f of flights) { for (const [key, val] of Object.entries(f.ships || {})) out[key] = (out[key] || 0) + (Number(val) || 0) } return out }
function movingShipTotal(flights) { return flights.reduce((sum, f) => { const explicit = Number(f.ship_count); if (Number.isFinite(explicit) && explicit >= 0) return sum + explicit; return sum + Object.values(f.ships || {}).reduce((n, v) => n + (Number(v) || 0), 0) }, 0) }
function shipValue(map, name, id) { return Number(map[name] ?? map[id] ?? map[String(id)] ?? 0) || 0 }

function normalizedCoordinates(value) {
  return String(value || '').replace(/[\[\]\s]/g, '');
}
function objectType(value) {
  return String(value || 'planet').toLowerCase() === 'moon' ? 'moon' : 'planet';
}
function objectSlotKey(object) {
  const coords = normalizedCoordinates(object?.coordinates);
  return coords || `${objectType(object)}:${object?.planet_id ?? object?.name ?? 'unknown'}`;
}
function buildObjectSlots(objects) {
  const byCoordinates = new Map();
  for (const object of objects || []) {
    const key = objectSlotKey(object);
    const slot = byCoordinates.get(key) || { key, planet: null, moon: null, order: object.planet_order ?? 999 };
    slot[objectType(object)] = object;
    slot.order = Math.min(slot.order ?? 999, object.planet_order ?? 999);
    byCoordinates.set(key, slot);
  }
  return [...byCoordinates.values()]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map(slot => {
      const requested = state.objectView.get(slot.key);
      const activeType = requested === 'moon' && slot.moon ? 'moon' : 'planet';
      const active = slot[activeType] || slot.planet || slot.moon;
      const alternate = activeType === 'planet' ? slot.moon : slot.planet;
      return { ...slot, activeType: objectType(active?.object_type), active, alternate };
    });
}
function selectedObjects(slots) {
  return slots.map(slot => slot.active).filter(Boolean);
}
function objectForPreviousSlot(slot, previousObjects) {
  const sameCoordinates = previousObjects.filter(object => objectSlotKey(object) === slot.key);
  const preferred = sameCoordinates.find(object => objectType(object.object_type) === slot.activeType);
  return preferred || sameCoordinates[0] || null;
}

function setColumnWidth(count) { const usable = Math.max(760, window.innerWidth) - 430; const width = Math.max(82, Math.min(122, Math.floor(usable / Math.max(count, 1)))); document.documentElement.style.setProperty('--planet-width', `${width}px`) }
function header(slots) {
  return `<tr><th class="label-col">Imperium</th>${slots.map(slot => {
    const object = slot.active;
    const alternate = slot.alternate;
    const activeLabel = slot.activeType === 'moon' ? 'Mond' : 'Planet';
    const alternateLabel = slot.activeType === 'moon' ? 'Zum Planeten wechseln' : 'Zum Mond wechseln';
    return `<th class="planet-head object-${slot.activeType}">
      <div class="celestial-images">
        ${object?.image_url ? `<img class="planet-image main-celestial-image" src="${esc(object.image_url)}" alt="${activeLabel}">` : `<div class="planet-image main-celestial-image"></div>`}
        ${alternate ? `<button type="button" class="celestial-toggle" data-object-toggle="${esc(slot.key)}" title="${alternateLabel}" aria-label="${alternateLabel}">
          ${alternate.image_url ? `<img src="${esc(alternate.image_url)}" alt="">` : `<span>${slot.activeType === 'moon' ? '🪐' : '🌙'}</span>`}
        </button>` : ''}
        <span class="celestial-type-badge">${activeLabel}</span>
      </div>
      <div class="planet-name">${esc(object?.name || activeLabel)}</div>
      <div class="coords">${esc(object?.coordinates || '')}</div>
      <div class="planet-meta">${fmt(object?.fields_used)}/${fmt(object?.fields_total)} · ${fmt(object?.temperature_min_c)}–${fmt(object?.temperature_max_c)} °C</div>
    </th>`;
  }).join('')}<th class="summary-col">Ø</th><th class="travelling-col">Unterwegs</th><th class="summary-col">Gesamt</th></tr>`;
}
function normalTech(t) { return Number(t.technology_id) < 10000 }
const LIFEFORM_RACES = [
  { name: 'Menschen', prefix: 11 },
  { name: "Rock’tal", prefix: 12 },
  { name: 'Mechas', prefix: 13 },
  { name: 'Kaelesh', prefix: 14 }
];
function lifeformPart(prefix, part) { return t => { const id = Number(t.technology_id); if (!Number.isFinite(id) || Math.floor(id / 1000) !== prefix) return false; const suffix = id % 1000; return part === 'buildings' ? (suffix >= 100 && suffix < 200) : (suffix >= 200 && suffix < 300) } }
function subheading(label, key) { return `<tr class="subsection-row" data-group="${key}"><td colspan="999">${esc(label)}</td></tr>` }
function lifeformRaceSection(race, planets, techRows, travelling, previousTechRows, hasPrevious) { const key = `lifeform_${race.prefix}`; const buildings = technologyRows('lifeform_buildings', planets, techRows, travelling, lifeformPart(race.prefix, 'buildings'), key, previousTechRows, hasPrevious); const research = technologyRows('lifeform_research', planets, techRows, travelling, lifeformPart(race.prefix, 'research'), key, previousTechRows, hasPrevious); if (!buildings && !research) return ''; let rows = ''; if (buildings) rows += subheading('Gebäude', key) + buildings; if (research) rows += subheading('Forschung', key) + research; return section(race.name, key, rows) }
function lifeformSubtitle(planets) { const names = [...new Set(planets.map(p => p.lifeform_name).filter(Boolean))]; return names.length ? names.join(' · ') : '' }
function updateSnapshotSelect(a) { const sel = $('#snapshotSelect'); const daily = dailySnapshots(a); sel.innerHTML = daily.map(s => `<option value="${esc(s.snapshot_id)}">${new Date(s.created_at).toLocaleDateString('de-DE')} · ${new Date(s.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</option>`).join(''); if (!state.selectedSnapshot || !daily.some(s => s.snapshot_id === state.selectedSnapshot)) state.selectedSnapshot = daily[0]?.snapshot_id || null; sel.value = state.selectedSnapshot || '' }
async function render() {
  const token = ++state.renderToken;
  const a = account();
  if (!a) return;
  updateSnapshotSelect(a);
  const s = selectedSnapshot(a);
  const prev = s ? previousDailySnapshot(a, s) : null;
  if (!s) return;

  const message = $('#message');
  if (message) {
    message.textContent = 'Tagesstand wird geladen …';
    message.classList.remove('hidden');
  }

  try {
    const [currentData, previousData] = await Promise.all([
      window.ogameAccountDashboardDataSource.loadSnapshot(s.snapshot_id),
      prev ? window.ogameAccountDashboardDataSource.loadSnapshot(prev.snapshot_id) : Promise.resolve(null)
    ]);
    if (token !== state.renderToken) return;

    state.planets = [...(currentData.planets || []), ...(previousData?.planets || [])];
    state.production = [...(currentData.production || []), ...(previousData?.production || [])];
    state.technologies = [...(currentData.technologies || []), ...(previousData?.technologies || [])];
    state.flights = [...(currentData.flights || []), ...(previousData?.flights || [])];

    const allCurrentObjects = ownRows(state.planets, s).sort((x, y) => (x.planet_order ?? 999) - (y.planet_order ?? 999));
    const allPreviousObjects = ownRows(state.planets, prev).sort((x, y) => (x.planet_order ?? 999) - (y.planet_order ?? 999));
    const objectSlots = buildObjectSlots(allCurrentObjects);
    const planets = selectedObjects(objectSlots);
    const previousSelectedObjects = objectSlots.map(slot => objectForPreviousSlot(slot, allPreviousObjects)).filter(Boolean);
    setColumnWidth(planets.length);
    const prodRows = ownRows(state.production, s), techRows = ownRows(state.technologies, s), flights = ownRows(state.flights, s);
    const previousProdRows = ownRows(state.production, prev), previousTechRows = ownRows(state.technologies, prev);
    const prods = new Map(prodRows.map(x => [x.planet_id, x]));
    const previousProds = new Map(previousProdRows.map(x => [x.planet_id, x]));
    const travelling = sumShipsMap(flights);
    const stationary = techRows.filter(t => t.category === 'ships').reduce((n, t) => n + (Number(t.value) || 0), 0);
    const moving = movingShipTotal(flights);
    const totals = { metal: 0, crystal: 0, deut: 0 };
    for (const p of planets) {
      const r = prods.get(p.planet_id) || {};
      totals.metal += Number(r.metal_per_hour) || 0;
      totals.crystal += Number(r.crystal_per_hour) || 0;
      totals.deut += Number(r.deuterium_per_hour) || 0;
    }
    const factor = state.productionHours, label = periodLabel(), productionTotal = (totals.metal + totals.crystal + totals.deut) * factor;
    $('#playerName').textContent = a.player_name;
    $('#universe').textContent = a.universe;
    $('#latestSnapshot').textContent = dateFmt(s.created_at);
    const planetCount = allCurrentObjects.filter(object => objectType(object.object_type) === 'planet').length;
    const moonCount = allCurrentObjects.filter(object => objectType(object.object_type) === 'moon').length;
    $('#planetCount').textContent = `${fmt(planetCount)} / ${fmt(moonCount)}`;
    const countLabel = $('#objectCountLabel');
    if (countLabel) countLabel.textContent = 'Planeten / Monde';
    $('#metalPeriodLabel').textContent = `Metall / ${label}`;
    $('#crystalPeriodLabel').textContent = `Kristall / ${label}`;
    $('#deutPeriodLabel').textContent = `Deuterium / ${label}`;
    $('#sumPeriodLabel').textContent = `∑ Produktion / ${label}`;
    $('#totalMetal').textContent = prodFmt(totals.metal * factor);
    $('#totalCrystal').textContent = prodFmt(totals.crystal * factor);
    $('#totalDeuterium').textContent = prodFmt(totals.deut * factor);
    $('#totalProduction').textContent = prodFmt(productionTotal);
    $('#stationedShips').textContent = fmt(stationary);
    $('#travellingShips').textContent = fmt(moving);
    $('#allShips').textContent = fmt(stationary + moving);
    $('#travellingHint').textContent = moving === 0 && flights.length ? 'Flotten erkannt, aber Anzahl nicht lesbar' : '';
    $('#empireHead').innerHTML = header(objectSlots);
    const categories = [['Gebäude', 'buildings'], ['Anlagen', 'facilities'], ['Forschung', 'research'], ['Schiffe', 'ships'], ['Verteidigung', 'defenses']];
    let body = section('Produktion', 'production', productionRows(planets, prods, previousProds, Boolean(prev)));
    for (const [categoryLabel, key] of categories) body += section(categoryLabel, key, technologyRows(key, planets, techRows, travelling, normalTech, key, previousTechRows, Boolean(prev)));
    for (const race of LIFEFORM_RACES) body += lifeformRaceSection(race, planets, techRows, travelling, previousTechRows, Boolean(prev));
    $('#empireBody').innerHTML = body;
    document.querySelectorAll('[data-object-toggle]').forEach(button => {
      button.onclick = async () => {
        const key = button.dataset.objectToggle;
        const current = state.objectView.get(key) || 'planet';
        state.objectView.set(key, current === 'moon' ? 'planet' : 'moon');
        await render();
      };
    });
    document.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => {
      const key = b.dataset.toggle;
      b.closest('.section-row').classList.toggle('collapsed');
      document.querySelectorAll(`[data-group="${key}"]`).forEach(r => r.classList.toggle('hidden-row'));
      requestAnimationFrame(notifyParentHeight);
    });
    if (message) message.classList.add('hidden');
    requestAnimationFrame(notifyParentHeight);
  } catch (error) {
    if (token !== state.renderToken) return;
    if (message) {
      message.textContent = `Tagesstand konnte nicht geladen werden: ${error.message}`;
      message.classList.remove('hidden');
    }
  }
}
if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(notifyParentHeight)).observe(document.documentElement); window.addEventListener('load', notifyParentHeight); window.addEventListener('resize', notifyParentHeight);
async function init() {
  try {
    const loaded = await window.ogameAccountDashboardDataSource.load();
    const { summary, snapshots } = loaded;
    Object.assign(state, { summary, snapshots, planets: [], production: [], technologies: [], flights: [] });
    const sel = $('#accountSelect');
    sel.innerHTML = summary.accounts.map(a => `<option value="${esc(accountKey(a))}">${esc(a.player_name)} · ${esc(a.universe)}</option>`).join('');
    state.selectedAccount = sel.value;
    sel.onchange = async () => {
      state.selectedAccount = sel.value;
      state.selectedSnapshot = null;
      state.objectView.clear();
      await render();
    };
    $('#snapshotSelect').onchange = async e => {
      state.selectedSnapshot = e.target.value;
      await render();
    };
    document.querySelectorAll('[data-period]').forEach(button => button.onclick = async () => {
      state.productionHours = Number(button.dataset.period) || 24;
      document.querySelectorAll('[data-period]').forEach(item => item.classList.toggle('active', item === button));
      await render();
    });
    $('#reloadButton').onclick = () => location.reload();
    window.addEventListener('resize', () => setColumnWidth(buildObjectSlots(ownRows(state.planets, selectedSnapshot(account()))).length));
    await render();
  } catch (e) {
    $('#message').textContent = `Dashboard konnte nicht geladen werden: ${e.message}`;
    $('#message').classList.remove('hidden');
  }
}
init();
