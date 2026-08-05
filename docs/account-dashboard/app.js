console.info('[OGame] Imperiumsübersicht app.js v8.7.5 geladen');
const state = { summary: null, snapshots: [], planets: [], production: [], technologies: [], flights: [], selectedAccount: null, selectedSnapshot: null, productionHours: 24, renderToken: 0, objectMode: 'planet', activeTab: 'overview' };
const $ = s => document.querySelector(s); const nf = new Intl.NumberFormat('de-DE');
const percentFmt = value => Number(value || 0).toLocaleString('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3
});

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
function measuredDocumentHeight() {
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');
  const mainBottom = main?.getBoundingClientRect().bottom || 0;
  const footerBottom = footer?.getBoundingClientRect().bottom || 0;

  // Nur reale Inhaltsunterkante messen. documentElement/body scrollHeight
  // enthalten im iframe die bereits gesetzte Viewport-Höhe und würden
  // eine Endlosschleife erzeugen.
  return Math.ceil(Math.max(mainBottom, footerBottom, 480) + 2);
}

function notifyParentHeight(force = false) {
  if (window.parent === window) return;

  const height = measuredDocumentHeight();
  if (!force && Math.abs(height - heightFrame) < 2) return;

  heightFrame = height;
  window.parent.postMessage(
    { type: 'ogame-dashboard-height', height },
    window.location.origin
  );
}

function scheduleHeightMeasurements() {
  requestAnimationFrame(() => notifyParentHeight(true));
  window.setTimeout(() => notifyParentHeight(true), 80);
  window.setTimeout(() => notifyParentHeight(true), 240);
  window.setTimeout(() => notifyParentHeight(true), 600);
}

function accountKey(account) {
  return `${String(account?.universe || '').toLowerCase()}:${String(account?.player_id ?? '')}`;
}

function account() {
  const accounts = state.summary?.accounts || [];
  return accounts.find(item => accountKey(item) === state.selectedAccount) || accounts[0] || null;
}

