const state={summary:null,snapshots:[],planets:[],production:[],technologies:[],flights:[],selectedAccount:null,selectedSnapshot:null};
const $=s=>document.querySelector(s);const nf=new Intl.NumberFormat('de-DE');
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=v=>Number.isFinite(Number(v))?nf.format(Math.trunc(Number(v))):'–';
const prodFmt=v=>{v=Number(v)||0;if(Math.abs(v)<1000)return fmt(v);if(Math.abs(v)<1e6)return `${Math.floor(v/100)/10} K`;return `${Math.floor(v/1e6)} M`};
const dateFmt=v=>v?new Date(v).toLocaleString('de-DE'):'–';
const TECH_NAMES = {
    "1":"Metallmine",
    "2":"Kristallmine",
    "3":"Deuteriumsynthetisierer",
    "4":"Solarkraftwerk",
    "12":"Fusionskraftwerk",
    "14":"Roboterfabrik",
    "15":"Nanitenfabrik",
    "21":"Raumschiffwerft",
    "22":"Metallspeicher",
    "23":"Kristallspeicher",
    "24":"Deuteriumtank",
    "31":"Forschungslabor",
    "33":"Terraformer",
    "34":"Allianzdepot",
    "36":"Raumdock",
    "44":"Raketensilo",
    "106":"Spionagetechnik",
    "108":"Computertechnik",
    "109":"Waffentechnik",
    "110":"Schildtechnik",
    "111":"Raumschiffpanzerung",
    "113":"Energietechnik",
    "114":"Hyperraumtechnik",
    "115":"Verbrennungstriebwerk",
    "117":"Impulstriebwerk",
    "118":"Hyperraumantrieb",
    "120":"Lasertechnik",
    "121":"Ionentechnik",
    "122":"Plasmatechnik",
    "123":"Intergalaktisches Forschungsnetzwerk",
    "124":"Astrophysik",
    "199":"Gravitonforschung",
    "202":"Kleiner Transporter",
    "203":"Großer Transporter",
    "204":"Leichter Jäger",
    "205":"Schwerer Jäger",
    "206":"Kreuzer",
    "207":"Schlachtschiff",
    "208":"Kolonieschiff",
    "209":"Recycler",
    "210":"Spionagesonde",
    "211":"Bomber",
    "212":"Solarsatellit",
    "213":"Zerstörer",
    "214":"Todesstern",
    "215":"Schlachtkreuzer",
    "217":"Crawler",
    "218":"Reaper",
    "219":"Pathfinder",
    "220":"Solarsatellit (LF)",
    "401":"Raketenwerfer",
    "402":"Leichtes Lasergeschütz",
    "403":"Schweres Lasergeschütz",
    "404":"Gaußkanone",
    "405":"Ionengeschütz",
    "406":"Plasmawerfer",
    "407":"Kleine Schildkuppel",
    "408":"Große Schildkuppel",
    "502":"Abfangrakete",
    "503":"Interplanetarrakete",
    "11101":"Wohnsektor",
    "11102":"Biosphären-Farm",
    "11103":"Forschungszentrum",
    "11104":"Akademie der Wissenschaften",
    "11105":"Neuro-Kalibrierungszentrum",
    "11106":"Hochenergie-Schmelze",
    "11107":"Nahrungsspeicher",
    "11108":"Fusionsbetriebene Förderung",
    "11109":"Skyscraper\n",
    "11110":"Biotech-Labor",
    "11111":"Metropolis",
    "11112":"Planetar-Schild",
    "11201":"Intergalaktische Botschafter",
    "11202":"Hochleistungs-Extraktoren",
    "11203":"Fusionstriebwerke",
    "11204":"Tarnfeld-Generator",
    "11205":"Orbital-Versteck",
    "11206":"Forschungs-KI",
    "11207":"Hochleistungs-Terraformer",
    "11208":"Verbesserte Förderungstechnologien",
    "11209":"Leichter Jäger Mk II",
    "11210":"Kreuzer Mk II",
    "11211":"Verbesserte Labortechnik",
    "11212":"Plasma-Terraformer",
    "11213":"Niedrigtemperatur-Triebwerke",
    "11214":"Bomber Mk II",
    "11215":"Zerstörer Mk II",
    "11216":"Schlachtkreuzer Mk II",
    "11217":"Roboter-Assistenten",
    "11218":"Supercomputer",
    "12101":"Meditationsenklave",
    "12102":"Kristallzucht",
    "12103":"Runentechnologikum",
    "12104":"Runenschmiede",
    "12105":"Oriktorium",
    "12106":"Magma-Schmelze",
    "12107":"Disruptionskammer",
    "12108":"Felsenmonument",
    "12109":"Kristall-Raffinerie",
    "12110":"Deuterium-Syntonisierer",
    "12111":"Mineral-Forschungszentrum",
    "12112":"Hochleistungs-Verwertungsanlage",
    "12201":"Vulkanische Batterien",
    "12202":"Akustische Sondierung",
    "12203":"Hochenergie-Pumpsysteme",
    "12204":"Laderaum-Erweiterung (Zivile Schiffe)",
    "12205":"Magmabetriebene Förderung",
    "12206":"Geothermie-Kraftwerke",
    "12207":"Tiefensondierung",
    "12208":"Ionenkristall-Verstärkung (Schwerer Jäger)",
    "12209":"Verbesserter Stellarator",
    "12210":"Gehärtete Diamant-Bohrköpfe",
    "12211":"Seismische Abbautechnologien",
    "12212":"Magmabetriebenes Pumpsystem",
    "12213":"Ionenkristall-Module",
    "12214":"Optimierte Silo-Bauweise",
    "12215":"Diamant-Energietransmitter",
    "12216":"Obsidian-Schildverstärkung",
    "12217":"Runenschilde",
    "12218":"Rock`tal-Kollektorverstärkung",
    "13101":"Fertigungsstraße",
    "13102":"Fusionszellen-Fabrik",
    "13103":"Robotik-Forschungszentrum",
    "13104":"Update-Netzwerk",
    "13105":"Quanten-Computerzentrum",
    "13106":"Automatisiertes Montagezentrum",
    "13107":"Hochleistungs-Transformator",
    "13108":"Mikrochip-Fertigungsstraße",
    "13109":"Fließband-Montagehalle",
    "13110":"Hochleistungs-Synthetisierer",
    "13111":"Chip-Massenproduktion",
    "13112":"Nano-Reparaturbots",
    "13201":"Katalysator-Technik",
    "13202":"Plasma-Antrieb",
    "13203":"Effizienz-Modul",
    "13204":"Depot-KI",
    "13205":"Generalüberholung (Leichter Jäger)",
    "13206":"Automatisierte Förderstraßen\n",
    "13207":"Verbesserte Drohnen-KI",
    "13208":"Experimentelle Wiederaufbereitungstechnik\n",
    "13209":"Generalüberholung (Kreuzer)",
    "13210":"Slingshot-Autopilot",
    "13211":"Hochtemperatur-Supraleiter",
    "13212":"Generalüberholung (Schlachtschiff)",
    "13213":"Künstliche Schwarmintelligenz",
    "13214":"Generalüberholung (Schlachtkreuzer)",
    "13215":"Generalüberholung (Bomber)",
    "13216":"Generalüberholung (Zerstörer)",
    "13217":"Experimentelle Waffentechnik",
    "13218":"Mecha-Generalverstärkung",
    "14101":"Refugium\n",
    "14102":"Antimaterie-Kondensator\n",
    "14103":"Vortexkammer",
    "14104":"Hallen der Erkenntnis\n",
    "14105":"Forum der Transzendenz\n",
    "14106":"Antimaterie-Konvektor\n",
    "14107":"Klonlabor\n",
    "14108":"Chrysalis-Akzelerator\n",
    "14109":"Bio-Modifikator\n",
    "14110":"Psionischer Modulator\n",
    "14111":"Schiffs-Fabrikationshalle\n",
    "14112":"Supra-Refraktor\n",
    "14201":"Wärme-Rückgewinnung\n",
    "14202":"Sulfid-Prozesstechnik\n",
    "14203":"Psionisches Netzwerk\n",
    "14204":"Telekinese-Traktorstrahl\n",
    "14205":"Verbesserte Sensortechnik\n",
    "14206":"Neuromodaler Komprimator\n",
    "14207":"Neuro-Interface\n",
    "14208":"Superglobales Analysenetzwerk\n",
    "14209":"Übertaktung (Schwerer Jäger)\n",
    "14210":"Telekinetisches Schubsystem\n",
    "14211":"Sechster Sinn\n",
    "14212":"Psycho-Harmonisierer\n",
    "14213":"Effiziente Schwarmintelligenz\n",
    "14214":"Übertaktung (Großer Transporter)\n",
    "14215":"Gravitationssensoren\n",
    "14216":"Übertaktung (Schlachtschiff)\n",
    "14217":"Psionische Schutzmatrix\n",
    "14218":"Kaelesh-Entdeckerverstärkung"
};
function techName(t){const id=String(t?.technology_id??t?.id??"");const raw=String(t?.name??t?.technology_name??"").trim();const generic=!raw||new RegExp(`^(?:Technologie|Technology)\\s*${id}$`,"i").test(raw)||/^(?:Technologie|Technology)\s+\d+$/i.test(raw);return generic?(TECH_NAMES[id]||raw||`Technologie ${id}`):raw}
async function json(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return r.json()}
function accountKey(a){return `${a.player_id}|${a.universe}`}
function account(){return state.summary.accounts.find(a=>accountKey(a)===state.selectedAccount)}
function localDay(v){const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dailySnapshots(a){const all=state.snapshots.filter(s=>s.player_id===a.player_id&&s.universe===a.universe).sort((x,y)=>x.created_at.localeCompare(y.created_at));const byDay=new Map();for(const s of all){const day=localDay(s.created_at);if(!byDay.has(day))byDay.set(day,s)}return [...byDay.values()].sort((x,y)=>y.created_at.localeCompare(x.created_at))}
function selectedSnapshot(a){const daily=dailySnapshots(a);return daily.find(s=>s.snapshot_id===state.selectedSnapshot)||daily[0]}
function previousDailySnapshot(a,s){const daily=dailySnapshots(a);const i=daily.findIndex(x=>x.snapshot_id===s.snapshot_id);return i>=0?daily[i+1]||null:null}
function ownRows(list,s){return s?list.filter(x=>x.snapshot_id===s.snapshot_id):[]}
function sumShipsMap(flights){const out={};for(const f of flights){for(const [key,val] of Object.entries(f.ships||{}))out[key]=(out[key]||0)+(Number(val)||0)}return out}
function movingShipTotal(flights){return flights.reduce((sum,f)=>{const explicit=Number(f.ship_count);if(Number.isFinite(explicit)&&explicit>=0)return sum+explicit;return sum+Object.values(f.ships||{}).reduce((n,v)=>n+(Number(v)||0),0)},0)}
function shipValue(map,name,id){return Number(map[name]??map[id]??map[String(id)]??0)||0}
function setColumnWidth(count){const usable=Math.max(760,window.innerWidth)-430;const width=Math.max(82,Math.min(122,Math.floor(usable/Math.max(count,1))));document.documentElement.style.setProperty('--planet-width',`${width}px`)}
function header(planets){return `<tr><th class="label-col">Imperium</th>${planets.map(p=>`<th class="planet-head">${p.image_url?`<img class="planet-image" src="${esc(p.image_url)}" alt="">`:`<div class="planet-image"></div>`}<div class="planet-name">${esc(p.name)}</div><div class="coords">${esc(p.coordinates)}</div><div class="planet-meta">${fmt(p.fields_used)}/${fmt(p.fields_total)} · ${fmt(p.temperature_min_c)}–${fmt(p.temperature_max_c)} °C</div></th>`).join('')}<th class="summary-col">Ø</th><th class="travelling-col">Unterwegs</th><th class="summary-col">Gesamt</th></tr>`}
function section(title,key,rows,subtitle=''){if(!rows)return '';return `<tr class="section-row" data-section="${key}"><td colspan="999"><button class="section-button" data-toggle="${key}"><span>${esc(title)}</span>${subtitle?`<small>${esc(subtitle)}</small>`:''}</button></td></tr>${rows}`}
function deltaHtml(value,previous,formatter=fmt){const d=(Number(value)||0)-(Number(previous)||0);const cls=d>0?'delta-positive':d<0?'delta-negative':'delta-zero';const sign=d>0?'+':'';return `<span class="delta ${cls}">(${sign}${formatter(d)})</span>`}
function productionRows(planets,prods,previousProds){const defs=[['Metall / h','metal_per_hour','metal'],['Kristall / h','crystal_per_hour','crystal'],['Deuterium / h','deuterium_per_hour','deut'],['Energie','energy_available','energy']];return defs.map(([label,key,cls])=>{const vals=planets.map(p=>Number(prods.get(p.planet_id)?.[key]||0));const total=vals.reduce((a,b)=>a+b,0),avg=vals.length?total/vals.length:0;const prevTotal=planets.reduce((n,p)=>n+(Number(previousProds.get(p.planet_id)?.[key])||0),0);return `<tr class="data-row production-row ${cls}" data-group="production"><td class="label-col">${label}</td>${vals.map(v=>`<td>${prodFmt(v)}</td>`).join('')}<td class="summary-col">${prodFmt(avg)}</td><td class="travelling-col">–</td><td class="summary-col"><span class="value-with-delta">${prodFmt(total)} ${deltaHtml(total,prevTotal,prodFmt)}</span></td></tr>`}).join('')}
function technologyDefs(category,techRows,predicate=()=>true){const defs=[];const seen=new Set();for(const t of techRows.filter(t=>t.category===category&&predicate(t))){const k=String(t.technology_id);if(!seen.has(k)){seen.add(k);defs.push({id:k,name:techName(t)})}}return defs.sort((a,b)=>(Number(a.id)||999999)-(Number(b.id)||999999))}
function technologyRows(category,planets,techRows,travelling,predicate=()=>true,groupKey=category,previousTechRows=[]){const rows=techRows.filter(t=>t.category===category&&predicate(t));const defs=technologyDefs(category,techRows,predicate);if(!defs.length)return '';
 const byPlanet=new Map(planets.map(p=>[p.planet_id,new Map()]));const accountValues=new Map();const previousById=new Map();
 for(const t of previousTechRows.filter(t=>t.category===category&&predicate(t))){const id=String(t.technology_id);previousById.set(id,(previousById.get(id)||0)+(Number(t.value)||0))}
 for(const t of rows){if(t.planet_id==null){const old=accountValues.get(String(t.technology_id));if(!old||Number(t.value)>Number(old.value))accountValues.set(String(t.technology_id),t)}else byPlanet.get(t.planet_id)?.set(String(t.technology_id),t)}
 return defs.map(d=>{const accountValue=Number(accountValues.get(d.id)?.value||0);const vals=planets.map(p=>{const own=byPlanet.get(p.planet_id)?.get(d.id);return own?Number(own.value||0):(category==='research'&&accountValue?accountValue:0)});const max=Math.max(...vals,accountValue,0),sum=vals.reduce((a,b)=>a+b,0),avg=vals.length?sum/vals.length:0;const moving=category==='ships'?shipValue(travelling,d.name,d.id):0;const total=category==='research'?(accountValue||max):sum+moving;const prev=category==='research'?Math.max(...previousTechRows.filter(t=>t.category===category&&String(t.technology_id)===d.id).map(t=>Number(t.value)||0),0):(previousById.get(d.id)||0);return `<tr class="data-row" data-group="${groupKey}"><td class="label-col"><span class="tech-label">${esc(d.name)}</span></td>${vals.map(v=>`<td class="${v===0?'zero ':''}${v===max&&max>0?'high':''}">${fmt(v)}</td>`).join('')}<td class="summary-col">${category==='ships'||category==='defenses'?fmt(avg):avg.toLocaleString('de-DE',{maximumFractionDigits:1})}</td><td class="travelling-col ${moving?'high':'zero'}">${category==='ships'?(moving?fmt(moving):'–'):'–'}</td><td class="summary-col"><span class="value-with-delta">${fmt(total)} ${deltaHtml(total,prev,fmt)}</span></td></tr>`}).join('')}
function normalTech(t){return Number(t.technology_id)<10000}
const LIFEFORM_RACES=[
  {name:'Menschen',prefix:11},
  {name:"Rock’tal",prefix:12},
  {name:'Mechas',prefix:13},
  {name:'Kaelesh',prefix:14}
];
function lifeformPart(prefix,part){return t=>{const id=Number(t.technology_id);if(!Number.isFinite(id)||Math.floor(id/1000)!==prefix)return false;const suffix=id%1000;return part==='buildings'?(suffix>=100&&suffix<200):(suffix>=200&&suffix<300)}}
function subheading(label,key){return `<tr class="subsection-row" data-group="${key}"><td colspan="999">${esc(label)}</td></tr>`}
function lifeformRaceSection(race,planets,techRows,travelling,previousTechRows){const key=`lifeform_${race.prefix}`;const buildings=technologyRows('lifeform_buildings',planets,techRows,travelling,lifeformPart(race.prefix,'buildings'),key,previousTechRows);const research=technologyRows('lifeform_research',planets,techRows,travelling,lifeformPart(race.prefix,'research'),key,previousTechRows);if(!buildings&&!research)return '';let rows='';if(buildings)rows+=subheading('Gebäude',key)+buildings;if(research)rows+=subheading('Forschung',key)+research;return section(race.name,key,rows)}
function lifeformSubtitle(planets){const names=[...new Set(planets.map(p=>p.lifeform_name).filter(Boolean))];return names.length?names.join(' · '):''}
function updateSnapshotSelect(a){const sel=$('#snapshotSelect');const daily=dailySnapshots(a);sel.innerHTML=daily.map(s=>`<option value="${esc(s.snapshot_id)}">${new Date(s.created_at).toLocaleDateString('de-DE')} · ${new Date(s.created_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</option>`).join('');if(!state.selectedSnapshot||!daily.some(s=>s.snapshot_id===state.selectedSnapshot))state.selectedSnapshot=daily[0]?.snapshot_id||null;sel.value=state.selectedSnapshot||''}
function render(){const a=account();if(!a)return;updateSnapshotSelect(a);const s=selectedSnapshot(a),prev=previousDailySnapshot(a,s);if(!s)return;const planets=ownRows(state.planets,s).sort((x,y)=>(x.planet_order??999)-(y.planet_order??999));setColumnWidth(planets.length);const prodRows=ownRows(state.production,s),techRows=ownRows(state.technologies,s),flights=ownRows(state.flights,s),previousProdRows=ownRows(state.production,prev),previousTechRows=ownRows(state.technologies,prev);const prods=new Map(prodRows.map(x=>[x.planet_id,x]));const previousProds=new Map(previousProdRows.map(x=>[x.planet_id,x]));const travelling=sumShipsMap(flights);const stationary=techRows.filter(t=>t.category==='ships').reduce((n,t)=>n+(Number(t.value)||0),0);const moving=movingShipTotal(flights);const totals={metal:0,crystal:0,deut:0};for(const p of planets){const r=prods.get(p.planet_id)||{};totals.metal+=Number(r.metal_per_hour)||0;totals.crystal+=Number(r.crystal_per_hour)||0;totals.deut+=Number(r.deuterium_per_hour)||0}
 $('#playerName').textContent=a.player_name;$('#universe').textContent=a.universe;$('#latestSnapshot').textContent=dateFmt(s.created_at);$('#planetCount').textContent=fmt(planets.length);$('#totalMetal').textContent=prodFmt(totals.metal);$('#totalCrystal').textContent=prodFmt(totals.crystal);$('#totalDeuterium').textContent=prodFmt(totals.deut);$('#stationedShips').textContent=fmt(stationary);$('#travellingShips').textContent=fmt(moving);$('#allShips').textContent=fmt(stationary+moving);$('#travellingHint').textContent=moving===0&&flights.length?'Flotten erkannt, aber Anzahl nicht lesbar':'';$('#empireHead').innerHTML=header(planets);
 const categories=[['Gebäude','buildings'],['Anlagen','facilities'],['Forschung','research'],['Schiffe','ships'],['Verteidigung','defenses']];let body=section('Produktion','production',productionRows(planets,prods,previousProds));for(const [label,key] of categories)body+=section(label,key,technologyRows(key,planets,techRows,travelling,normalTech,key,previousTechRows));for(const race of LIFEFORM_RACES)body+=lifeformRaceSection(race,planets,techRows,travelling,previousTechRows);$('#empireBody').innerHTML=body;
 document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const key=b.dataset.toggle;b.closest('.section-row').classList.toggle('collapsed');document.querySelectorAll(`[data-group="${key}"]`).forEach(r=>r.classList.toggle('hidden-row'))})}
async function init(){try{const [summary,snapshots,planets,production,technologies,flights]=await Promise.all(['summary','snapshots','planets','production','technologies','active_flights'].map(n=>json(`data/${n}.json`)));Object.assign(state,{summary,snapshots,planets,production,technologies,flights});const sel=$('#accountSelect');sel.innerHTML=summary.accounts.map(a=>`<option value="${esc(accountKey(a))}">${esc(a.player_name)} · ${esc(a.universe)}</option>`).join('');state.selectedAccount=sel.value;sel.onchange=()=>{state.selectedAccount=sel.value;state.selectedSnapshot=null;render()};$('#snapshotSelect').onchange=e=>{state.selectedSnapshot=e.target.value;render()};$('#reloadButton').onclick=()=>location.reload();window.addEventListener('resize',()=>setColumnWidth(ownRows(state.planets,selectedSnapshot(account())).length));render()}catch(e){$('#message').textContent=`Dashboard konnte nicht geladen werden: ${e.message}`;$('#message').classList.remove('hidden')}}init();
