const M=[["Gesamt","total_points","total_rank"],["Ökonomie","economy_points","economy_rank"],["Forschung","research_points","research_rank"],["Militär","military_points","military_rank"],["Gebaut","military_built_points",null],["Verloren","military_lost_points",null],["Zerstört","military_destroyed_points",null],["Ehre","honor_points","honor_rank"],["Schiffe","ships",null]],C=["#55d9ff","#ffb86b","#67e8a5","#c792ea","#ff7d8b","#7b8cff","#ffd166","#7dd3fc"];
let D=null,R=1,F="all",A="",B="";const chartsState=new WeakMap();
const $=s=>document.querySelector(s),fmt=n=>n==null?"–":new Intl.NumberFormat("de-DE").format(n),df=n=>n==null?"–":`${n>0?"+":""}${fmt(n)}`,pf=n=>n==null?"–":`${n>0?"+":""}${n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}%`,cl=n=>n>0?"positive":n<0?"negative":"neutral",last=p=>p.snapshots.at(-1)||{};
function prev(p,d){const c=last(p);if(!c.date)return null;const t=new Date(`${c.date}T00:00:00`);t.setDate(t.getDate()-d);return[...p.snapshots].reverse().find(s=>new Date(`${s.date}T00:00:00`)<=t)||null}
function diff(p,f,d=R){const a=last(p),b=prev(p,d);return a[f]==null||!b||b[f]==null?null:a[f]-b[f]}
function pct(p,f,d=R){const a=last(p),b=prev(p,d);return a[f]==null||!b||b[f]==null||b[f]===0?null:(a[f]-b[f])/b[f]*100}
function rd(p,f){const a=last(p),b=prev(p,R);return a[f]==null||!b||b[f]==null?null:b[f]-a[f]}
function changeHtml(p,f,d=R){const x=diff(p,f,d),q=pct(p,f,d);return `<span class="metric-change ${cl(x)}"><span>${df(x)}</span><small class="percent">(${pf(q)})</small></span>`}
function activePlayers(){return D.players.filter(p=>p.is_active!==false)}
function visible(){const q=$("#search").value.toLowerCase();return activePlayers().filter(p=>(F==="all"||String(p.id)===F)&&p.name.toLowerCase().includes(q))}
function selected(){return activePlayers().filter(p=>F==="all"||String(p.id)===F)}

function alliancePrev(days=R){const h=D.alliance?.history||[],c=h.at(-1);if(!c)return null;const t=new Date(`${c.snapshot_date}T00:00:00`);t.setDate(t.getDate()-days);return[...h].reverse().find(x=>new Date(`${x.snapshot_date}T00:00:00`)<=t)||null}
function heroStats(){
  const a=D.alliance?.latest;
  if(!a){$("#heroFacts").innerHTML="";return}
  const facts=[
    ["Mitglieder",a.member_count],
    ["Allianzrang",a.total_rank!=null?`#${fmt(a.total_rank)}`:"–"],
    ["Gesamtpunkte",a.total_points]
  ];
  $("#heroFacts").innerHTML=facts.map(([label,value])=>
    `<span class="hero-fact"><small>${label}</small><strong>${typeof value==="number"?fmt(value):value}</strong></span>`
  ).join("");
}
function allianceStats(){const root=D.alliance||{},a=root.latest;if(!a){$("#allianceSummary").innerHTML='<div class="alliance-empty">Noch keine offiziellen Allianzwerte gespeichert. Einmal run_force.bat ausführen.</div>';return}const old=alliancePrev(),cards=[["Allianz",root.tag?`[${root.tag}]`:(root.name||"–"),null],["Gesamtpunkte",a.total_points,"total_points"],["Gesamtrang",a.total_rank,"total_rank",true],["Mitglieder",a.member_count,null],["Ø Punkte / Mitglied",a.member_count?Math.round((a.total_points||0)/a.member_count):null,null],["Ökonomie",a.economy_points,"economy_points"],["Forschung",a.research_points,"research_points"],["Militär",a.military_points,"military_points"]];$("#allianceSummary").innerHTML=cards.map(([l,v,f,isRank])=>{let delta=null,q=null;if(f&&old&&old[f]!=null&&v!=null){delta=isRank?old[f]-v:v-old[f];q=!isRank&&old[f]?delta/old[f]*100:null}return`<article class="summary-card"><span class="summary-label">${l}</span><strong class="summary-value">${typeof v==="number"?fmt(v):v}</strong>${f?`<div class="summary-delta ${cl(delta)}">${df(delta)} ${!isRank?`<small class="percent">(${pf(q)})</small>`:""}</div>`:""}</article>`}).join("");const pseudo={name:root.tag||root.name||"Allianz",snapshots:(root.history||[]).map(x=>({...x,date:x.snapshot_date}))};chart($("#allianceChart"),[pseudo],"total_points")}
function loadAccounts(){ const link=$("#accountLink"); if(link) link.hidden=false; }