function viennaDay(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));

  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function dailySnapshots(selectedAccount) {
  if (!selectedAccount) return [];

  const matching = (state.snapshots || [])
    .filter(snapshot =>
      String(snapshot.player_id) === String(selectedAccount.player_id) &&
      String(snapshot.universe || '').toLowerCase() === String(selectedAccount.universe || '').toLowerCase()
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const byDay = new Map();
  for (const snapshot of matching) {
    const day = viennaDay(snapshot.created_at);
    if (!day) continue;
    const entries = byDay.get(day) || [];
    entries.push(snapshot);
    byDay.set(day, entries);
  }

  const today = viennaDay(new Date());
  return [...byDay.entries()]
    .sort(([dayA], [dayB]) => dayB.localeCompare(dayA))
    .map(([day, entries]) => {
      entries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return day === today ? entries.at(-1) : entries[0];
    })
    .filter(Boolean);
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
function normalizedObjectType(value) {
  return String(value || 'planet').toLowerCase() === 'moon' ? 'moon' : 'planet';
}
function objectSlotKey(object) {
  const coords = normalizedCoordinates(object?.coordinates);
  return coords || `${normalizedObjectType(object?.object_type)}:${object?.planet_id ?? object?.name ?? 'unknown'}`;
}
function buildObjectSlots(objects) {
  const slots = new Map();

  for (const object of objects || []) {
    const key = objectSlotKey(object);
    const current = slots.get(key) || {
      key,
      order: object.planet_order ?? 999,
      planet: null,
      moon: null
    };

    current[normalizedObjectType(object.object_type)] = object;
    current.order = Math.min(current.order ?? 999, object.planet_order ?? 999);
    slots.set(key, current);
  }

  return [...slots.values()]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map(slot => {
      const activeType = state.objectMode === 'moon' ? 'moon' : 'planet';
      const active = slot[activeType] || null;
      const alternate = activeType === 'moon' ? slot.planet : slot.moon;
      const placeholder = !active
        ? {
            planet_id: `missing-moon:${slot.key}`,
            name: '',
            coordinates: slot.planet?.coordinates || '',
            object_type: 'missing_moon',
            planet_order: slot.order,
            image_url: slot.planet?.image_url || null,
            fields_used: null,
            fields_total: null,
            temperature_min_c: null,
            temperature_max_c: null,
            is_placeholder: true
          }
        : null;

      return {
        ...slot,
        activeType,
        active: active || placeholder,
        alternate,
        hasActiveObject: Boolean(active)
      };
    });
}
function previousObjectForSlot(slot, previousObjects) {
  if (!slot.hasActiveObject) return null;
  const matching = previousObjects.filter(object => objectSlotKey(object) === slot.key);
  return matching.find(object => normalizedObjectType(object.object_type) === slot.activeType) || null;
}

function setColumnWidth(count) { const usable = Math.max(760, window.innerWidth) - 430; const width = Math.max(82, Math.min(122, Math.floor(usable / Math.max(count, 1)))); document.documentElement.style.setProperty('--planet-width', `${width}px`) }
function header(slots) {
  return `<tr>
    <th class="label-col compact-label-head">Wert</th>
    ${slots.map(slot => {
      const missing = state.objectMode === 'moon' && !slot.hasActiveObject;
      const object = slot.active;
      return `<th class="compact-object-head${missing ? ' missing-object-head' : ''}">
        <span>${missing ? '' : esc(object?.name || '')}</span>
        <small>${missing ? '' : esc(object?.coordinates || '')}</small>
      </th>`;
    }).join('')}
    <th class="summary-col">Ø</th>
    <th class="travelling-col bonus-col">Bonus</th>
    <th class="summary-col">Gesamt</th>
  </tr>`;
}

const TAB_LABELS = {
  overview: 'Übersicht',
  buildings: 'Versorgung',
  research: 'Forschung',
  lifeform: 'Lebensform',
  facilities: 'Anlagen',
  ships: 'Flotte',
  defenses: 'Verteidigung',
  production: 'Produktion'
};

function categoryTotalForObject(techRows, objectId, category) {
  return techRows
    .filter(row => row.planet_id === objectId && row.category === category)
    .reduce((sum, row) => sum + (Number(row.value) || 0), 0);
}

function productionForPlanet(prods, planet) {
  const row = prods.get(planet?.planet_id) || {};
  const factor = state.productionHours;
  const metal = (Number(row.metal_per_hour) || 0) * factor;
  const crystal = (Number(row.crystal_per_hour) || 0) * factor;
  const deut = (Number(row.deuterium_per_hour) || 0) * factor;
  return { metal, crystal, deut, sum: metal + crystal + deut };
}

function resourceIcon(type) {
  const common = 'viewBox="0 0 32 32" aria-hidden="true" focusable="false"';
  if (type === 'metal') return `<svg class="resource-svg metal-svg" ${common}><path d="M5 11 16 5l11 6-11 6L5 11Z"/><path d="m5 16 11 6 11-6"/><path d="m5 21 11 6 11-6"/></svg>`;
  if (type === 'crystal') return `<svg class="resource-svg crystal-svg" ${common}><path d="m16 3 8 8-4 17H12L8 11l8-8Z"/><path d="m8 11 8 5 8-5M16 3v13M12 28l4-12 4 12"/></svg>`;
  if (type === 'deut') return `<svg class="resource-svg deut-svg" ${common}><path d="M16 3c4 6 9 11 9 17a9 9 0 1 1-18 0c0-6 5-11 9-17Z"/><path d="M11 21c2 2 8 2 10-1"/></svg>`;
  return `<svg class="resource-svg sum-svg" ${common}><path d="M23 6H9l8 10-8 10h14"/></svg>`;
}

function celestialCard(slot, prods, techRows) {
  const foreground = slot.active;
  const planet = slot.planet;
  const moon = slot.moon;
  const moonMode = state.objectMode === 'moon';
  const missingMoon = moonMode && !moon;
  const background = moonMode ? planet : moon;
  const foregroundImage = missingMoon ? null : foreground?.image_url;
  const backgroundImage = background?.image_url;
  const production = productionForPlanet(prods, planet);

  let stats = '';
  if (!moonMode) {
    stats = `
      <div class="card-stat metal-stat"><span>${resourceIcon('metal')}</span><strong>${prodFmt(production.metal)}</strong></div>
      <div class="card-stat crystal-stat"><span>${resourceIcon('crystal')}</span><strong>${prodFmt(production.crystal)}</strong></div>
      <div class="card-stat deut-stat"><span>${resourceIcon('deut')}</span><strong>${prodFmt(production.deut)}</strong></div>
    `;
  } else if (!missingMoon) {
    stats = `
      <div class="moon-field-stat"><span>Felder</span><strong>${fmt(foreground.fields_used)} / ${fmt(foreground.fields_total)}</strong></div>
    `;
  } else {
    stats = `<div class="empty-card-stats"></div>`;
  }

  return `<article class="celestial-card${missingMoon ? ' missing-moon-card' : ''}">
    <div class="card-title">
      <strong>${missingMoon ? '' : esc(foreground?.name || '')}</strong>
      <span>${missingMoon ? '' : esc(foreground?.coordinates || '')}</span>
    </div>

    <button type="button" class="orb-stack" data-mode-switch title="${moonMode ? 'Zu den Planeten wechseln' : 'Zu den Monden wechseln'}">
      ${backgroundImage
        ? `<img class="orb-image orb-background" src="${esc(backgroundImage)}" alt="">`
        : `<span class="orb-silhouette orb-background" aria-hidden="true"></span>`}
      ${foregroundImage
        ? `<img class="orb-image orb-foreground" src="${esc(foregroundImage)}" alt="">`
        : `<span class="orb-silhouette orb-foreground" aria-hidden="true"></span>`}
    </button>

    <div class="card-stats${moonMode ? ' moon-card-stats' : ''}">${stats}</div>
    ${!moonMode && !missingMoon ? `<div class="lf-building-card-bonus" title="Lokaler Bonus aus Lebensformgebäuden">
      <strong>${effectText(localLifeformBuildingSummary(planet.planet_id, techRows))}</strong>
    </div>` : ''}
  </article>`;
}

function renderCelestialCards(slots, prods, techRows) {
  const container = $('#celestialCards');
  if (!container) return;
  const switchTile = `<button type="button" class="celestial-switch-card" data-mode-switch aria-label="${state.objectMode === 'moon' ? 'Zu den Planeten wechseln' : 'Zu den Monden wechseln'}">
    <span class="switch-orb">${state.objectMode === 'moon' ? '🌍' : '🌕'}</span>
    <strong>${state.objectMode === 'moon' ? 'Planeten' : 'Monde'}</strong>
    <small>Ansicht wechseln</small>
  </button>`;
  container.innerHTML = switchTile + slots.map(slot => celestialCard(slot, prods, techRows)).join('');
  container.querySelectorAll('[data-mode-switch]').forEach(button => {
    button.onclick = () => switchObjectMode();
  });
}

function validTabsForMode() {
  return state.objectMode === 'moon'
    ? ['overview', 'facilities', 'ships', 'defenses']
    : ['overview', 'production', 'buildings', 'research', 'lifeform', 'facilities', 'ships', 'defenses'];
}

function updateTabs() {
  const validTabs = validTabsForMode();
  if (!validTabs.includes(state.activeTab)) state.activeTab = 'overview';

  document.querySelectorAll('#dashboardTabs [data-tab]').forEach(button => {
    const visible = validTabs.includes(button.dataset.tab);
    button.hidden = !visible;
    button.classList.toggle('active', button.dataset.tab === state.activeTab);
  });

  const periodStrip = $('#productionPeriodStrip');
  if (periodStrip) periodStrip.hidden = state.activeTab !== 'production';

  const title = $('#detailTabTitle');
  if (title) title.textContent = TAB_LABELS[state.activeTab] || 'Übersicht';

  const modeLabel = $('#detailModeLabel');
  if (modeLabel) modeLabel.textContent = state.objectMode === 'moon' ? 'Monde' : 'Planeten';

  const table = $('#empireTable');
  if (table) table.classList.toggle('show-bonus', state.activeTab === 'research' || state.activeTab === 'lifeform');
}

function switchObjectMode() {
  const stage = $('.celestial-stage');
  if (stage?.classList.contains('is-switching')) return;

  stage?.classList.add('is-switching');
  window.setTimeout(async () => {
    state.objectMode = state.objectMode === 'moon' ? 'planet' : 'moon';
    if (!validTabsForMode().includes(state.activeTab)) state.activeTab = 'overview';
    await render();
    $('.celestial-stage')?.classList.add('switch-arrived');
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        $('.celestial-stage')?.classList.remove('is-switching', 'switch-arrived');
      }, 260);
    });
  }, 130);
}

