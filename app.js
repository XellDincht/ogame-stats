const metrics = [
  ["Gesamt","total_points","total_rank"],
  ["Ökonomie","economy_points","economy_rank"],
  ["Forschung","research_points","research_rank"],
  ["Militär","military_points","military_rank"],
  ["Gebaut","military_built_points",null],
  ["Verloren","military_lost_points",null],
  ["Zerstört","military_destroyed_points",null],
  ["Ehre","honor_points","honor_rank"],
  ["Schiffe","ships",null]
];

let data=null, rangeDays=1, selectedPlayer="all", compareA=null, compareB=null;

const fmt=n=>n==null?"–":new Intl.NumberFormat("de-DE").format(n);
const deltaFmt=n=>n==null?"–":`${n>0?"+":""}${fmt(n)}`;
const cls=n=>n>0?"positive":n<0?"negative":"neutral";

function latest(player){return player.snapshots[player.snapshots.length-1]}
function previous(player,days){
  const current=latest(player); if(!current)return null;
  const target=new Date(current.date); target.setDate(target.getDate()-days);
  return [...player.snapshots].reverse().find(s=>new Date(s.date)<=target)||null;
}
function diff(player,field,days){
  const a=latest(player),b=previous(player,days);
  return !a||!b||a[field]==null||b[field]==null?null:a[field]-b[field];
}
function rankDiff(player,field,days){
  const a=latest(player),b=previous(player,days);
  return !a||!b||a[field]==null||b[field]==null?null:b[field]-a[field];
}

function visiblePlayers(){
  return data.players.filter(p=>selectedPlayer==="all"||String(p.id)===selectedPlayer);
}

function renderSummary(){
  const players=visiblePlayers();
  const fields=["total_points","economy_points","research_points","military_points","ships"];
  const labels=["Gesamt","Ökonomie","Forschung","Militär","Schiffe"];
  document.querySelector("#summary").innerHTML=fields.map((field,i)=>{
    const value=players.reduce((s,p)=>s+(latest(p)?.[field]||0),0);
    const d=players.reduce((s,p)=>s+(diff(p,field,rangeDays)||0),0);
    return `<article class="card"><span class="label">${labels[i]}</span><strong class="value">${fmt(value)}</strong><div class="delta ${cls(d)}">${deltaFmt(d)}</div></article>`
  }).join("");
}

function renderCards(){
  const q=document.querySelector("#search").value.trim().toLowerCase();
  const players=visiblePlayers().filter(p=>p.name.toLowerCase().includes(q));
  document.querySelector("#playerCards").innerHTML=players.map(p=>{
    const rows=metrics.map(([label,field,rank])=>{
      const d=diff(p,field,rangeDays);
      const rankText=rank&&latest(p)[rank]!=null?`Rang ${fmt(latest(p)[rank])} (${deltaFmt(rankDiff(p,rank,rangeDays))})`:"";
      return `<div class="metric"><span>${label}</span><strong>${fmt(latest(p)[field])}</strong><span class="${cls(d)}">${deltaFmt(d)}${rankText?` · ${rankText}`:""}</span></div>`
    }).join("");
    return `<article class="player-card"><h3>${p.name}</h3>${rows}</article>`
  }).join("");
}

function renderTable(){
  const head=["Spieler"];
  metrics.forEach(([label,,rank])=>{head.push(label,"Δ");if(rank)head.push("Rang","Δ Rang")});
  document.querySelector("#tableHead").innerHTML=`<tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr>`;
  document.querySelector("#tableBody").innerHTML=visiblePlayers().map(p=>{
    let cells=`<td>${p.name}</td>`;
    metrics.forEach(([,field,rank])=>{
      const d=diff(p,field,rangeDays);
      cells+=`<td>${fmt(latest(p)[field])}</td><td class="${cls(d)}">${deltaFmt(d)}</td>`;
      if(rank){
        const rd=rankDiff(p,rank,rangeDays);
        cells+=`<td>${fmt(latest(p)[rank])}</td><td class="${cls(rd)}">${deltaFmt(rd)}</td>`;
      }
    });
    return `<tr>${cells}</tr>`;
  }).join("");
}

function renderChart(){
  const canvas=document.querySelector("#historyChart"),ctx=canvas.getContext("2d");
  const dpr=window.devicePixelRatio||1,w=canvas.clientWidth||1200,h=420;
  canvas.width=w*dpr; canvas.height=h*dpr; ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,w,h);

  const players=visiblePlayers();
  const allDates=[...new Set(players.flatMap(p=>p.snapshots.map(s=>s.date)))].sort();
  const dates=allDates.slice(-Math.max(rangeDays+1,8));
  const values=players.flatMap(p=>p.snapshots.filter(s=>dates.includes(s.date)).map(s=>s.total_points||0));
  if(!values.length)return;
  const min=Math.min(...values),max=Math.max(...values),pad=(max-min)*.08||1;
  const left=62,right=18,top=20,bottom=48,plotW=w-left-right,plotH=h-top-bottom;
  ctx.strokeStyle="rgba(157,178,200,.22)";ctx.fillStyle="#9db2c8";ctx.font="12px Segoe UI";
  for(let i=0;i<5;i++){
    const y=top+plotH*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    const val=max+pad-(max-min+2*pad)*i/4;ctx.fillText(fmt(Math.round(val)),4,y+4);
  }
  const palette=["#55d9ff","#7b8cff","#67e8a5","#ffb86b","#ff7d8b","#c792ea"];
  players.forEach((p,pi)=>{
    const map=new Map(p.snapshots.map(s=>[s.date,s.total_points]));
    ctx.strokeStyle=palette[pi%palette.length];ctx.lineWidth=2.5;ctx.beginPath();
    let started=false;
    dates.forEach((date,i)=>{
      const val=map.get(date);if(val==null)return;
      const x=left+(dates.length===1?0:plotW*i/(dates.length-1));
      const y=top+plotH*(1-(val-(min-pad))/(max-min+2*pad));
      if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
    });
    ctx.stroke();ctx.fillStyle=palette[pi%palette.length];ctx.fillText(p.name,left+10,top+16+pi*17);
  });
  ctx.fillStyle="#9db2c8";
  dates.forEach((d,i)=>{if(i%Math.ceil(dates.length/6)===0){const x=left+plotW*i/Math.max(dates.length-1,1);ctx.fillText(d.slice(5),x-14,h-18)}})
}