function summary(){const ps=selected(),sp=[["Gesamt","total_points"],["Ökonomie","economy_points"],["Forschung","research_points"],["Militär","military_points"],["Schiffe","ships"]];$("#summary").innerHTML=sp.map(([l,f])=>{const v=ps.reduce((s,p)=>s+(last(p)[f]||0),0),old=ps.reduce((s,p)=>s+(prev(p,R)?.[f]||0),0),d=v-old,q=old?d/old*100:null;return`<article class="summary-card"><span class="summary-label">${l}</span><strong class="summary-value">${fmt(v)}</strong><div class="summary-delta ${cl(d)}">${df(d)} <small class="percent">(${pf(q)})</small></div></article>`}).join("")}
function metricCells(p,f){return `<td>${fmt(last(p)[f])}</td><td class="${cl(diff(p,f))}">${df(diff(p,f))}</td><td class="${cl(pct(p,f))}">${pf(pct(p,f))}</td>`}
function table(){$("#allianceBody").innerHTML=visible().map(p=>`<tr><td><a href="player.html?id=${p.id}">${p.name}</a></td>${metricCells(p,"total_points")}${metricCells(p,"economy_points")}${metricCells(p,"research_points")}${metricCells(p,"military_points")}${metricCells(p,"ships")}</tr>`).join("")}
function cards(){
  const allianceTotal=D.alliance?.latest?.total_points||activePlayers().reduce((sum,p)=>sum+(last(p).total_points||0),0)||1;
  $("#playerCards").innerHTML=visible().map((p,index)=>{
    const s=last(p),total=s.total_points||0,share=Math.max(0,total/allianceTotal*100);
    const rank=s.total_rank!=null?`#${fmt(s.total_rank)}`:"–";
    const metrics=[
      ["Ökonomie","economy_points"],
      ["Forschung","research_points"],
      ["Militär","military_points"]
    ];
    return `<article class="player-card player-card-v2" style="--player-accent:${C[index%C.length]}">
      <div class="player-card-head">
        <div>
          <span class="player-card-date">${s.date||"–"}</span>
          <h3><a href="player.html?id=${p.id}">${p.name}</a></h3>
        </div>
        <span class="player-rank">${rank}</span>
      </div>

      <div class="player-total">
        <span>Gesamtpunkte</span>
        <strong>${fmt(total)}</strong>
        ${changeHtml(p,"total_points")}
      </div>

      <div class="player-share">
        <div class="player-share-copy">
          <span>Anteil an Allianz</span><strong>${share.toLocaleString("de-DE",{maximumFractionDigits:1})}%</strong>
        </div>
        <div class="player-share-track"><span style="width:${Math.min(100,share)}%"></span></div>
      </div>

      <div class="player-metric-grid">
        ${metrics.map(([label,field])=>`
          <div class="player-metric">
            <span>${label}</span>
            <strong>${fmt(s[field])}</strong>
            ${changeHtml(p,field)}
          </div>`).join("")}
      </div>

      <div class="player-card-foot">
        <span><small>Schiffe</small><strong>${fmt(s.ships)}</strong></span>
        <span><small>Ehrenpunkte</small><strong>${fmt(s.honor_points)}</strong></span>
        <a href="player.html?id=${p.id}">Historie ↗</a>
      </div>
    </article>`;
  }).join("");
}
function byid(id){return D.players.find(p=>String(p.id)===String(id))}
function compare(){const a=byid(A),b=byid(B);if(!a||!b)return;const card=(p,o)=>`<article class="compare-card"><h3>${p.name}</h3>${M.map(([l,f])=>`<div class="metric-row"><span>${l}</span><strong class="${last(p)[f]!=null&&last(o)[f]!=null&&last(p)[f]>last(o)[f]?"winner":""}">${fmt(last(p)[f])}</strong>${changeHtml(p,f)}</div>`).join("")}</article>`;$("#compareCards").innerHTML=card(a,b)+card(b,a);chart($("#compareChart"),[a,b],"total_points")}
function rank(title,f){const x=activePlayers().map(p=>({p,v:diff(p,f),q:pct(p,f)})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v).slice(0,5),m=["🥇","🥈","🥉","4.","5."];return`<article class="ranking-card"><h3>${title}</h3>${x.length?x.map((x,i)=>`<div class="ranking-item"><span>${m[i]}</span><span>${x.p.name}</span><span class="ranking-value ${cl(x.v)}">${df(x.v)} <small class="percent">(${pf(x.q)})</small></span></div>`).join(""):'<span class="muted">Noch keine Vergleichsdaten.</span>'}</article>`}
function rankings(){$("#rankings").innerHTML=rank("Größter Gesamtzuwachs","total_points")+rank("Beste Wirtschaft","economy_points")+rank("Beste Forschung","research_points")+rank("Stärkstes Militärwachstum","military_points")+rank("Größter Schiffszuwachs","ships")}
function chart(c,ps,f){
  if(!c)return;
  const x=c.getContext("2d"),dpr=devicePixelRatio||1,w=Math.max(c.clientWidth||640,280),h=w<520?280:340;
  c.width=w*dpr;c.height=h*dpr;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);

  const dates=[...new Set(ps.flatMap(p=>p.snapshots.map(s=>s.date)))].sort().slice(-Math.max(R+1,8));
  const vals=ps.flatMap(p=>p.snapshots.filter(s=>dates.includes(s.date)&&s[f]!=null).map(s=>s[f]));
  if(!vals.length){
    x.fillStyle="#8fa7be";x.font="13px Segoe UI";x.fillText("Noch keine ausreichenden Daten.",18,28);
    chartsState.set(c,[]);return;
  }

  const mn=Math.min(...vals),mx=Math.max(...vals),pad=(mx-mn)*.10||1;
  const L=w<520?58:76,T=28,W=w-L-18,H=h-T-46,points=[];

  const bg=x.createLinearGradient(0,T,0,T+H);
  bg.addColorStop(0,"rgba(59,132,199,.08)");
  bg.addColorStop(1,"rgba(6,17,30,0)");
  x.fillStyle=bg;x.fillRect(L,T,W,H);

  x.font=w<520?"10px Segoe UI":"11px Segoe UI";
  for(let i=0;i<5;i++){
    const y=T+H*i/4;
    x.strokeStyle=i===4?"rgba(126,181,232,.20)":"rgba(126,181,232,.11)";
    x.lineWidth=1;x.beginPath();x.moveTo(L,y);x.lineTo(w-18,y);x.stroke();
    x.fillStyle="#7890a7";
    const label=fmt(Math.round(mx+pad-(mx-mn+2*pad)*i/4));
    x.fillText(label,5,y+4);
  }

  ps.forEach((p,j)=>{
    const mp=new Map(p.snapshots.map(s=>[s.date,s[f]]));
    const color=C[j%C.length];
    const linePoints=[];
    dates.forEach((d,i)=>{
      const v=mp.get(d);if(v==null)return;
      const px=L+W*i/Math.max(dates.length-1,1);
      const py=T+H*(1-(v-(mn-pad))/(mx-mn+2*pad));
      linePoints.push({x:px,y:py,date:d,value:v,player:p.name,color});
    });
    if(!linePoints.length)return;

    const fill=x.createLinearGradient(0,T,0,T+H);
    fill.addColorStop(0,`${color}22`);
    fill.addColorStop(1,`${color}00`);
    x.beginPath();x.moveTo(linePoints[0].x,T+H);
    linePoints.forEach((pt,i)=>i?x.lineTo(pt.x,pt.y):x.lineTo(pt.x,pt.y));
    x.lineTo(linePoints.at(-1).x,T+H);x.closePath();x.fillStyle=fill;x.fill();

    x.beginPath();
    linePoints.forEach((pt,i)=>i?x.lineTo(pt.x,pt.y):x.moveTo(pt.x,pt.y));
    x.strokeStyle=color;x.lineWidth=2.4;x.shadowColor=color;x.shadowBlur=7;x.stroke();x.shadowBlur=0;

    linePoints.forEach(pt=>{
      x.beginPath();x.fillStyle=color;x.arc(pt.x,pt.y,w<520?3:3.7,0,Math.PI*2);x.fill();
      x.lineWidth=1.5;x.strokeStyle="#07111f";x.stroke();points.push(pt);
    });
  });

  dates.forEach((d,i)=>{
    if(i%Math.max(1,Math.ceil(dates.length/(w<520?4:6)))===0){
      const px=L+W*i/Math.max(dates.length-1,1);
      x.fillStyle="#7890a7";x.fillText(d.slice(5),px-13,h-17);
    }
  });

  chartsState.set(c,points);bindHover(c);
}