function overviewValueRows(slots, techRows) {
  const objects = slots.map(slot => slot.active);
  const row = (label, values, formatter = value => esc(value ?? '–')) => {
    const numeric = values.map(value => Number(value)).filter(Number.isFinite);
    const total = numeric.reduce((sum, value) => sum + value, 0);
    const average = numeric.length ? total / numeric.length : null;
    return `<tr class="data-row overview-row">
      <td class="label-col">${esc(label)}</td>
      ${values.map((value, index) => `<td class="${objects[index]?.is_placeholder ? 'missing-moon-cell' : ''}">${objects[index]?.is_placeholder ? '' : formatter(value)}</td>`).join('')}
      <td class="summary-col">${average == null ? '–' : fmt(average)}</td>
      <td class="travelling-col bonus-col">–</td>
      <td class="summary-col">${numeric.length ? fmt(total) : '–'}</td>
    </tr>`;
  };

  const fieldsUsed = objects.map(object => object?.is_placeholder ? null : object?.fields_used);
  const fieldsTotal = objects.map(object => object?.is_placeholder ? null : object?.fields_total);
  const temperature = objects.map(object => object?.is_placeholder ? '' :
    (object?.temperature_min_c == null ? '–' : `${fmt(object.temperature_min_c)} bis ${fmt(object.temperature_max_c)} °C`));
  const lifeforms = objects.map(object => object?.is_placeholder ? '' : (inferredLifeformName(object, techRows) || '–'));
  const facilities = objects.map(object => object?.is_placeholder ? null : categoryTotalForObject(techRows, object.planet_id, 'facilities'));
  const ships = objects.map(object => object?.is_placeholder ? null : categoryTotalForObject(techRows, object.planet_id, 'ships'));
  const defenses = objects.map(object => object?.is_placeholder ? null : categoryTotalForObject(techRows, object.planet_id, 'defenses'));

  let rows = row('Felder belegt', fieldsUsed);
  rows += row('Felder gesamt', fieldsTotal);
  rows += row('Temperatur', temperature, value => esc(value));
  if (state.objectMode !== 'moon') {
    rows += row('Lebensform', lifeforms, value => esc(value));
  }
  rows += row('Anlagen gesamt', facilities);
  rows += row('Schiffe stationiert', ships);
  rows += row('Verteidigung gesamt', defenses);
  return rows;
}

