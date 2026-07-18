
const TEST_PASSWORD="Test1234!";
const $=s=>document.querySelector(s);
const fmt=n=>n==null?"–":new Intl.NumberFormat("de-DE").format(Number(n)||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let DATA=null;
let dashboardLoaded=false;


function showAccountView(){
  $("#accountMain").hidden=false;
  $("#dashboardView").hidden=true;
  $("#showAccountStats")?.classList.add("active");
  $("#showDashboard")?.classList.remove("active");
}
function showDashboardView(){
  $("#accountMain").hidden=true;
  $("#dashboardView").hidden=false;
  $("#showAccountStats")?.classList.remove("active");
  $("#showDashboard")?.classList.add("active");
  if(!dashboardLoaded){
    $("#dashboardFrame").src="account-dashboard/index.html";
    dashboardLoaded=true;
  }
}

function table(obj, empty="Noch nicht erfasst"){
  const rows=Object.entries(obj||{});
  if(!rows.length)return `<p class="missing-data">${empty}</p>`;
  return `<table class="data-table"><tbody>${rows.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${fmt(v)}</td></tr>`).join("")}</tbody></table>`;
}
function resources(p){
  const r=p.resources||{}, ph=p.production_hour||{};
  return `<div class="production-grid">
    ${["metal","crystal","deuterium"].map(k=>`<div class="production-item"><strong>${({metal:"Metall",crystal:"Kristall",deuterium:"Deuterium"})[k]}</strong>
    <div>Bestand: ${fmt(r[k])}</div><div>1 h: ${fmt(ph[k])}</div><div>24 h: ${fmt((ph[k]||0)*24)}</div></div>`).join("")}
  </div>`;
}
function deltaMap(current,previous){
  const result={};
  for(const key of new Set([...Object.keys(current||{}),...Object.keys(previous||{})])){
    result[key]=(current?.[key]||0)-(previous?.[key]||0);
  }
  return result;
}
function render(){
  const id=$("#accountPlayer").value;
  const player=DATA.players.find(p=>String(p.id)===id)||DATA.players[0];
  if(!player||!player.latest){$("#accountMain").innerHTML='<p>Keine Accountdaten vorhanden.</p>';return}
  const d=player.latest, planets=Object.values(d.planets||{});
  const previous=player.history.length>1?player.history.at(-2):null;
  $("#accountTitle").textContent=`${player.name} – Accountstatistik`;
  $("#accountSubtitle").textContent=`${d.universe_name||d.universe} · letzter Upload ${new Date(d.captured_at).toLocaleString("de-DE")}`;
  const t=d.totals||{};
  const cards=[
    ["Spieler-ID",d.player?.id],["Spielername",d.player?.name],["Universum",d.universe],
    ["Accountklasse",d.classes?.account],["Allianzklasse",d.classes?.alliance],
    ["Planeten/Monde",planets.length],["Schiffe gesamt",t.ships],["Verteidigung gesamt",t.defense]
  ];
  let html=`<section class="account-grid">${cards.map(([l,v])=>`<article class="panel account-card"><span class="summary-label">${esc(l)}</span><strong class="summary-value">${typeof v==="number"?fmt(v):esc(v||"–")}</strong></article>`).join("")}</section>`;
  html+=`<section class="panel account-card account-section"><h2>Gesamtproduktion aller Planeten</h2>${resources({resources:t.resources,production_hour:t.production_hour})}</section>`;
  html+=`<section class="planet-grid">`;
  for(const p of planets){
    html+=`<article class="panel planet-card"><h2>${esc(p.name||"Unbekannt")} <small>${esc(p.coordinates||"")}</small></h2>
      <p>${esc(p.type||"planet")} · Durchmesser ${fmt(p.diameter_km)} km · Felder ${fmt(p.fields_used)}/${fmt(p.fields_total)} · Temperatur ${p.temperature_min??"–"} bis ${p.temperature_max??"–"} °C</p>
      <h3>Ressourcen und Produktion</h3>${resources(p)}
      <h3>Speichergrößen</h3>${table(p.storage)}
      <h3>Energie, DM, Population und Nahrung</h3>${table({
        Energie:p.resources?.energy,Dunkle_Materie:p.resources?.dark_matter,
        Population:p.resources?.population,Nahrung:p.resources?.food
      })}
      <h3>Gebäude</h3>${table(p.buildings)}
      <h3>Forschungen</h3>${table(p.research)}
      <h3>Lebensformgebäude</h3>${table(p.lifeform_buildings)}
      <h3>Lebensformforschungen</h3>${table(p.lifeform_research)}
      <h3>Schiffe</h3>${table(p.ships)}
      <h3>Verteidigung</h3>${table(p.defense)}
    </article>`;
  }
  html+=`</section>`;
  const shipDelta=previous?((t.ships||0)-(previous.ships_total||0)):null;
  html+=`<section class="panel account-card account-section"><h2>Entwicklung</h2>
    <p>Flottenwachstum seit letztem Snapshot: <strong>${shipDelta==null?"Noch kein Vergleich":`${shipDelta>=0?"+":""}${fmt(shipDelta)}`}</strong></p>
    <p>Ressourcenproduktion pro Tag: Metall ${fmt((t.production_hour?.metal||0)*24)}, Kristall ${fmt((t.production_hour?.crystal||0)*24)}, Deuterium ${fmt((t.production_hour?.deuterium||0)*24)}</p>
    <p class="muted">Punkteentwicklung und belastbare Verlust-/Neubauableitungen werden ergänzt, sobald genügend regelmäßige Snapshots vorliegen.</p></section>`;
  $("#accountMain").innerHTML=html;
  $("#accountFooter").textContent=`Datendatei erzeugt ${new Date(DATA.generated_at).toLocaleString("de-DE")}`;
}
async function start(){
  DATA=await fetch("account-data.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("account-data.json fehlt");return r.json()});
  $("#accountPlayer").innerHTML=DATA.players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  $("#login").hidden=true;$("#app").hidden=false;render();showAccountView();
}
$("#loginForm").onsubmit=e=>{e.preventDefault();if($("#password").value===TEST_PASSWORD){sessionStorage.setItem("oasAccountUnlocked","1");start().catch(e=>$("#accountSubtitle").textContent=e.message)}else $("#loginError").textContent="Falsches Passwort."};
$("#accountPlayer").onchange=render;
$("#showAccountStats").onclick=showAccountView;
$("#showDashboard").onclick=showDashboardView;
$("#logout").onclick=()=>{sessionStorage.removeItem("oasAccountUnlocked");location.reload()};
if(sessionStorage.getItem("oasAccountUnlocked")==="1")start().catch(e=>{document.querySelector("#loginError").textContent=e.message});