function shareChart(){
  const c=$("#shareChart");if(!c)return;
  const ps=visible().map(p=>({name:p.name,value:last(p).total_points||0})).sort((a,b)=>b.value-a.value);
  const total=ps.reduce((s,p)=>s+p.value,0)||1;
  const x=c.getContext("2d"),dpr=devicePixelRatio||1,w=Math.max(c.clientWidth||560,280);
  const rowH=w<520?42:46,h=Math.max(220,ps.length*rowH+36);
  c.width=w*dpr;c.height=h*dpr;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);

  const left=w<520?94:125,right=56,barW=Math.max(60,w-left-right);
  ps.forEach((p,i)=>{
    const y=24+i*rowH,pct=p.value/total*100,color=C[i%C.length];
    x.fillStyle="#a9bdcf";x.font=w<520?"11px Segoe UI":"12px Segoe UI";
    x.fillText(p.name.slice(0,w<520?13:20),8,y+13);

    x.fillStyle="rgba(126,181,232,.09)";
    roundRect(x,left,y,barW,12,6);x.fill();

    const fillW=Math.max(pct>0?4:0,barW*pct/100);
    const grad=x.createLinearGradient(left,0,left+fillW,0);
    grad.addColorStop(0,color);grad.addColorStop(1,`${color}88`);
    x.fillStyle=grad;roundRect(x,left,y,fillW,12,6);x.fill();

    x.fillStyle="#edf6ff";x.textAlign="right";x.font="700 11px Segoe UI";
    x.fillText(`${pct.toLocaleString("de-DE",{maximumFractionDigits:1})}%`,w-8,y+12);
    x.textAlign="left";
  });
}