function rowsForActiveTab(options) {
  const {
    slots, activeObjects, planetObjects, prods, previousProds,
    techRows, previousTechRows, travelling, hasPrevious
  } = options;

  switch (state.activeTab) {
    case 'overview':
      return overviewValueRows(slots, techRows);
    case 'production':
      return productionRows(planetObjects, prods, previousProds, hasPrevious);
    case 'buildings':
      return technologyRows('buildings', activeObjects, techRows, travelling, normalTech, 'buildings', previousTechRows, hasPrevious);
    case 'facilities':
      return technologyRows('facilities', activeObjects, techRows, travelling, normalTech, 'facilities', previousTechRows, hasPrevious);
    case 'ships':
      return technologyRows('ships', activeObjects, techRows, travelling, normalTech, 'ships', previousTechRows, hasPrevious);
    case 'defenses':
      return technologyRows('defenses', activeObjects, techRows, travelling, normalTech, 'defenses', previousTechRows, hasPrevious);
    case 'lifeform': {
      let rows = '';
      const activeRace = currentLifeformRace(activeObjects, techRows);
      for (const race of LIFEFORM_RACES) {
        const buildings = technologyRows(
          'lifeform_buildings',
          activeObjects,
          techRows,
          travelling,
          lifeformPart(race.prefix, 'buildings'),
          `lfb_${race.prefix}`,
          previousTechRows,
          hasPrevious
        );
        if (!buildings) continue;
        const expanded = race.name === activeRace;
        rows += `<tr class="lf-race-row ${expanded ? 'expanded' : 'collapsed'}" data-lf-race="${race.prefix}">
          <td colspan="999"><button type="button" class="lf-race-toggle" data-lf-toggle="${race.prefix}" data-lf-group="lfb_${race.prefix}">
            <span>${expanded ? '▾' : '▸'}</span>${esc(race.name)} · Gebäude
          </button></td>
        </tr>`;
        rows += expanded
          ? buildings
          : buildings.replaceAll('<tr class="data-row"', '<tr class="data-row lf-hidden-row"');
      }
      return rows;
    }
    case 'research': {
      let rows = technologyRows('research', activeObjects, techRows, travelling, normalTech, 'research', previousTechRows, hasPrevious);
      const activeRace = currentLifeformRace(activeObjects, techRows);
      for (const race of LIFEFORM_RACES) {
        const lfResearch = technologyRows('lifeform_research', activeObjects, techRows, travelling, lifeformPart(race.prefix, 'research'), `lf_${race.prefix}`, previousTechRows, hasPrevious);
        if (!lfResearch) continue;
        const expanded = race.name === activeRace;
        rows += `<tr class="lf-race-row ${expanded ? 'expanded' : 'collapsed'}" data-lf-race="${race.prefix}">
          <td colspan="999"><button type="button" class="lf-race-toggle" data-lf-toggle="${race.prefix}" data-lf-group="lf_${race.prefix}"><span>${expanded ? '▾' : '▸'}</span>${esc(race.name)}</button></td>
        </tr>`;
        rows += expanded ? lfResearch : lfResearch.replaceAll('<tr class="data-row"', '<tr class="data-row lf-hidden-row"');
      }
      return rows;
    }
    default:
      return overviewValueRows(slots, techRows);
  }
}