function comparisonPlayer(id){
  return data.players.find(p=>String(p.id)===String(id));
}

function renderComparison(){
  const a=comparisonPlayer(compareA), b=comparisonPlayer(compareB);
  if(!a||!b)return;

  const card=p=>{
    const rows=metrics.map(([label,field])=>{
      const current=latest(p)?.[field];
      const d=diff(p,field,rangeDays);
      const other=p===a?latest(b)?.[field]:latest(a)?.[field];
      const winner=current!=null&&other!=null&&current>other?"compare-winner":"";
      return `<div class="compare-metric"><span class="metric-label">${label}</span><strong class="${winner}">${fmt(current)}</strong><span class="${cls(d)}">${deltaFmt(d)}</span></div>`;
    }).join("");
    return `<article class="compare-player"><h3>${p.name}</h3>${rows}</article>`;
  };
  document.querySelector("#compareCards").innerHTML=card(a)+card(b);
  renderCompareChart(a,b);
}

function renderCompareChart(a,b){
  const canvas=document.querySelector("#compareChart"),ctx=canvas.getContext("2d");
  const dpr=window.devicePixelRatio||1,w=canvas.clientWidth||1200,h=420;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  const allDates=[...new Set([...a.snapshots,...b.snapshots].map(s=>s.date))].sort();
  const dates=allDates.slice(-Math.max(rangeDays+1,8));
  const values=[...a.snapshots,...b.snapshots].filter(s=>dates.includes(s.date)).map(s=>s.total_points||0);
  if(!values.length)return;
  const min=Math.min(...values),max=Math.max(...values),pad=(max-min)*.08||1;
  const left=62,right=18,top=24,bottom=48,plotW=w-left-right,plotH=h-top-bottom;
  ctx.strokeStyle="rgba(157,178,200,.22)";ctx.fillStyle="#9db2c8";ctx.font="12px Segoe UI";
  for(let i=0;i<5;i++){const y=top+plotH*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();const val=max+pad-(max-min+2*pad)*i/4;ctx.fillText(fmt(Math.round(val)),4,y+4)}
  [[a,"#55d9ff"],[b,"#ffb86b"]].forEach(([p,color],pi)=>{
    const map=new Map(p.snapshots.map(s=>[s.date,s.total_points]));
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();let started=false;
    dates.forEach((date,i)=>{const val=map.get(date);if(val==null)return;const x=left+plotW*i/Math.max(dates.length-1,1);const y=top+plotH*(1-(val-(min-pad))/(max-min+2*pad));if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y)});
    ctx.stroke();ctx.fillStyle=color;ctx.fillText(p.name,left+10,top+16+pi*18);
  });
  ctx.fillStyle="#9db2c8";
  dates.forEach((d,i)=>{if(i%Math.ceil(dates.length/6)===0){const x=left+plotW*i/Math.max(dates.length-1,1);ctx.fillText(d.slice(5),x-14,h-18)}})
}

function render(){
  document.querySelector("#rangeLabel").textContent=`Vergleich: ${rangeDays} Tag${rangeDays===1?"":"e"}`;
  renderSummary();renderCards();renderTable();renderChart();renderComparison();
}

fetch("data.json",{cache:"no-store"}).then(r=>{
  if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()
}).then(json=>{
  data=json;
  document.title=data.meta.title;
  document.querySelector("#title").textContent=data.meta.title;
  document.querySelector("#subtitle").textContent=`Server ${data.meta.server} · letzter Snapshot ${data.meta.latest_date||"–"}`;
  document.querySelector("#footer").textContent=`Erzeugt ${new Date(data.meta.generated_at).toLocaleString("de-DE")}`;
  const select=document.querySelector("#playerFilter");
  const compareSelectA=document.querySelector("#compareA");
  const compareSelectB=document.querySelector("#compareB");
  data.players.forEach(p=>{
    select.insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.name}</option>`);
    compareSelectA.insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.name}</option>`);
    compareSelectB.insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.name}</option>`);
  });
  compareA=String(data.players[0]?.id||"");
  compareB=String(data.players[1]?.id||data.players[0]?.id||"");
  compareSelectA.value=compareA; compareSelectB.value=compareB;
  render();
}).catch(err=>{
  document.querySelector("#subtitle").textContent=`Daten konnten nicht geladen werden: ${err.message}`;
});

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");rangeDays=Number(btn.dataset.range);render();
}));
document.querySelector("#playerFilter").addEventListener("change",e=>{selectedPlayer=e.target.value;render()});
document.querySelector("#search").addEventListener("input",renderCards);
window.addEventListener("resize",()=>data&&renderChart());

document.querySelector("#compareA").addEventListener("change",e=>{compareA=e.target.value;renderComparison()});
document.querySelector("#compareB").addEventListener("change",e=>{compareB=e.target.value;renderComparison()});