function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function bindHover(c){if(c.dataset.hoverBound)return;c.dataset.hoverBound="1";const tip=$("#chartTooltip");c.addEventListener("mousemove",e=>{const rect=c.getBoundingClientRect(),sx=c.width/(devicePixelRatio||1)/rect.width,sy=c.height/(devicePixelRatio||1)/rect.height,mx=(e.clientX-rect.left)*sx,my=(e.clientY-rect.top)*sy,pts=chartsState.get(c)||[];let best=null,dist=Infinity;for(const p of pts){const d=Math.hypot(p.x-mx,p.y-my);if(d<dist){dist=d;best=p}}if(best&&dist<=12){tip.innerHTML=`<strong>${best.player}</strong><div>${best.date}</div><div class="muted">Wert</div><div>${fmt(best.value)}</div>`;tip.hidden=false;tip.style.left=`${e.clientX}px`;tip.style.top=`${e.clientY}px`;c.style.cursor="pointer"}else{tip.hidden=true;c.style.cursor="default"}});c.addEventListener("mouseleave",()=>{tip.hidden=true;c.style.cursor="default"})}
function charts(){
  const ps=selected();
  chart($("#totalChart"),ps,"total_points");
  chart($("#militaryChart"),ps,"military_points");
  chart($("#shipsChart"),ps,"ships");
  chart($("#researchChart"),ps,"research_points");
  chart($("#economyChart"),ps,"economy_points");
  shareChart();
}

function render(){heroStats();allianceStats();table();cards();compare();charts();rankings()}
function setDataSourceStatus(source,state="ready"){const el=$("#dataSourceStatus");if(!el)return;el.className=`data-source-status ${state==="error"?"is-error":source==="supabase"?"is-supabase":"is-local"}`;el.textContent=state==="error"?"Fehler":source==="supabase"?"Supabase":"Lokal / JSON"}
function initDataSourceControl(){const select=$("#dataSource");if(!select||!window.ogameDataSource)return;const source=window.ogameDataSource.getSource();select.value=source;setDataSourceStatus(source);select.onchange=()=>{window.ogameDataSource.setSource(select.value);location.reload()}}
function fillPlayerControls(){activePlayers().forEach(p=>{$("#playerFilter").insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.name}</option>`);$("#compareA").insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.name}</option>`);$("#compareB").insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.name}</option>`)});const ap=activePlayers();A=String(ap[0]?.id||"");B=String(ap[1]?.id||ap[0]?.id||"");$("#compareA").value=A;$("#compareB").value=B}
async function loadDashboard(){
  try{
    D=await window.ogameDataSource.load();
    $("#title").textContent=D.meta.title;
    $("#subtitle").textContent=`Server ${D.meta.server} · letzter Snapshot ${D.meta.latest_date||"–"}`;
    $("#footer").textContent=`Stand ${new Date(D.meta.generated_at).toLocaleString("de-DE")}`;
    fillPlayerControls();
    render();
  }catch(e){
    console.error("Dashboard-Daten konnten nicht geladen werden:",e);
    $("#subtitle").textContent=`Fehler beim Laden der Allianzdaten: ${e.message}`;
  }
}
loadAccounts();
loadDashboard();
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");R=+b.dataset.range;render()});$("#playerFilter").onchange=e=>{F=e.target.value;render()};$("#search").oninput=()=>{table();cards()};$("#compareA").onchange=e=>{A=e.target.value;compare()};$("#compareB").onchange=e=>{B=e.target.value;compare()};window.onresize=()=>D&&(charts(),compare());