function section(title, key, rows, subtitle = '') { if (!rows) return ''; return `<tr class="section-row" data-section="${key}"><td colspan="999"><button class="section-button" data-toggle="${key}"><span>${esc(title)}</span>${subtitle ? `<small>${esc(subtitle)}</small>` : ''}</button></td></tr>${rows}` }
function deltaHtml(value, previous, formatter = fmt) { if (previous === null || previous === undefined) return ''; const d = (Number(value) || 0) - (Number(previous) || 0); const cls = d > 0 ? 'delta-positive' : d < 0 ? 'delta-negative' : 'delta-zero'; const sign = d > 0 ? '+' : ''; return `<span class="delta ${cls}">(${sign}${formatter(d)})</span>` }
function periodLabel() { return state.productionHours === 1 ? '1h' : state.productionHours === 24 ? '24h' : '1w' }
function productionRows(planets, prods, previousProds, hasPrevious) { const factor = state.productionHours; const label = periodLabel(); const defs = [['Metall', 'metal_per_hour', 'metal'], ['Kristall', 'crystal_per_hour', 'crystal'], ['Deuterium', 'deuterium_per_hour', 'deut']]; let rows = defs.map(([name, key, cls]) => { const vals = planets.map(p => (Number(prods.get(p.planet_id)?.[key]) || 0) * factor); const total = vals.reduce((a, b) => a + b, 0), avg = vals.length ? total / vals.length : 0; const prevTotal = planets.reduce((n, p) => n + ((Number(previousProds.get(p.planet_id)?.[key]) || 0) * factor), 0); return `<tr class="data-row production-row ${cls}" data-group="production"><td class="label-col">${name} / ${label}</td>${vals.map(v => `<td>${prodFmt(v)}</td>`).join('')}<td class="summary-col">${prodFmt(avg)}</td><td class="travelling-col bonus-col">–</td><td class="summary-col"><span class="value-with-delta">${prodFmt(total)} ${deltaHtml(total, hasPrevious ? prevTotal : null, prodFmt)}</span></td></tr>` }).join(''); const sums = planets.map(p => { const r = prods.get(p.planet_id) || {}; return ((Number(r.metal_per_hour) || 0) + (Number(r.crystal_per_hour) || 0) + (Number(r.deuterium_per_hour) || 0)) * factor }); const total = sums.reduce((a, b) => a + b, 0), avg = sums.length ? total / sums.length : 0; const prevTotal = planets.reduce((n, p) => { const r = previousProds.get(p.planet_id) || {}; return n + ((Number(r.metal_per_hour) || 0) + (Number(r.crystal_per_hour) || 0) + (Number(r.deuterium_per_hour) || 0)) * factor }, 0); rows += `<tr class="data-row production-row production-sum-row" data-group="production"><td class="label-col">∑ Produktion / ${label}</td>${sums.map(v => `<td>${prodFmt(v)}</td>`).join('')}<td class="summary-col">${prodFmt(avg)}</td><td class="travelling-col bonus-col">–</td><td class="summary-col"><span class="value-with-delta">${prodFmt(total)} ${deltaHtml(total, hasPrevious ? prevTotal : null, prodFmt)}</span></td></tr>`; const energyVals = planets.map(p => Number(prods.get(p.planet_id)?.energy_available || 0)); const energyTotal = energyVals.reduce((a, b) => a + b, 0), energyAvg = energyVals.length ? energyTotal / energyVals.length : 0; rows += `<tr class="data-row production-row energy" data-group="production"><td class="label-col">Energie</td>${energyVals.map(v => `<td>${prodFmt(v)}</td>`).join('')}<td class="summary-col">${prodFmt(energyAvg)}</td><td class="travelling-col bonus-col">–</td><td class="summary-col">${prodFmt(energyTotal)}</td></tr>`; return rows }
function technologyDefs(category, techRows, predicate = () => true) { const defs = []; const seen = new Set(); for (const t of techRows.filter(t => t.category === category && predicate(t))) { const k = String(t.technology_id); if (!seen.has(k)) { seen.add(k); defs.push({ id: k, name: technologyName(t) }) } } return defs.sort((a, b) => (Number(a.id) || 999999) - (Number(b.id) || 999999)) }
function technologyRows(category, planets, techRows, travelling, predicate = () => true, groupKey = category, previousTechRows = [], hasPrevious = false) {
  const rows = techRows.filter(t => t.category === category && predicate(t)); const defs = technologyDefs(category, techRows, predicate); if (!defs.length) return '';
  const byPlanet = new Map(planets.map(p => [p.planet_id, new Map()])); const previousByPlanet = new Map(planets.map(p => [p.planet_id, new Map()])); const accountValues = new Map(); const previousAccountValues = new Map(); const previousTotals = new Map();
  for (const t of previousTechRows.filter(t => t.category === category && predicate(t))) { const id = String(t.technology_id), value = Number(t.value) || 0; previousTotals.set(id, (previousTotals.get(id) || 0) + value); if (t.planet_id == null) { const old = previousAccountValues.get(id); if (old === undefined || value > old) previousAccountValues.set(id, value) } else previousByPlanet.get(t.planet_id)?.set(id, value) }
  for (const t of rows) { if (t.planet_id == null) { const old = accountValues.get(String(t.technology_id)); if (!old || Number(t.value) > Number(old.value)) accountValues.set(String(t.technology_id), t) } else byPlanet.get(t.planet_id)?.set(String(t.technology_id), t) }
  return defs.map(d => { const accountValue = Number(accountValues.get(d.id)?.value || 0); const previousAccountValue = Number(previousAccountValues.get(d.id) || 0); const vals = planets.map(p => { const own = byPlanet.get(p.planet_id)?.get(d.id); return own ? Number(own.value || 0) : (category === 'research' && accountValue ? accountValue : 0) }); const previousVals = planets.map(p => { const own = previousByPlanet.get(p.planet_id)?.get(d.id); return own !== undefined ? Number(own || 0) : (category === 'research' && previousAccountValue ? previousAccountValue : 0) }); const max = Math.max(...vals, accountValue, 0), sum = vals.reduce((a, b) => a + b, 0), avg = vals.length ? sum / vals.length : 0; const moving = category === 'ships' ? shipValue(travelling, d.name, d.id) : 0; const total = category === 'research' ? (accountValue || max) : sum + moving; const prev = category === 'research' ? previousAccountValue : (previousTotals.get(d.id) || 0); const showCellDelta = category !== 'ships'; return `<tr class="data-row" data-group="${groupKey}"><td class="label-col"><span class="tech-label">${esc(d.name)}</span></td>${vals.map((v, i) => `<td class="${planets[i]?.is_placeholder ? 'missing-moon-cell ' : ''}${v === 0 ? 'zero ' : ''}${v === max && max > 0 ? 'high' : ''}"><span class="value-with-delta">${fmt(v)} ${showCellDelta ? deltaHtml(v, hasPrevious ? previousVals[i] : null, fmt) : ''}</span>${category === 'lifeform_buildings' && v > 0 ? `<small class="cell-local-bonus">${lifeformBuildingBonusText(d.id, v)}</small>` : ''}</td>`).join('')}<td class="summary-col">${category === 'ships' || category === 'defenses' ? fmt(avg) : avg.toLocaleString('de-DE', { maximumFractionDigits: 1 })}</td><td class="travelling-col bonus-col">${category === 'lifeform_research'
      ? lifeformBonusText(d.id, sum)
      : (category === 'lifeform_buildings'
          ? 'lokal je Planet'
          : (category === 'research' ? normalResearchBonusText(d.id, total) : '–'))}</td><td class="summary-col"><span class="value-with-delta">${fmt(total)} ${category === 'ships' ? '' : deltaHtml(total, hasPrevious ? prev : null, fmt)}</span></td></tr>` }).join('')
}
function normalTech(t) { return Number(t.technology_id) < 10000 }
const LIFEFORM_RACES = [
  { name: 'Menschen', prefix: 11 },
  { name: "Rock’tal", prefix: 12 },
  { name: 'Mechas', prefix: 13 },
  { name: 'Kaelesh', prefix: 14 }
];
const LIFEFORM_BY_PREFIX = new Map(LIFEFORM_RACES.map(race => [race.prefix, race.name]));

// Verifizierte bzw. bereits im Projekt verwendete Basisboni pro Stufe.
// Nicht hinterlegte Technologien zeigen weiterhin ihre Gesamtstufe an,
// damit keine erfundenen Prozentwerte ausgegeben werden.
const LIFEFORM_RESEARCH_BONUS = {
  '11201': { text: level => `Stufe ${fmt(level)} · schnellere Lebensform-Entdeckung` },
  '11202': { perLevel: 0.06, resources: ['metal','crystal','deut'], label: 'Metall/Kristall/Deuterium' },
  '11203': { text: level => `Stufe ${fmt(level)} · schnellere Zivilschiffe` },
  '11204': { text: level => `Stufe ${fmt(level)} · Spionage-/Tarnbonus` },

  '12201': { perLevel: 0.25, resources: ['energy'], label: 'Energie' },
  '12202': { perLevel: 0.04, resources: ['crystal'], label: 'Kristall' },
  '12203': { perLevel: 0.08, resources: ['deut'], label: 'Deuterium' },
  '12204': { perLevel: 0.4, label: 'Laderaum ziviler Schiffe' },
  '12205': { perLevel: 0.08, resources: ['metal','crystal','deut'], label: 'Metall/Kristall/Deuterium' },
  '12206': { perLevel: 0.25, resources: ['energy'], label: 'Energie' },
  '12207': { perLevel: 0.08, resources: ['metal'], label: 'Metall' },
  '12210': { perLevel: 0.08, resources: ['metal'], label: 'Metall' },
  '12211': { perLevel: 0.08, resources: ['crystal'], label: 'Kristall' },
  '12212': { perLevel: 0.08, resources: ['deut'], label: 'Deuterium' },

  '13201': { perLevel: 0.08, resources: ['deut'], label: 'Deuterium' },
  '13206': { perLevel: 0.06, resources: ['metal','crystal','deut'], label: 'Metall/Kristall/Deuterium' },

  '14202': { perLevel: 0.08, resources: ['deut'], label: 'Deuterium' },
  '14212': { perLevel: 0.06, resources: ['metal','crystal','deut'], label: 'Metall/Kristall/Deuterium' }
};


const LIFEFORM_BUILDING_BONUS = {
  // Menschen
  '11106': { local: true, effects: { metal: 1.5 }, label: 'Metall' },
  '11108': { local: true, effects: { crystal: 1, deut: 1 }, label: 'Kristall/Deuterium' },

  // Rock’tal
  '12106': { local: true, effects: { metal: 2 }, label: 'Metall' },
  '12107': { local: true, effects: { energy: 1 }, label: 'Energie' },
  '12109': { local: true, effects: { crystal: 2 }, label: 'Kristall' },
  '12110': { local: true, effects: { deut: 2 }, label: 'Deuterium' },

  // Mechas
  '13107': { local: true, effects: { energy: 1 }, label: 'Energie' },
  '13110': { local: true, effects: { deut: 1.5 }, label: 'Deuterium' },

  // Kaelesh
  '14106': { local: true, effects: { energy: 1 }, label: 'Energie' }
};

function effectText(effects) {
  const parts = [];
  if (effects.metal) parts.push(`+${percentFmt(effects.metal)}% Metall`);
  if (effects.crystal) parts.push(`+${percentFmt(effects.crystal)}% Kristall`);
  if (effects.deut) parts.push(`+${percentFmt(effects.deut)}% Deuterium`);
  if (effects.energy) parts.push(`+${percentFmt(effects.energy)}% Energie`);
  return parts.join(' · ') || '–';
}

function lifeformBuildingEffects(technologyId, level) {
  const def = LIFEFORM_BUILDING_BONUS[String(technologyId)];
  if (!def || !(level > 0)) return null;
  const effects = {};
  for (const [key, perLevel] of Object.entries(def.effects || {})) {
    effects[key] = Number(level) * Number(perLevel);
  }
  return effects;
}

function lifeformBuildingBonusText(technologyId, level) {
  const effects = lifeformBuildingEffects(technologyId, level);
  return effects ? effectText(effects) : '–';
}

function localLifeformBuildingSummary(objectId, techRows) {
  const totals = { metal: 0, crystal: 0, deut: 0, energy: 0 };
  for (const row of techRows) {
    if (row.planet_id !== objectId || row.category !== 'lifeform_buildings') continue;
    const effects = lifeformBuildingEffects(row.technology_id, Number(row.value) || 0);
    if (!effects) continue;
    for (const key of Object.keys(totals)) totals[key] += Number(effects[key] || 0);
  }
  return totals;
}

function empireLifeformResearchSummary(techRows) {
  const totals = { metal: 0, crystal: 0, deut: 0, energy: 0 };
  for (const row of techRows) {
    if (row.category !== 'lifeform_research') continue;
    const def = LIFEFORM_RESEARCH_BONUS[String(row.technology_id)];
    if (!def?.perLevel || !Array.isArray(def.resources)) continue;
    const bonus = (Number(row.value) || 0) * def.perLevel;
    for (const resource of def.resources) {
      if (resource in totals) totals[resource] += bonus;
    }
  }
  return totals;
}

function lifeformResearchSummaryHtml(techRows) {
  const totals = empireLifeformResearchSummary(techRows);
  return `
    <div class="lf-global-bonus" title="Nur Bonus aus Lebensform-Forschungen">
      <span>LF-Forschung gesamt</span>
      <strong>+${percentFmt(totals.metal)}% Metall</strong>
      <strong>+${percentFmt(totals.crystal)}% Kristall</strong>
      <strong>+${percentFmt(totals.deut)}% Deuterium</strong>
      <strong>+${percentFmt(totals.energy)}% Energie</strong>
    </div>
  `;
}

function inferredLifeformName(object, techRows) {
  if (!object || object.is_placeholder) return '';

  const rowsForObject = techRows.filter(row => row.planet_id === object.planet_id && Number(row.value) > 0);
  const buildingPrefixes = rowsForObject
    .filter(row => row.category === 'lifeform_buildings')
    .map(row => Math.floor(Number(row.technology_id) / 1000))
    .filter(prefix => LIFEFORM_BY_PREFIX.has(prefix));

  const chooseDominant = prefixes => {
    if (!prefixes.length) return '';
    const counts = new Map();
    for (const prefix of prefixes) counts.set(prefix, (counts.get(prefix) || 0) + 1);
    const [prefix] = [...counts.entries()].sort((a,b) => b[1]-a[1])[0];
    return LIFEFORM_BY_PREFIX.get(prefix) || '';
  };

  const fromBuildings = chooseDominant(buildingPrefixes);
  if (fromBuildings) return fromBuildings;

  // Ältere Snapshots enthalten teilweise keine LF-Gebäude. Dann ist der
  // dominante Forschungs-Prefix der beste verfügbare Hinweis.
  const researchPrefixes = rowsForObject
    .filter(row => row.category === 'lifeform_research')
    .map(row => Math.floor(Number(row.technology_id) / 1000))
    .filter(prefix => LIFEFORM_BY_PREFIX.has(prefix));
  const fromResearch = chooseDominant(researchPrefixes);
  if (fromResearch) return fromResearch;

  return object.lifeform_name || '';
}

function currentLifeformRace(objects, techRows) {
  const counts = new Map();
  for (const object of objects) {
    const name = inferredLifeformName(object, techRows);
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || null;
}

const NORMAL_RESEARCH_BONUS = {
  '108': level => `+${fmt(level)} Flottenslots`,
  '109': level => `+${fmt(level * 10)}% Waffenstärke`,
  '110': level => `+${fmt(level * 10)}% Schildstärke`,
  '111': level => `+${fmt(level * 10)}% Panzerung`,
  '114': level => `+${fmt(level * 5)}% Laderaum`,
  '115': level => `+${fmt(level * 10)}% Verbrennungstriebwerk`,
  '117': level => `+${fmt(level * 20)}% Impulstriebwerk`,
  '118': level => `+${fmt(level * 30)}% Hyperraumantrieb`,
  '121': level => `−${fmt(level * 4)}% Abbruchkosten`,
  '122': level => `+${fmt(level)}% Metall · +${(level * 0.66).toLocaleString('de-DE',{maximumFractionDigits:2})}% Kristall · +${(level * 0.33).toLocaleString('de-DE',{maximumFractionDigits:2})}% Deuterium`,
  '123': level => `${fmt(level + 1)} Forschungslabore vernetzbar`
};

function normalResearchBonusText(technologyId, level) {
  const fn = NORMAL_RESEARCH_BONUS[String(technologyId)];
  return fn && level > 0 ? fn(level) : '–';
}

function lifeformBonusText(technologyId, totalLevel) {
  if (!(totalLevel > 0)) return '–';
  const def = LIFEFORM_RESEARCH_BONUS[String(technologyId)];
  if (!def) return `Stufe ${fmt(totalLevel)} · Bonusformel noch nicht hinterlegt`;
  if (typeof def.text === 'function') return def.text(totalLevel);
  const bonus = totalLevel * def.perLevel;
  return `+${percentFmt(bonus)}% ${def.label}`;
}

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

    const currentObjects = ownRows(state.planets, s).sort((x, y) => (x.planet_order ?? 999) - (y.planet_order ?? 999));
    const previousObjects = ownRows(state.planets, prev).sort((x, y) => (x.planet_order ?? 999) - (y.planet_order ?? 999));
    const objectSlots = buildObjectSlots(currentObjects);
    const planets = objectSlots.map(slot => slot.active).filter(Boolean);
    const planetObjects = objectSlots.map(slot => slot.planet).filter(Boolean);
    const previousSelectedObjects = objectSlots.map(slot => previousObjectForSlot(slot, previousObjects)).filter(Boolean);
    const previousPlanetObjects = objectSlots
      .map(slot => {
        const matching = previousObjects.filter(object => objectSlotKey(object) === slot.key);
        return matching.find(object => normalizedObjectType(object.object_type) === 'planet') || null;
      })
      .filter(Boolean);

    setColumnWidth(objectSlots.length);

    const prodRows = ownRows(state.production, s), techRows = ownRows(state.technologies, s), flights = ownRows(state.flights, s);
    const previousProdRows = ownRows(state.production, prev), previousTechRows = ownRows(state.technologies, prev);
    const prods = new Map(prodRows.map(x => [x.planet_id, x]));
    const previousProds = new Map(previousProdRows.map(x => [x.planet_id, x]));
    const travelling = sumShipsMap(flights);
    const stationary = techRows.filter(t => t.category === 'ships').reduce((n, t) => n + (Number(t.value) || 0), 0);
    const moving = movingShipTotal(flights);
    const totals = { metal: 0, crystal: 0, deut: 0 };
    for (const p of planetObjects) {
      const r = prods.get(p.planet_id) || {};
      totals.metal += Number(r.metal_per_hour) || 0;
      totals.crystal += Number(r.crystal_per_hour) || 0;
      totals.deut += Number(r.deuterium_per_hour) || 0;
    }
    const factor = state.productionHours, label = periodLabel(), productionTotal = (totals.metal + totals.crystal + totals.deut) * factor;
    $('#playerName').textContent = a.player_name;
    $('#universe').textContent = a.universe;
    $('#latestSnapshot').textContent = dateFmt(s.created_at);
    const planetCount = currentObjects.filter(object => normalizedObjectType(object.object_type) === 'planet').length;
    const moonCount = currentObjects.filter(object => normalizedObjectType(object.object_type) === 'moon').length;
    $('#planetCount').textContent = `${fmt(planetCount)} / ${fmt(moonCount)}`;
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

    const stageTitle = $('#stageTitle');
    const stageHint = $('#stageHint');

    if (state.objectMode === 'moon') {
      stageTitle.textContent = 'MONDE IM VORDERGRUND';
      stageHint.textContent = 'Klicke auf den Planeten, um die Planeten anzuzeigen';
      const lfGlobalBonus = $('#lfGlobalBonus');
      if (lfGlobalBonus) lfGlobalBonus.innerHTML = '';
    } else {
      stageTitle.textContent = 'PLANETEN IM VORDERGRUND';
      stageHint.textContent = 'Klicke auf den Mond, um die Monde anzuzeigen';
      const lfGlobalBonus = $('#lfGlobalBonus');
      if (lfGlobalBonus) lfGlobalBonus.innerHTML = lifeformResearchSummaryHtml(techRows);
    }

    document.documentElement.style.setProperty('--card-count', String(objectSlots.length + 1));
    renderCelestialCards(objectSlots, prods, techRows);
    updateTabs();

    const body = rowsForActiveTab({
      slots: objectSlots,
      activeObjects: planets,
      planetObjects,
      prods,
      previousProds,
      techRows,
      previousTechRows,
      travelling,
      hasPrevious: Boolean(prev)
    });
    $('#empireBody').innerHTML = body || `<tr><td colspan="999" class="empty-detail">Für diesen Bereich sind keine Daten vorhanden.</td></tr>`;

    document.querySelectorAll('[data-lf-toggle]').forEach(button => {
      button.onclick = () => {
        const prefix = button.dataset.lfToggle;
        const group = button.dataset.lfGroup || `lf_${prefix}`;
        const raceRow = button.closest('.lf-race-row');
        const isExpanded = raceRow.classList.toggle('expanded');
        raceRow.classList.toggle('collapsed', !isExpanded);
        button.querySelector('span').textContent = isExpanded ? '▾' : '▸';
        document.querySelectorAll(`[data-group="${group}"]`).forEach(row => row.classList.toggle('lf-hidden-row', !isExpanded));
        scheduleHeightMeasurements();
      };
    });


    if (message) message.classList.add('hidden');
    scheduleHeightMeasurements();
  } catch (error) {
    if (token !== state.renderToken) return;
    if (message) {
      message.textContent = `Tagesstand konnte nicht geladen werden: ${error.message}`;
      message.classList.remove('hidden');
    }
  }
}
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(scheduleHeightMeasurements);
  observer.observe(document.body);
  observer.observe(document.querySelector('main'));
}
if ('MutationObserver' in window) {
  new MutationObserver(scheduleHeightMeasurements).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === 'ogame-dashboard-request-height') {
    scheduleHeightMeasurements();
  }
});
window.addEventListener('load', scheduleHeightMeasurements);
window.addEventListener('resize', scheduleHeightMeasurements);
async function init() {
  try {
    const loaded = await window.ogameAccountDashboardDataSource.load();
    const { summary, snapshots } = loaded;
    Object.assign(state, { summary, snapshots, planets: [], production: [], technologies: [], flights: [] });
    const sel = $('#accountSelect');
    sel.innerHTML = summary.accounts.map(a => `<option value="${esc(accountKey(a))}">${esc(a.player_name)}</option>`).join('');
    state.selectedAccount = sel.value;
    sel.onchange = async () => {
      state.selectedAccount = sel.value;
      state.selectedSnapshot = null;
      state.objectMode = 'planet';
      state.activeTab = 'overview';
      await render();
    };
    $('#snapshotSelect').onchange = async e => {
      state.selectedSnapshot = e.target.value;
      state.objectMode = 'planet';
      state.activeTab = 'overview';
      await render();
    };
    document.querySelectorAll('#dashboardTabs [data-tab]').forEach(button => {
      button.onclick = async () => {
        state.activeTab = button.dataset.tab || 'overview';
        await render();
        scheduleHeightMeasurements();
      };
    });

    document.querySelectorAll('[data-period]').forEach(button => button.onclick = async () => {
      state.productionHours = Number(button.dataset.period) || 24;
      document.querySelectorAll('[data-period]').forEach(item => item.classList.toggle('active', item === button));
      await render();
    });
    $('#reloadButton').onclick = () => location.reload();
    window.addEventListener('resize', () => setColumnWidth(buildObjectSlots(ownRows(state.planets, selectedSnapshot(account()))).length));
    await render();
  } catch (e) {
    $('#message').textContent = `Imperiumsübersicht konnte nicht geladen werden: ${e.message}`;
    $('#message').classList.remove('hidden');
  }
}
init();
