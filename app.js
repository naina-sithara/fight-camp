import { store, today, ymd, parseD, DAY, getDay, saveDay, allDays, exportAll, importAll } from "./store.js";
import { STEPS, defaults, computeTargets } from "./profile.js";
import { FOODS } from "./foods.js";
import { EXERCISES, CATEGORIES } from "./exercises.js";
import { ask, setupKey, hasKey, shrinkImage, Recorder, AIError } from "./ai.js";
import { logSystem, coachSystem, planSystem } from "./prompts.js";

/* ---------------- helpers ---------------- */
const $ = s => document.querySelector(s);
const app = $("#app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = v => { const x = Number(v); return isFinite(x) ? x : 0; };
const r0 = v => Math.round(n(v));
const r1 = v => Math.round(n(v) * 10) / 10;
const uid = () => Math.random().toString(36).slice(2, 10);
const hhmm = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
let MEDIA = {};

const I = {
  rings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M5 15l4-5 4 3 6-7"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0M12 9.5l1-1.5"/></svg>',
  steps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 16h4v3a2 2 0 0 1-4 0zM16 7c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
};

function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2400); }
const profile = () => store.get("profile");
const targets = () => profile()?.targets || computeTargets(Object.assign(defaults(), { age: 22, height: 153, weight: 43, goalWeight: 50 }));

function applyTheme(){
  const th = store.get("theme", "blush");
  document.documentElement.dataset.theme = th;
  document.querySelector('meta[name="theme-color"]').content = th === "noir" ? "#000000" : "#0A090C";
}

/* ---------------- day maths ---------------- */
const foodKcal = f => n(f.grams) * n(f.per100?.kcal) / 100;
const foodM = (f, k) => n(f.grams) * n(f.per100?.[k]) / 100;
function weightNow(){
  const ds = allDays().filter(d => getDay(d).weight != null);
  return ds.length ? getDay(ds[ds.length - 1]).weight : n(profile()?.weight);
}
const woKcal = w => n(w.met) * weightNow() * n(w.minutes) / 60;
function totals(day){
  const t = { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, burn: 0, min: 0 };
  day.meals.forEach(m => { t.kcal += foodKcal(m); t.p += foodM(m, "p"); t.c += foodM(m, "c"); t.f += foodM(m, "f"); t.fiber += foodM(m, "fiber"); });
  day.workouts.forEach(w => { t.burn += woKcal(w); t.min += n(w.minutes); });
  return t;
}
function plannedMinutes(dateStr){
  const plan = store.get("plan"); const p = profile();
  const wd = WD[parseD(dateStr).getDay()];
  const d = plan?.week?.find(x => x.day === wd);
  if (d){
    const gym = (d.gym || []).reduce((a, g) => a + n(g.sets) * 2.5, 0);
    const mt = d.muaythai ? n(p?.mtHours) * 60 : 0;
    return Math.max(20, gym + mt) || 20;
  }
  const week = n(p?.mtDays) * n(p?.mtHours) * 60 + n(p?.gymDays) * n(p?.gymMin);
  return Math.max(20, Math.round(week / 7));
}

/* ---------------- sheets ---------------- */
let sheetEl = null;
function openSheet(title, html, mount){
  closeSheet(true);
  const bd = document.createElement("div"); bd.className = "backdrop";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-label", title);
  sh.innerHTML = `<div class="grab"></div><div class="sh-head"><h2>${esc(title)}</h2><button class="close" aria-label="Close">${I.x}</button></div><div class="sh-body">${html}</div>`;
  document.body.append(bd, sh);
  requestAnimationFrame(() => { bd.classList.add("show"); sh.classList.add("show"); });
  bd.onclick = () => closeSheet(); sh.querySelector(".close").onclick = () => closeSheet();
  sheetEl = { bd, sh, onClose: null };
  if (mount) mount(sh.querySelector(".sh-body"), sheetEl);
  return sheetEl;
}
function closeSheet(instant){
  if (!sheetEl) return;
  const { bd, sh, onClose } = sheetEl; sheetEl = null;
  onClose && onClose();
  if (instant){ bd.remove(); sh.remove(); return; }
  bd.classList.remove("show"); sh.classList.remove("show");
  setTimeout(() => { bd.remove(); sh.remove(); }, 300);
}

/* ---------------- navigation ---------------- */
let tab = "today";
function nav(){
  const b = (id, icon, label) => `<button data-tab="${id}" class="${tab === id ? "on" : ""}" aria-label="${label}">${icon}<span>${label}</span></button>`;
  return `<nav class="nav"><div class="nav-in">${b("today", I.rings, "Today")}${b("train", I.train, "Train")}<button class="fab" id="fab" aria-label="Log food, training or anything">${I.plus}</button>${b("coach", I.chat, "Coach")}${b("progress", I.chart, "Progress")}</div></nav>`;
}
function render(){
  if (!profile()){ renderOnboarding(); return; }
  const views = { today: viewToday, train: viewTrain, coach: viewCoach, progress: viewProgress, me: viewMe };
  app.innerHTML = `<main class="view" id="view">${(views[tab] || viewToday)()}</main>${nav()}`;
  app.querySelectorAll("[data-tab]").forEach(x => x.onclick = () => { tab = x.dataset.tab; render(); window.scrollTo(0, 0); });
  $("#fab").onclick = () => openLog();
  ({ today: mountToday, train: mountTrain, coach: mountCoach, progress: mountProgress, me: mountMe })[tab]?.();
}
function header(title, sub){
  const p = profile();
  return `<header class="top"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div><button class="avatar" data-go="me" aria-label="Me and settings">${esc((p?.name || "Me").slice(0, 1).toUpperCase())}</button></header>`;
}
function bindGo(){ app.querySelectorAll("[data-go]").forEach(x => x.onclick = () => { tab = x.dataset.go; render(); window.scrollTo(0, 0); }); }

/* ---------------- TODAY ---------------- */
function ringsSVG(vals){
  const R = [74, 60, 46], C = ["var(--r-kcal)", "var(--r-protein)", "var(--r-train)"];
  return `<svg viewBox="0 0 160 160" aria-hidden="true">${R.map((r, i) => {
    const len = 2 * Math.PI * r, f = Math.max(0, Math.min(1, vals[i]));
    return `<circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--s3)" stroke-width="10"/>
      ${f > 0 ? `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${C[i]}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(f * len).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 80 80)" style="transition:stroke-dasharray .6s"/>` : ""}`;
  }).join("")}</svg>`;
}
function dailyTip(day, t, tg){
  const p = profile(), hr = new Date().getHours();
  const pLeft = tg.protein - t.p, kLeft = tg.kcal - t.kcal;
  const src = { nonveg: ["chicken_breast_cooked", "egg_whole_boiled"], egg: ["egg_whole_boiled", "greek_yogurt_nonfat"], veg: ["paneer", "greek_yogurt_nonfat"], vegan: ["tofu_firm", "soya_chunks_dry"] }[p.diet] || ["egg_whole_boiled"];
  const lastSleep = getDay(ymd(new Date(Date.now()))).sleep_h;
  if (!day.meals.length && hr < 11) return `Start with protein at breakfast. Aim for about ${Math.round(tg.protein / n(p.meals || 4))} g per meal to reach ${tg.protein} g today.`;
  if (lastSleep != null && lastSleep < tg.sleep_h - 1) return `You slept ${lastSleep} h. Keep today's training technical, and try to be in bed ${Math.round((tg.sleep_h - lastSleep) * 60)} min earlier tonight.`;
  if (pLeft > 15){
    const f = FOODS[src[0]], g = Math.round(pLeft / f.p * 100 / 5) * 5;
    return `${Math.round(pLeft)} g protein to go. That's about ${g} g ${f.name.split(",")[0].toLowerCase()}${f.unit ? ` (${Math.max(1, Math.round(g / f.unit))} pieces)` : ""}, spread over your next meals.`;
  }
  if (kLeft > 400 && hr >= 17) return `${Math.round(kLeft)} kcal left and the day's nearly done. Add a carb-rich meal; under-eating is the main reason weight doesn't move.`;
  if (day.water_ml < tg.water_ml * (hr / 22)) return `You're behind on water: ${r1(day.water_ml / 1000)} of ${tg.water_ml / 1000} L. Drink ${r1((tg.water_ml - day.water_ml) / 1000)} L more, more after training.`;
  if (kLeft < -200) return `You're ${Math.round(-kLeft)} kcal over. One day doesn't matter; keep tomorrow on target.`;
  return `On track. Keep protein up, train with intent, and log everything; accurate logs make your coach accurate.`;
}
function viewToday(){
  const p = profile(), tg = p.targets, day = getDay(today()), t = totals(day);
  const plan = plannedMinutes(today());
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const dayNo = Math.max(1, Math.round((parseD(today()) - parseD(p.startDate)) / DAY) + 1);
  const total = Math.max(1, Math.round((parseD(p.goalDate) - parseD(p.startDate)) / DAY));
  const bar = (name, v, tgt, col) => `<div class="bar"><div class="t"><span class="muted">${name}</span><span><b>${r0(v)}</b><span class="muted"> / ${tgt} g</span></span></div><div class="track"><i style="width:${Math.min(100, v / tgt * 100)}%;background:${col}"></i></div></div>`;
  const kLeft = tg.kcal - t.kcal;
  const groups = {};
  day.meals.forEach(m => (groups[m.meal || "meal"] ||= []).push(m));
  const wplan = store.get("plan")?.week?.find(x => x.day === WD[new Date().getDay()]);
  return `${header(`${greet}, ${esc(p.name || "fighter")}`, `${new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })} · Day ${Math.min(dayNo, total)} of ${total}`)}
  ${installBanner()}
  <section class="card" aria-label="Today's rings">
    <div class="hero">
      <div class="rings">${ringsSVG([t.kcal / tg.kcal, t.p / tg.protein, t.min / plan])}<div class="center"><b class="num">${r0(Math.abs(kLeft))}</b><span>${kLeft >= 0 ? "kcal left" : "kcal over"}</span></div></div>
      <div class="legend">
        <div class="leg"><i style="background:var(--r-kcal)"></i><div><b class="num">${r0(t.kcal)}</b><span>of ${tg.kcal} kcal</span></div></div>
        <div class="leg"><i style="background:var(--r-protein)"></i><div><b class="num">${r0(t.p)} g</b><span>of ${tg.protein} g protein</span></div></div>
        <div class="leg"><i style="background:var(--r-train)"></i><div><b class="num">${r0(t.min)} min</b><span>of ${r0(plan)} min training</span></div></div>
      </div>
    </div>
    <div class="macros">${bar("Carbs", t.c, tg.carbs, "var(--c-carb)")}${bar("Fat", t.f, tg.fat, "var(--c-fat)")}</div>
  </section>
  <div class="tip"><div class="dot">C</div><p>${esc(dailyTip(day, t, tg))}</p></div>
  <div class="grid2">
    <button class="tile" data-quick="water"><div class="ic">${I.drop}</div><b class="num">${r1(day.water_ml / 1000)}<small> / ${tg.water_ml / 1000} L</small></b><span class="sub">Tap to add water</span></button>
    <button class="tile" data-quick="sleep"><div class="ic">${I.moon}</div><b class="num">${day.sleep_h != null ? r1(day.sleep_h) : "–"}<small> / ${tg.sleep_h} h</small></b><span class="sub">${day.sleep_q ? `Quality ${day.sleep_q}/5` : "Last night's sleep"}</span></button>
    <button class="tile" data-quick="weight"><div class="ic">${I.scale}</div><b class="num">${day.weight != null ? r1(day.weight) : r1(weightNow())}<small> kg</small></b><span class="sub">${day.weight != null ? "Weighed today" : "Weigh in after waking"}</span></button>
    <button class="tile" data-quick="steps"><div class="ic">${I.steps}</div><b class="num">${day.steps != null ? (day.steps / 1000).toFixed(1) + "k" : "–"}<small> / ${tg.steps / 1000}k</small></b><span class="sub">Steps</span></button>
  </div>
  ${wplan ? `<section class="card"><div class="card-head"><h2>Today's plan</h2><button class="link" data-go="train">Open</button></div><b>${esc(wplan.title)}</b><p class="small muted" style="margin:4px 0 0">${[wplan.muaythai ? "Muay Thai: " + esc(wplan.muaythai) : "", (wplan.gym || []).length ? `${wplan.gym.length} gym exercises` : ""].filter(Boolean).join(" · ") || "Rest and recover"}</p></section>` : ""}
  <section class="card"><div class="card-head"><h2>Food</h2><span class="small muted">${r0(t.kcal)} kcal · P ${r0(t.p)} · C ${r0(t.c)} · F ${r0(t.f)}</span></div>
    ${day.meals.length ? Object.entries(groups).map(([g, ms]) => `<div class="meal-h">${esc(g)}</div>${ms.map(m => `<div class="entry"><div class="n"><div>${esc(m.name)}<span class="badge ${m.src === "ref" ? "ref" : ""}">${m.src === "ref" ? "REF" : m.src === "you" ? "YOU" : "EST"}</span></div><small>${r0(m.grams)} g${m.assumption ? " · " + esc(m.assumption) : ""}</small></div><div class="k"><b>${r0(foodKcal(m))}</b> kcal<small>P ${r0(foodM(m, "p"))} · C ${r0(foodM(m, "c"))} · F ${r0(foodM(m, "f"))}</small></div><button class="del" data-del="meals" data-id="${m.id}" aria-label="Delete ${esc(m.name)}">${I.trash}</button></div>`).join("")}`).join("")
    : `<p class="empty">Tap + and type, say, or snap what you ate. Example: "200 g rice, 175 g grilled chicken no oil, 1 boiled carrot".</p>`}
  </section>
  <section class="card"><div class="card-head"><h2>Training</h2><span class="small muted">${r0(t.min)} min · ~${r0(t.burn)} kcal</span></div>
    ${day.workouts.length ? day.workouts.map(w => `<div class="entry"><div class="n"><div>${esc(w.name)}</div><small>${esc(w.detail || w.type)}</small></div><div class="k"><b>${r0(w.minutes)}</b> min<small>~${r0(woKcal(w))} kcal</small></div><button class="del" data-del="workouts" data-id="${w.id}" aria-label="Delete ${esc(w.name)}">${I.trash}</button></div>`).join("")
    : `<p class="empty">Log training like "3 × 15 hip thrusts at 30 kg, 2 hours Muay Thai technique".</p>`}
  </section>
  <p class="tiny faint" style="text-align:center;margin:0">REF = counted from USDA/IFCT reference values · EST = AI estimate · YOU = your numbers</p>`;
}
function mountToday(){
  bindGo();
  app.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const d = getDay(today()); d[b.dataset.del] = d[b.dataset.del].filter(x => x.id !== b.dataset.id); saveDay(d); render(); toast("Deleted");
  });
  app.querySelectorAll("[data-quick]").forEach(b => b.onclick = () => quickSheet(b.dataset.quick));
  $("#dismissInstall")?.addEventListener("click", () => { store.set("installHidden", true); render(); });
}
function installBanner(){
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone || store.get("installHidden")) return "";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="banner"><div style="flex:1"><b>Install Fight Camp</b><br><span class="muted">${ios ? "In Safari tap Share, then <b>Add to Home Screen</b>. It opens full screen and works offline." : "Use your browser menu → Install app / Add to Home screen."}</span></div><button class="del" id="dismissInstall" aria-label="Hide">${I.x}</button></div>`;
}

function quickSheet(kind){
  const d = getDay(today());
  if (kind === "water"){
    openSheet("Add water", `<div class="grid3">${[250, 500, 750].map(v => `<button class="btn ghost" data-w="${v}">+${v} ml</button>`).join("")}</div>
      <label class="field"><span>Other amount</span><div class="unitwrap"><input class="input" id="wOther" type="number" inputmode="numeric" placeholder="e.g. 330"><span class="u">ml</span></div></label>
      <button class="btn block" id="wSave">Add</button><button class="btn ghost block" id="wUndo">Remove 250 ml</button>`, body => {
      const add = v => { const x = getDay(today()); x.water_ml = Math.max(0, n(x.water_ml) + v); saveDay(x); closeSheet(); render(); toast(`${v > 0 ? "Added" : "Removed"} ${Math.abs(v)} ml`); };
      body.querySelectorAll("[data-w]").forEach(b => b.onclick = () => add(+b.dataset.w));
      body.querySelector("#wSave").onclick = () => { const v = n(body.querySelector("#wOther").value); if (v > 0) add(v); };
      body.querySelector("#wUndo").onclick = () => add(-250);
    });
  }
  if (kind === "sleep"){
    openSheet("Last night's sleep", `<label class="field"><span>Hours slept</span><div class="unitwrap"><input class="input" id="sH" type="number" step="0.25" inputmode="decimal" value="${d.sleep_h ?? ""}" placeholder="7.5"><span class="u">h</span></div></label>
      <div class="field"><span>How rested do you feel?</span><div class="seg" id="sQ">${[1, 2, 3, 4, 5].map(q => `<button data-q="${q}" class="${d.sleep_q === q ? "on" : ""}">${q}</button>`).join("")}</div></div>
      <p class="small muted" style="margin:0">1 = exhausted, 5 = fully recovered.</p><button class="btn block" id="sSave">Save</button>`, body => {
      let q = d.sleep_q;
      body.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { q = +b.dataset.q; body.querySelectorAll("[data-q]").forEach(x => x.classList.toggle("on", x === b)); });
      body.querySelector("#sSave").onclick = () => { const h = n(body.querySelector("#sH").value); if (!(h > 0 && h < 16)) return toast("Enter hours between 0 and 16"); const x = getDay(today()); x.sleep_h = h; x.sleep_q = q; saveDay(x); closeSheet(); render(); toast("Sleep saved"); };
    });
  }
  if (kind === "weight"){
    openSheet("Weigh-in", `<label class="field"><span>Morning weight, after the toilet, before food</span><div class="unitwrap"><input class="input" id="wt" type="number" step="0.1" inputmode="decimal" value="${d.weight ?? ""}" placeholder="${r1(weightNow())}"><span class="u">kg</span></div></label>
      <p class="small muted" style="margin:0">Daily weight jumps around with water and food. Progress uses your 7-day average.</p><button class="btn block" id="wtSave">Save</button>`, body => {
      body.querySelector("#wtSave").onclick = () => { const v = n(body.querySelector("#wt").value); if (!(v > 25 && v < 250)) return toast("Enter your weight in kg"); const x = getDay(today()); x.weight = r1(v); saveDay(x); closeSheet(); render(); toast("Weight saved"); };
    });
  }
  if (kind === "steps"){
    openSheet("Steps today", `<label class="field"><span>From your phone's Health app</span><input class="input" id="st" type="number" inputmode="numeric" value="${d.steps ?? ""}" placeholder="8000"></label><button class="btn block" id="stSave">Save</button>`, body => {
      body.querySelector("#stSave").onclick = () => { const v = r0(body.querySelector("#st").value); if (!(v >= 0)) return; const x = getDay(today()); x.steps = v; saveDay(x); closeSheet(); render(); toast("Steps saved"); };
    });
  }
}

/* ---------------- LOGGING ---------------- */
function openLog(prefill = ""){
  let rec = null, audio = null, images = [];
  openSheet("Log anything", `
    <textarea class="input" id="logText" placeholder="ate 200 g rice, 175 g grilled chicken breast no oil, 1 boiled carrot&#10;did 3 × 15 hip thrusts at 30 kg, 2 h Muay Thai technique&#10;slept 7 h, drank 2 bottles water">${esc(prefill)}</textarea>
    <div class="composer-tools">
      <button class="tool" id="recBtn">${I.mic}<span>Speak</span></button>
      <label class="tool" for="photoIn">${I.cam}<span>Photo</span></label>
      <input type="file" id="photoIn" accept="image/*" multiple hidden>
    </div>
    <div class="thumbs" id="thumbs"></div>
    <p class="small muted" id="audioNote" style="margin:0" hidden></p>
    <p class="small muted" style="margin:0">Weights help accuracy most. Say if something was cooked in oil, and how much if you know. For photos, add a note like "1 plate, 2 rotis".</p>
    <div class="err" id="logErr"></div>
    <button class="btn block" id="analyze">Check and count</button>`, (body, sh) => {
    const ta = body.querySelector("#logText"), recBtn = body.querySelector("#recBtn"), err = body.querySelector("#logErr");
    sh.onClose = () => rec && rec.cancel();
    if (!hasKey()) err.innerHTML = `Food counting needs your free Gemini key. <button class="link" style="color:var(--accent);font-weight:700" id="goKey">Add it</button>`;
    body.querySelector("#goKey")?.addEventListener("click", () => { closeSheet(); tab = "me"; render(); setTimeout(() => keySheet(), 300); });
    recBtn.onclick = async () => {
      err.textContent = "";
      if (rec){ recBtn.disabled = true; audio = await rec.stop(); rec = null; recBtn.classList.remove("rec"); recBtn.disabled = false; recBtn.innerHTML = `${I.mic}<span>Re-record</span>`;
        const an = body.querySelector("#audioNote"); an.hidden = false; an.textContent = `Voice note ready (${Math.round(audio.seconds)} s). It will be transcribed and counted.`; return; }
      try { rec = new Recorder(); await rec.start(); recBtn.classList.add("rec"); recBtn.innerHTML = `<span class="pulse"></span><span>Tap to stop</span>`; }
      catch { rec = null; err.textContent = "Microphone blocked. Allow it in Settings, or use the mic on your keyboard."; }
    };
    body.querySelector("#photoIn").onchange = async e => {
      for (const f of [...e.target.files].slice(0, 3 - images.length)){ try { images.push(await shrinkImage(f)); } catch { err.textContent = "Couldn't read that photo."; } }
      drawThumbs();
    };
    function drawThumbs(){
      const th = body.querySelector("#thumbs");
      th.innerHTML = images.map((im, i) => `<div><img src="${im.preview}" alt="Food photo ${i + 1}"><button data-rm="${i}" aria-label="Remove photo">×</button></div>`).join("");
      th.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { images.splice(+b.dataset.rm, 1); drawThumbs(); });
    }
    body.querySelector("#analyze").onclick = async () => {
      if (rec){ audio = await rec.stop(); rec = null; }
      const text = ta.value.trim();
      if (!text && !audio && !images.length){ err.textContent = "Type, record or add a photo first."; return; }
      if (!hasKey()){ err.textContent = "Add your Gemini key first (Me → AI coach)."; return; }
      const parts = [];
      parts.push({ text: `Local time ${hhmm()}, ${WD[new Date().getDay()]} ${today()}. Diet type: ${profile().diet}. Cuisine: ${profile().cuisine}.\n${text ? "Typed log: " + text : ""}${audio ? "\nThe voice recording is the log. Transcribe it into \"transcript\" first." : ""}${images.length ? `\n${images.length} photo(s) of food attached.` : ""}` });
      if (audio) parts.push({ inlineData: { mimeType: audio.mimeType, data: audio.data } });
      images.forEach(im => parts.push({ inlineData: { mimeType: im.mimeType, data: im.data } }));
      body.innerHTML = `<div class="loading"><div class="spinner"></div><div>Counting carefully…</div><div class="small">Matching foods to reference values</div></div>`;
      try {
        const res = await ask({ system: logSystem(), parts, json: true, temperature: 0.1, mode: "fast", timeoutMs: 30000 });
        review(res, text);
      } catch (e){
        closeSheet(true); openLog(text); setTimeout(() => { const er = $("#logErr"); if (er) er.textContent = e.message || "Something went wrong. Try again."; }, 50);
      }
    };
  });
}

function normalizeLog(res){
  const foods = (res.foods || []).filter(f => f && f.name).map(f => {
    const ref = f.match && FOODS[f.match];
    const per100 = ref ? { kcal: ref.kcal, p: ref.p, c: ref.c, f: ref.f, fiber: n(f.per100?.fiber) } : { kcal: n(f.per100?.kcal), p: n(f.per100?.p), c: n(f.per100?.c), f: n(f.per100?.f), fiber: n(f.per100?.fiber) };
    return { id: uid(), name: String(f.name).slice(0, 70), grams: Math.max(0, r0(f.grams)), per100, src: ref ? "ref" : "ai", ref: ref ? f.match : null, conf: f.confidence || "medium", assumption: String(f.assumption || "").slice(0, 120), meal: res.meal || mealGuess(), time: hhmm() };
  }).filter(f => f.per100.kcal >= 0 && f.per100.kcal <= 950);
  const exercises = (res.exercises || []).filter(e => e && e.name).map(e => ({
    id: uid(), name: String(e.name).slice(0, 60), key: e.key || null, type: e.type || "other", sets: e.sets ?? null, reps: e.reps ?? null, weight_kg: e.weight_kg ?? null,
    minutes: Math.max(1, r0(e.minutes || (n(e.sets) * 2.5) || 10)), met: Math.min(16, Math.max(1.5, n(e.met) || 4)), detail: String(e.detail || "").slice(0, 80), time: hhmm() }));
  return { foods, exercises, water: n(res.water_ml) > 0 ? r0(res.water_ml) : 0, sleep: n(res.sleep_h) > 0 ? r1(res.sleep_h) : null, sleepQ: res.sleep_quality || null,
    weight: n(res.weight_kg) > 25 ? r1(res.weight_kg) : null, steps: n(res.steps) > 0 ? r0(res.steps) : null,
    meas: res.measurements_cm && typeof res.measurements_cm === "object" ? Object.fromEntries(Object.entries(res.measurements_cm).filter(([, v]) => n(v) > 5).map(([k, v]) => [k, r1(v)])) : null,
    offset: Math.min(0, Math.max(-7, r0(res.day_offset))), questions: (res.questions || []).slice(0, 2), transcript: res.transcript || "", note: res.note || "" };
}
function mealGuess(){ const h = new Date().getHours(); return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 18 ? "snack" : "dinner"; }

function review(res, typed, onSaved){
  const L = normalizeLog(res);
  const date = ymd(new Date(Date.now() + L.offset * DAY));
  const empty = !L.foods.length && !L.exercises.length && !L.water && L.sleep == null && L.weight == null && L.steps == null && !(L.meas && Object.keys(L.meas).length);
  const draw = () => {
    const tk = L.foods.reduce((a, f) => a + foodKcal(f), 0), tp = L.foods.reduce((a, f) => a + foodM(f, "p"), 0);
    return `${L.transcript ? `<div class="small muted">Heard: “${esc(L.transcript)}”</div>` : ""}
      ${L.offset ? `<div class="question">This will be saved to ${parseD(date).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}.</div>` : ""}
      ${L.questions.map(q => `<div class="question"><b>Check:</b> ${esc(q)} <span class="muted">Adjust grams below, or redo with more detail.</span></div>`).join("")}
      ${L.foods.map((f, i) => `<div class="rv" data-f="${i}"><div class="rv-top"><div><b>${esc(f.name)}</b> <span class="badge ${f.src === "ref" ? "ref" : ""}">${f.src === "ref" ? "REF" : "EST"}</span>${f.conf === "low" ? ' <span class="badge">LOW CONFIDENCE</span>' : ""}<div class="small muted">${f.src === "ref" ? "Counted from " + esc(FOODS[f.ref].name) : "AI estimate per 100 g: " + r0(f.per100.kcal) + " kcal"}</div></div><button class="del" data-rmf="${i}" aria-label="Remove">${I.trash}</button></div>
        <div class="grams"><input type="number" inputmode="decimal" value="${f.grams}" data-g="${i}" aria-label="Grams of ${esc(f.name)}"><span class="muted">grams</span></div>
        <div class="mac"><div><b>${r0(foodKcal(f))}</b><span>kcal</span></div><div><b>${r1(foodM(f, "p"))}</b><span>protein</span></div><div><b>${r1(foodM(f, "c"))}</b><span>carbs</span></div><div><b>${r1(foodM(f, "f"))}</b><span>fat</span></div></div>
        ${f.assumption ? `<div class="note">${esc(f.assumption)}</div>` : ""}</div>`).join("")}
      ${L.foods.length ? `<div class="totals"><span class="muted">Food total</span><span><b class="num">${r0(tk)}</b> kcal · <b class="num">${r0(tp)}</b> g protein</span></div>
        <div class="field"><span>Meal</span><div class="seg" id="mealSeg">${["breakfast", "lunch", "snack", "dinner", "pre-workout", "post-workout"].map(m => `<button data-m="${m}" class="${L.foods[0].meal === m ? "on" : ""}">${m}</button>`).join("")}</div></div>` : ""}
      ${L.exercises.map((e, i) => `<div class="rv"><div class="rv-top"><div><b>${esc(e.name)}</b><div class="small muted">${esc(e.detail || e.type)}</div></div><button class="del" data-rme="${i}" aria-label="Remove">${I.trash}</button></div>
        <div class="grams"><input type="number" inputmode="numeric" value="${e.minutes}" data-min="${i}" aria-label="Minutes"><span class="muted">minutes · ~${r0(woKcal(e))} kcal (MET ${e.met})</span></div></div>`).join("")}
      ${[L.water ? `Water +${L.water} ml` : "", L.sleep != null ? `Sleep ${L.sleep} h${L.sleepQ ? `, quality ${L.sleepQ}/5` : ""}` : "", L.weight != null ? `Weight ${L.weight} kg` : "", L.steps != null ? `Steps ${L.steps.toLocaleString()}` : "", L.meas && Object.keys(L.meas).length ? `Measurements: ${Object.entries(L.meas).map(([k, v]) => `${k} ${v} cm`).join(", ")}` : ""].filter(Boolean).map(s => `<div class="rv"><b>${esc(s)}</b></div>`).join("")}
      ${empty ? `<p class="empty">I couldn't find anything to log in that. Try again with foods and amounts.</p>` : ""}
      <div class="row" style="gap:10px"><button class="btn ghost" id="redo">Edit</button><button class="btn" style="flex:1" id="save" ${empty ? "disabled" : ""}>Save to log</button></div>`;
  };
  openSheet("Check before saving", draw(), function mount(body){
    const rerender = () => { body.innerHTML = draw(); mount(body); };
    body.querySelectorAll("[data-g]").forEach(inp => inp.oninput = () => {
      const f = L.foods[+inp.dataset.g]; f.grams = Math.max(0, n(inp.value));
      const box = inp.closest(".rv").querySelector(".mac");
      box.innerHTML = `<div><b>${r0(foodKcal(f))}</b><span>kcal</span></div><div><b>${r1(foodM(f, "p"))}</b><span>protein</span></div><div><b>${r1(foodM(f, "c"))}</b><span>carbs</span></div><div><b>${r1(foodM(f, "f"))}</b><span>fat</span></div>`;
      const tk = L.foods.reduce((a, x) => a + foodKcal(x), 0), tp = L.foods.reduce((a, x) => a + foodM(x, "p"), 0);
      const tot = body.querySelector(".totals"); if (tot) tot.innerHTML = `<span class="muted">Food total</span><span><b class="num">${r0(tk)}</b> kcal · <b class="num">${r0(tp)}</b> g protein</span>`;
    });
    body.querySelectorAll("[data-min]").forEach(inp => inp.onchange = () => { L.exercises[+inp.dataset.min].minutes = Math.max(1, r0(inp.value)); rerender(); });
    body.querySelectorAll("[data-rmf]").forEach(b => b.onclick = () => { L.foods.splice(+b.dataset.rmf, 1); rerender(); });
    body.querySelectorAll("[data-rme]").forEach(b => b.onclick = () => { L.exercises.splice(+b.dataset.rme, 1); rerender(); });
    body.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { L.foods.forEach(f => f.meal = b.dataset.m); body.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x === b)); });
    body.querySelector("#redo").onclick = () => { closeSheet(true); openLog(typed || L.transcript); };
    body.querySelector("#save").onclick = () => {
      const d = getDay(date);
      d.meals.push(...L.foods.filter(f => f.grams > 0));
      d.workouts.push(...L.exercises);
      if (L.water) d.water_ml = n(d.water_ml) + L.water;
      if (L.sleep != null){ d.sleep_h = L.sleep; if (L.sleepQ) d.sleep_q = L.sleepQ; }
      if (L.weight != null) d.weight = L.weight;
      if (L.steps != null) d.steps = L.steps;
      if (L.meas && Object.keys(L.meas).length) d.measurements = Object.assign({}, d.measurements || {}, L.meas);
      saveDay(d); closeSheet(); toast("Saved"); onSaved && onSaved(L); render();
    };
  });
}

/* ---------------- TRAIN ---------------- */
let trainCat = "plan", planDay = WD[new Date().getDay()];
const exByKey = k => EXERCISES.find(e => e.key === k);
const media = k => MEDIA[k] || {};
function viewTrain(){
  const plan = store.get("plan"), p = profile();
  const cats = [["plan", "My plan"], ...CATEGORIES.map(c => [c.id, c.name])];
  let body = "";
  if (trainCat === "plan"){
    if (!plan){
      body = `<section class="card"><h2>Your weekly plan</h2><p class="muted small">Built from your setup: ${p.mtDays} Muay Thai sessions, ${p.gymDays} gym days, ${esc(p.gymExp === "new" ? "new to lifting" : "experienced")}, focus on ${esc((p.focus || []).join(", ") || "overall")}.</p><div class="err" id="planErr"></div><button class="btn block" id="makePlan">Build my plan</button></section>`;
    } else {
      const d = plan.week.find(x => x.day === planDay) || plan.week[0];
      body = `<div class="days">${WD.slice(1).concat("Sun").map(w => { const x = plan.week.find(y => y.day === w); return `<button data-day="${w}" class="${w === planDay ? "on" : ""} ${w === WD[new Date().getDay()] ? "today" : ""}">${w}<b>${x && (x.gym || []).length ? "G" : ""}${x && x.muaythai ? "MT" : ""}${x && !(x.gym || []).length && !x.muaythai ? "–" : ""}</b></button>`; }).join("")}</div>
      <section class="card"><div class="card-head"><h2>${esc(d.title)}</h2><span class="small muted">${esc(d.day)}</span></div>
        ${d.muaythai ? `<p class="small" style="margin:0 0 8px"><b>Muay Thai:</b> ${esc(d.muaythai)}</p>` : ""}
        ${(d.gym || []).map(g => { const e = exByKey(g.key); if (!e) return ""; return `<button class="plan-ex" data-ex="${g.key}"><div><b>${esc(e.name)}</b><div class="small muted">${g.sets} × ${esc(g.reps)} · rest ${r0(g.rest_s)} s${g.note ? " · " + esc(g.note) : ""}</div></div><span class="faint">${I.chev}</span></button>`; }).join("") || `<p class="empty">No gym today.</p>`}
        ${d.tip ? `<div class="tip" style="margin-top:12px"><div class="dot">C</div><p>${esc(d.tip)}</p></div>` : ""}
      </section>
      <section class="card"><h2 style="margin-bottom:8px">How to progress</h2><ul class="why">${(plan.progression || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>
      ${(plan.meals || []).length ? `<section class="card"><h2 style="margin-bottom:8px">Meal ideas for your day</h2>${plan.meals.map(m => `<div class="entry" style="grid-template-columns:1fr auto"><div class="n"><div>${esc(m.slot)}</div><small>${esc(m.idea)}</small></div><div class="k"><b>${r0(m.protein_g)} g</b> P<small>${r0(m.kcal)} kcal</small></div></div>`).join("")}</section>` : ""}
      ${(plan.sleep || []).length ? `<section class="card"><h2 style="margin-bottom:8px">Sleep</h2><ul class="why">${plan.sleep.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
      <div class="err" id="planErr"></div><button class="btn ghost block" id="makePlan">Rebuild plan</button>`;
    }
  } else {
    const c = CATEGORIES.find(x => x.id === trainCat);
    const focus = p.focus || [];
    const list = EXERCISES.filter(e => e.cat === trainCat).sort((a, b) => (b.focus.some(f => focus.includes(f)) - a.focus.some(f => focus.includes(f))));
    body = `<p class="muted small" style="margin:0 2px">${esc(c.blurb)}. Tap an exercise for the video and form cues.</p>
      ${list.map(e => { const m = media(e.key); return `<button class="ex" data-ex="${e.key}"><div class="thumb">${m.images?.[0] ? `<img src="${m.images[0]}" alt="" loading="lazy">` : I.play}</div><div class="info"><b>${esc(e.name)}</b><span>${esc(e.primary.join(", "))}</span>${e.focus.some(f => focus.includes(f)) ? `<span class="foryou">For your goals</span>` : ""}</div><span class="go">${I.chev}</span></button>`; }).join("")}`;
  }
  return `${header("Train", "Plan, exercises and form videos")}<div class="seg-tabs">${cats.map(([id, nm]) => `<button data-cat="${id}" class="${trainCat === id ? "on" : ""}">${nm}</button>`).join("")}</div>${body}`;
}
function mountTrain(){
  bindGo();
  app.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { trainCat = b.dataset.cat; render(); });
  app.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { planDay = b.dataset.day; render(); });
  app.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => exerciseSheet(b.dataset.ex));
  const mk = $("#makePlan");
  if (mk) mk.onclick = async () => {
    if (!hasKey()){ $("#planErr").textContent = "Add your free Gemini key in Me → AI coach first."; return; }
    mk.disabled = true; mk.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Building your plan…`;
    try {
      const plan = await ask({ system: planSystem(profile()), parts: [{ text: `Build my plan. Today is ${WD[new Date().getDay()]} ${today()}. I do Muay Thai on exactly ${profile().mtDays} days a week${(profile().mtWhich || []).length ? ` (${profile().mtWhich.join(", ")})` : ""}, so ${7 - profile().mtDays} days have "muaythai": null, and the gym on ${profile().gymDays} days.` }], json: true, temperature: 0.4, mode: "smart", timeoutMs: 60000 });
      if (!Array.isArray(plan.week) || !plan.week.length) throw new AIError("bad", "The plan came back incomplete. Try again.");
      plan.week.forEach(d => d.gym = (d.gym || []).filter(g => exByKey(g.key)));
      fixMuayThaiDays(plan, profile());
      plan.made = today(); store.set("plan", plan); render(); toast("Plan ready");
    } catch (e){ $("#planErr").textContent = e.message; mk.disabled = false; mk.textContent = "Try again"; }
  };
}
// The AI sometimes adds extra Muay Thai days. Make the plan match what you told us.
function fixMuayThaiDays(plan, p){
  const label = `${p.trainTime || "Evening"}, ${({ technique: "technique", pads: "pads and bag", hard: "sparring / hard rounds" })[p.mtType] || "class"}, ${p.mtHours} h`;
  const which = p.mtWhich || [];
  if (which.length){
    plan.week.forEach(d => { if (which.includes(d.day)){ if (!d.muaythai) d.muaythai = label; } else d.muaythai = null; });
  } else {
    let extra = plan.week.filter(d => d.muaythai).length - n(p.mtDays);
    const byPref = [...plan.week].sort((a, b) => ((a.gym || []).length - (b.gym || []).length) || (a.day === "Sun" ? -1 : 0));
    for (const d of byPref){ if (extra <= 0) break; if (d.muaythai){ d.muaythai = null; extra--; } }
  }
  plan.week.forEach(d => { if (!d.muaythai && !(d.gym || []).length){ d.title = "Rest and recover"; } });
}
function exerciseSheet(key){
  const e = exByKey(key), m = media(key);
  const plan = store.get("plan"); let pres = null;
  plan?.week?.forEach(d => (d.gym || []).forEach(g => { if (g.key === key && !pres) pres = { ...g, day: d.day }; }));
  openSheet(e.name, `
    ${m.youtube ? `<div class="video" id="vid"><button style="position:absolute;inset:0;display:grid;place-items:center;width:100%" id="playVid" aria-label="Play form video">${m.images?.[0] ? `<img src="${m.images[0]}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45">` : ""}<span style="position:relative;width:62px;height:62px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:grid;place-items:center">${I.play}</span></button></div>
      <p class="tiny faint" style="margin:-6px 0 0">Video: ${esc(m.video_title || "")} · ${esc(m.channel || "")}</p>` : ""}
    <div class="field"><span>Target muscles</span><div class="muscles">${e.primary.map(x => `<span class="mus">${esc(x)}</span>`).join("")}${e.secondary.map(x => `<span class="mus sec">${esc(x)}</span>`).join("")}</div></div>
    ${m.images?.length ? `<div class="photos">${m.images.slice(0, 2).map((src, i) => `<img src="${src}" alt="${esc(e.name)} ${i ? "end" : "start"} position" loading="lazy">`).join("")}</div>` : ""}
    <div class="grid2"><div class="stat"><span>Equipment</span><b style="font-size:14px">${esc(e.equipment)}</b></div><div class="stat"><span>Level</span><b style="font-size:14px">${esc(e.level)}</b></div></div>
    ${pres ? `<div class="question">In your plan (${esc(pres.day)}): <b>${pres.sets} × ${esc(pres.reps)}</b>, rest ${r0(pres.rest_s)} s.</div>` : ""}
    <div class="field"><span>How to do it</span><ol class="cues">${e.cues.map(c => `<li>${esc(c)}</li>`).join("")}</ol></div>
    <div class="field"><span>Common mistake</span><p style="margin:0">${esc(e.mistake)}</p></div>
    <div class="card tight" style="background:var(--s2)"><b>Log this</b><div class="grid3" style="margin-top:10px">
      <label class="field"><span>Sets</span><input class="input" id="lSets" type="number" inputmode="numeric" value="${pres?.sets || 3}"></label>
      <label class="field"><span>Reps</span><input class="input" id="lReps" type="number" inputmode="numeric" value="${parseInt(pres?.reps) || 12}"></label>
      <label class="field"><span>kg</span><input class="input" id="lKg" type="number" inputmode="decimal" placeholder="0"></label></div>
      <button class="btn block" id="lSave" style="margin-top:12px">Add to today</button></div>`, body => {
    body.querySelector("#playVid")?.addEventListener("click", () => {
      body.querySelector("#vid").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.youtube)}?autoplay=1&playsinline=1&rel=0&modestbranding=1" title="${esc(e.name)} form video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    });
    body.querySelector("#lSave").onclick = () => {
      const s = r0(body.querySelector("#lSets").value), rp = r0(body.querySelector("#lReps").value), kg = n(body.querySelector("#lKg").value);
      if (!(s > 0)) return toast("Enter sets");
      const d = getDay(today());
      d.workouts.push({ id: uid(), name: e.name, key, type: "strength", sets: s, reps: rp, weight_kg: kg || null, minutes: Math.round(s * 2.5), met: 3.5, detail: `${s} × ${rp}${kg ? ` @ ${kg} kg` : ""}`, time: hhmm() });
      saveDay(d); closeSheet(); toast(`${e.name} logged`); if (tab === "today") render();
    };
  });
}

/* ---------------- COACH ---------------- */
function coachContext(){
  const tg = profile().targets, d = getDay(today()), t = totals(d);
  const last7 = [];
  for (let i = 1; i <= 7; i++){ const k = ymd(new Date(Date.now() - i * DAY)), x = getDay(k), tt = totals(x);
    if (x.meals.length || x.workouts.length || x.weight != null || x.sleep_h != null) last7.push(`${k}: ${r0(tt.kcal)} kcal, P${r0(tt.p)} C${r0(tt.c)} F${r0(tt.f)}, train ${r0(tt.min)} min (${x.workouts.map(w => w.name).join(", ") || "none"}), water ${r1(x.water_ml / 1000)} L, sleep ${x.sleep_h ?? "?"} h${x.weight != null ? ", weight " + x.weight : ""}`); }
  const ws = allDays().filter(k => getDay(k).weight != null).slice(-14).map(k => `${k} ${getDay(k).weight}`).join(", ");
  const meas = allDays().filter(k => getDay(k).measurements).slice(-2).map(k => `${k}: ${JSON.stringify(getDay(k).measurements)}`).join("; ");
  const plan = store.get("plan"); const pd = plan?.week?.find(x => x.day === WD[new Date().getDay()]);
  return `NOW: ${WD[new Date().getDay()]} ${today()} ${hhmm()}.
TODAY SO FAR: ${r0(t.kcal)}/${tg.kcal} kcal, protein ${r0(t.p)}/${tg.protein} g, carbs ${r0(t.c)}, fat ${r0(t.f)}, training ${r0(t.min)} min (~${r0(t.burn)} kcal), water ${d.water_ml}/${tg.water_ml} ml, sleep last night ${d.sleep_h ?? "not logged"} h, steps ${d.steps ?? "not logged"}.
Today's food: ${d.meals.map(m => `${m.name} ${r0(m.grams)} g (${r0(foodKcal(m))} kcal)`).join("; ") || "none yet"}.
Today's training: ${d.workouts.map(w => `${w.name} ${w.detail} ${w.minutes} min`).join("; ") || "none yet"}.
LAST 7 DAYS:\n${last7.join("\n") || "no data yet"}
WEIGH-INS: ${ws || "none yet"}. CURRENT WEIGHT: ${weightNow()} kg.
LATEST MEASUREMENTS: ${meas || "none yet"}.
TODAY'S PLAN: ${pd ? `${pd.title}; Muay Thai ${pd.muaythai || "none"}; gym ${(pd.gym || []).map(g => `${exByKey(g.key)?.name} ${g.sets}x${g.reps}`).join(", ") || "none"}` : plan ? "rest" : "no plan built yet"}.`;
}
function md(text){
  const lines = esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").split(/\n/);
  let out = "", ul = false;
  lines.forEach(l => { const m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);
    if (m){ if (!ul){ out += "<ul>"; ul = true; } out += `<li>${m[1]}</li>`; } else { if (ul){ out += "</ul>"; ul = false; } if (l.trim()) out += `<p>${l}</p>`; } });
  return out + (ul ? "</ul>" : "");
}
let chatBusy = false;
function viewCoach(){
  const chat = store.get("chat", []);
  const p = profile();
  return `${header("Coach", "Corner knows your goals, logs and plan")}
  <div class="chat" id="chat">${chat.length ? chat.map(m => `<div class="msg ${m.role === "user" ? "me" : "bot"}${m.err ? " err" : ""}">${m.img ? `<img src="${m.img}" alt="Photo you sent">` : ""}${m.role === "user" ? `<p>${esc(m.text)}</p>` : md(m.text)}${m.logged ? `<div class="logged">✓ ${esc(m.logged)}</div>` : ""}</div>`).join("")
    : `<div class="msg bot"><p>Hi ${esc(p.name || "")}! I'm Corner, your coach. I know your targets, your Muay Thai schedule and everything you log.</p><p>Ask me anything, or tell me what you ate or trained and I'll log it.</p></div>`}
    ${chatBusy ? `<div class="msg bot"><p class="muted">Thinking…</p></div>` : ""}</div>
  <div class="chips scroll" style="margin-top:4px">${["What should I eat for the rest of today?", "Am I on track this week?", "I have Muay Thai tonight. What do I eat before?", "Why isn't my weight going up?", "Give me a 20-min glute finisher"].map(q => `<button class="chip" data-ask="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <div style="height:70px"></div>
  <div class="chatbar"><div class="chatbar-in">
    <label class="round" for="chatPhoto" aria-label="Send a photo">${I.cam}</label><input type="file" id="chatPhoto" accept="image/*" hidden>
    <textarea id="chatIn" rows="1" placeholder="Message Corner"></textarea>
    <button class="round" id="chatMic" aria-label="Record voice">${I.mic}</button>
    <button class="round primary" id="chatSend" aria-label="Send">${I.send}</button>
  </div></div>`;
}
function mountCoach(){
  bindGo();
  window.scrollTo(0, document.body.scrollHeight);
  const ta = $("#chatIn"); let rec = null, img = null;
  ta.oninput = () => { ta.style.height = "auto"; ta.style.height = Math.min(130, ta.scrollHeight) + "px"; };
  app.querySelectorAll("[data-ask]").forEach(b => b.onclick = () => sendChat(b.dataset.ask));
  $("#chatSend").onclick = () => { const v = ta.value.trim(); if (v || img) sendChat(v, null, img); };
  $("#chatPhoto").onchange = async e => { const f = e.target.files[0]; if (!f) return; img = await shrinkImage(f); toast("Photo added. Add a note and send."); $("#chatPhoto").previousElementSibling.style.outline = "2px solid var(--accent)"; };
  $("#chatMic").onclick = async () => {
    const b = $("#chatMic");
    if (rec){ const a = await rec.stop(); rec = null; b.classList.remove("rec"); b.innerHTML = I.mic; sendChat(ta.value.trim(), a, img); return; }
    try { rec = new Recorder(); await rec.start(); b.classList.add("rec"); b.innerHTML = I.stop; toast("Recording. Tap stop to send."); }
    catch { rec = null; toast("Microphone blocked. Use your keyboard's mic instead."); }
  };
}
async function sendChat(text, audio = null, img = null){
  if (chatBusy) return;
  if (!hasKey()){ toast("Add your free Gemini key in Me → AI coach"); tab = "me"; render(); return; }
  const chat = store.get("chat", []);
  const history = chat.filter(m => !m.err).slice(-16).map(m => ({ role: m.role === "user" ? "user" : "model", text: m.text + (m.logged ? `\n[logged: ${m.logged}]` : "") }));
  const um = { role: "user", text: text || (audio ? "🎙 Voice message" : "Photo"), img: img?.preview || null, t: Date.now() };
  chat.push(um); store.set("chat", chat.slice(-60)); chatBusy = true; render();
  const parts = [{ text: text || (audio ? "(voice message attached)" : "(photo attached)") }];
  if (audio) parts.push({ inlineData: { mimeType: audio.mimeType, data: audio.data } });
  if (img) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  try {
    const res = await ask({ system: coachSystem(profile(), coachContext()), parts, history, json: true, temperature: 0.5, mode: "fast", timeoutMs: 30000 });
    const c2 = store.get("chat", []);
    if (audio && res.transcript){ const last = c2[c2.length - 1]; if (last) last.text = res.transcript; }
    const bot = { role: "model", text: String(res.reply || "Done."), t: Date.now() };
    c2.push(bot); store.set("chat", c2.slice(-60)); chatBusy = false; render();
    const lg = res.log;
    if (lg && ((lg.foods || []).length || (lg.exercises || []).length || lg.water_ml || lg.sleep_h || lg.weight_kg || lg.steps || lg.measurements_cm)){
      review(lg, text, L => { const c3 = store.get("chat", []); const b = c3.find(m => m.t === bot.t); if (b){ b.logged = L.note || "Logged"; store.set("chat", c3); } });
    }
  } catch (e){
    const c2 = store.get("chat", []); c2.push({ role: "model", text: e.message || "Something went wrong.", err: true, t: Date.now() }); store.set("chat", c2.slice(-60)); chatBusy = false; render();
  }
}

/* ---------------- PROGRESS ---------------- */
function viewProgress(){
  const p = profile(), tg = p.targets;
  const days = allDays();
  const ws = days.filter(k => getDay(k).weight != null).map(k => ({ k, w: getDay(k).weight }));
  const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const now = Date.now();
  const wk = (from, to) => ws.filter(x => { const a = (now - parseD(x.k)) / DAY; return a >= from && a < to; }).map(x => x.w);
  const a1 = wk(0, 7), a2 = wk(7, 14);
  // weight chart
  const W = 340, H = 180, L = 30, R = 10, T = 12, B = 22;
  const s = parseD(p.startDate).getTime(), g = parseD(p.goalDate).getTime();
  const vals = ws.map(x => x.w).concat([n(p.weight), n(p.goalWeight)]);
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  const xs = t => L + (Math.min(Math.max(t, s), g) - s) / Math.max(1, g - s) * (W - L - R), ys = v => T + (hi - v) / Math.max(1, hi - lo) * (H - T - B);
  let wsvg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight vs goal path">`;
  const stp = hi - lo > 8 ? 2 : 1;
  for (let v = lo; v <= hi; v += stp) wsvg += `<line class="gl" x1="${L}" x2="${W - R}" y1="${ys(v)}" y2="${ys(v)}"/><text class="axis" x="${L - 6}" y="${ys(v) + 3}" text-anchor="end">${v}</text>`;
  [s, (s + g) / 2, g].forEach((t, i) => wsvg += `<text class="axis" x="${xs(t)}" y="${H - 6}" text-anchor="${["start", "middle", "end"][i]}">${new Date(t).toLocaleDateString([], { day: "numeric", month: "short" })}</text>`);
  wsvg += `<line x1="${xs(s)}" y1="${ys(n(p.weight))}" x2="${xs(g)}" y2="${ys(n(p.goalWeight))}" stroke="var(--faint)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  if (ws.length){
    const pts = ws.map(x => [xs(parseD(x.k).getTime()), ys(x.w)]);
    if (pts.length > 1) wsvg += `<polyline points="${pts.map(q => q.join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    const lq = pts[pts.length - 1];
    wsvg += `<circle cx="${lq[0]}" cy="${lq[1]}" r="5" fill="var(--accent)" stroke="var(--s1)" stroke-width="2"/>`;
  } else wsvg += `<text class="axis" x="${W / 2}" y="${H / 2}" text-anchor="middle">Log a morning weigh-in to start</text>`;
  wsvg += `</svg>`;
  // 14-day bars
  const d14 = []; for (let i = 13; i >= 0; i--){ const k = ymd(new Date(now - i * DAY)); const d = getDay(k); d14.push({ k, d, t: totals(d) }); }
  const BW = 340, BH = 150, bl = 30, top = Math.max(tg.kcal * 1.3, ...d14.map(x => x.t.kcal));
  const yb = v => 10 + (1 - v / top) * (BH - 32), slot = (BW - bl - 6) / 14;
  let ksvg = `<svg viewBox="0 0 ${BW} ${BH}" role="img" aria-label="Calories, last 14 days">`;
  [0, tg.kcal].forEach(v => ksvg += `<text class="axis" x="${bl - 5}" y="${yb(v) + 3}" text-anchor="end">${v}</text>`);
  d14.forEach((x, i) => { const cx = bl + i * slot + slot / 2, ok = x.t.kcal >= tg.kcal * 0.9 && x.t.kcal <= tg.kcal * 1.1;
    ksvg += `<rect x="${cx - slot * 0.3}" y="${yb(0) - 2}" width="${slot * 0.6}" height="2" rx="1" fill="var(--s3)"/>`;
    if (x.t.kcal > 0) ksvg += `<rect x="${cx - slot * 0.3}" y="${yb(x.t.kcal)}" width="${slot * 0.6}" height="${yb(0) - yb(x.t.kcal)}" rx="4" fill="${ok ? "var(--r-kcal)" : "var(--s3)"}"/>`;
    if (x.t.kcal > 0 && x.t.p >= tg.protein * 0.95) ksvg += `<circle cx="${cx}" cy="${yb(x.t.kcal) - 7}" r="3" fill="var(--r-protein)"/>`;
    if (i % 3 === 1 || i === 13) ksvg += `<text class="axis" x="${cx}" y="${BH - 6}" text-anchor="middle">${i === 13 ? "today" : parseD(x.k).getDate()}</text>`; });
  ksvg += `<line x1="${bl}" x2="${BW - 6}" y1="${yb(tg.kcal)}" y2="${yb(tg.kcal)}" stroke="var(--faint)" stroke-dasharray="4 4"/></svg>`;
  // sleep bars
  let ssvg = `<svg viewBox="0 0 ${BW} 110" role="img" aria-label="Sleep, last 14 days">`;
  const ysl = v => 8 + (1 - v / 11) * 78;
  d14.forEach((x, i) => { const cx = bl + i * slot + slot / 2, h = x.d.sleep_h;
    if (h != null) ssvg += `<rect x="${cx - slot * 0.3}" y="${ysl(h)}" width="${slot * 0.6}" height="${ysl(0) - ysl(h)}" rx="4" fill="${h >= tg.sleep_h - 0.25 ? "var(--r-train)" : "var(--s3)"}"/>`;
    if (i % 3 === 1 || i === 13) ssvg += `<text class="axis" x="${cx}" y="104" text-anchor="middle">${i === 13 ? "today" : parseD(x.k).getDate()}</text>`; });
  ssvg += `<line x1="${bl}" x2="${BW - 6}" y1="${ysl(tg.sleep_h)}" y2="${ysl(tg.sleep_h)}" stroke="var(--faint)" stroke-dasharray="4 4"/><text class="axis" x="${bl - 5}" y="${ysl(tg.sleep_h) + 3}" text-anchor="end">${tg.sleep_h}h</text></svg>`;
  // week stats
  let kc = 0, pr = 0, nd = 0, min = 0, mt = 0, sl = [], wat = [];
  for (let i = 0; i < 7; i++){ const x = getDay(ymd(new Date(now - i * DAY))), t = totals(x);
    if (x.meals.length){ kc += t.kcal; pr += t.p; nd++; } min += t.min; mt += x.workouts.filter(w => w.type === "muaythai").reduce((a, w) => a + n(w.minutes), 0);
    if (x.sleep_h != null) sl.push(x.sleep_h); if (x.water_ml) wat.push(x.water_ml); }
  // measurements
  const mrows = days.filter(k => getDay(k).measurements).map(k => getDay(k).measurements);
  const first = { shoulders: p.m_shoulders, chest: p.m_chest, waist: p.m_waist, hips: p.m_hips, thigh: p.m_thigh, arm: p.m_arm };
  const latest = Object.assign({}, Object.fromEntries(Object.entries(first).filter(([, v]) => v)));
  mrows.forEach(m => Object.entries(m).forEach(([k, v]) => { if (v){ latest[k] = v; if (!first[k]) first[k] = v; } }));
  const sw = latest.shoulders && latest.waist ? latest.shoulders / latest.waist : null, wh = latest.waist && latest.hips ? latest.waist / latest.hips : null;
  const meter = (v, lo2, hi2, goal) => { const pos = x => Math.min(100, Math.max(0, (x - lo2) / (hi2 - lo2) * 100)); return `<div class="meter"><i style="left:${pos(goal)}%;background:var(--faint)"></i>${v ? `<i style="left:${pos(v)}%;background:var(--accent)"></i>` : ""}</div>`; };
  const MK = [["shoulders", "Shoulders", 1], ["chest", "Chest", 1], ["waist", "Waist", -1], ["hips", "Hips / glutes", 1], ["thigh", "Thigh", 1], ["arm", "Arm", 1]];
  return `${header("Progress", `Goal ${p.goalWeight} kg by ${parseD(p.goalDate).toLocaleDateString([], { day: "numeric", month: "short" })}`)}
  <section class="card"><div class="card-head"><h2>Weight</h2><span class="small muted">${a1.length ? `7-day avg ${r1(avg(a1))} kg` : ""}${a1.length && a2.length ? ` (${avg(a1) - avg(a2) >= 0 ? "+" : ""}${r1(avg(a1) - avg(a2))})` : ""}</span></div><div class="chart">${wsvg}</div>
    <p class="small muted" style="margin:8px 0 0">Dotted line is your path to the goal. Aim for about ${(p.targets.adj * 7 / 7700).toFixed(2)} kg a week.</p></section>
  <div class="grid2">
    <div class="tile"><span class="sub">Avg calories (7d)</span><b class="num">${nd ? r0(kc / nd) : "–"}</b><span class="sub">target ${tg.kcal}</span></div>
    <div class="tile"><span class="sub">Avg protein (7d)</span><b class="num">${nd ? r0(pr / nd) + " g" : "–"}</b><span class="sub">target ${tg.protein} g</span></div>
    <div class="tile"><span class="sub">Training (7d)</span><b class="num">${r1(min / 60)} h</b><span class="sub">${r1(mt / 60)} h Muay Thai</span></div>
    <div class="tile"><span class="sub">Avg sleep (7d)</span><b class="num">${sl.length ? r1(avg(sl)) + " h" : "–"}</b><span class="sub">target ${tg.sleep_h} h</span></div>
  </div>
  <section class="card"><div class="card-head"><h2>Calories</h2><span class="small muted">14 days · dot = protein hit</span></div><div class="chart">${ksvg}</div></section>
  <section class="card"><div class="card-head"><h2>Sleep</h2><span class="small muted">14 days</span></div><div class="chart">${ssvg}</div></section>
  <section class="card"><div class="card-head"><h2>Shape</h2><button class="link" id="measBtn">Update</button></div>
    <div class="grid2">
      <div class="ratio"><span class="sub muted small">Shoulders ÷ waist</span><br><b class="num" style="font-size:22px">${sw ? sw.toFixed(2) : "–"}</b>${meter(sw, 1.1, 1.7, 1.45)}<span class="tiny faint">V-taper goal 1.45</span></div>
      <div class="ratio"><span class="sub muted small">Waist ÷ hips</span><br><b class="num" style="font-size:22px">${wh ? wh.toFixed(2) : "–"}</b>${meter(wh, 0.6, 0.9, 0.7)}<span class="tiny faint">Hourglass goal 0.70</span></div>
    </div>
    ${Object.keys(latest).length ? `<table style="margin-top:12px"><thead><tr><th>cm</th><th class="r">Start</th><th class="r">Now</th><th class="r">Change</th></tr></thead><tbody>${MK.map(([k, l, dir]) => latest[k] ? `<tr><td>${l}</td><td class="r">${r1(first[k])}</td><td class="r">${r1(latest[k])}</td><td class="r" style="color:${(latest[k] - first[k]) * dir > 0 ? "var(--good)" : (latest[k] - first[k]) ? "var(--bad)" : "var(--muted)"}">${latest[k] - first[k] >= 0 ? "+" : ""}${r1(latest[k] - first[k])}</td></tr>` : "").join("")}</tbody></table>` : `<p class="empty">Add measurements to track your shape. Re-measure every 2 weeks.</p>`}
  </section>
  <button class="btn ghost block" id="checkin">Weekly check-in with Corner</button>`;
}
function mountProgress(){
  bindGo();
  $("#checkin").onclick = () => { tab = "coach"; render(); sendChat("Do my weekly check-in. Look at my last 7 days of calories, protein, training, sleep and weight trend. Tell me honestly what's working, what isn't, and exactly what to change next week."); };
  $("#measBtn").onclick = () => {
    const f = ["shoulders", "chest", "waist", "hips", "thigh", "arm"];
    openSheet("Measurements", `<p class="small muted" style="margin:0">Morning, relaxed, tape snug but not tight. Same spot every time.</p><div class="grid2">${f.map(k => `<label class="field"><span>${k[0].toUpperCase() + k.slice(1)}</span><div class="unitwrap"><input class="input" id="m_${k}" type="number" step="0.5" inputmode="decimal"><span class="u">cm</span></div></label>`).join("")}</div><button class="btn block" id="mSave">Save</button>`, body => {
      body.querySelector("#mSave").onclick = () => { const m = {}; f.forEach(k => { const v = n(body.querySelector("#m_" + k).value); if (v > 5) m[k] = r1(v); }); if (!Object.keys(m).length) return toast("Enter at least one"); const d = getDay(today()); d.measurements = Object.assign({}, d.measurements || {}, m); saveDay(d); closeSheet(); render(); toast("Measurements saved"); };
    });
  };
}

/* ---------------- ME ---------------- */
function viewMe(){
  const p = profile(), t = p.targets, th = store.get("theme", "blush");
  return `<header class="top"><div><h1>${esc(p.name || "Me")}</h1><p>${p.age} y · ${p.height} cm · ${r1(weightNow())} kg</p></div><button class="avatar" data-go="today" aria-label="Back to today">${I.x}</button></header>
  <section class="card"><div class="card-head"><h2>Your daily targets</h2><button class="link" id="editSetup">Redo setup</button></div>
    <div class="big-targets">${[["Calories", t.kcal, "kcal"], ["Protein", t.protein, "g"], ["Carbs", t.carbs, "g"], ["Fat", t.fat, "g"], ["Water", t.water_ml / 1000, "L"], ["Sleep", t.sleep_h, "h"]].map(([l, v, u]) => `<div class="tile" style="background:var(--s2)"><span class="sub">${l}</span><b class="num">${v}<small> ${u}</small></b></div>`).join("")}</div>
    <h3 style="font-size:14px;margin:16px 0 8px">How these were worked out</h3><ul class="why">${t.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul></section>
  <section class="card"><h2 style="margin-bottom:10px">Look</h2><div class="themes">${themePicks(th)}</div></section>
  <section class="card"><h2 style="margin-bottom:4px">AI coach</h2>
    <button class="list-btn" id="keyBtn">Gemini key<span>${hasKey() ? "Connected" + (store.get("lastModel") ? " · " + esc(store.get("lastModel")) : "") : "Not set up"}</span></button>
    <button class="list-btn" id="clearChat">Clear chat history<span>Keeps your logs</span></button></section>
  <section class="card"><h2 style="margin-bottom:4px">Your data</h2>
    <p class="small muted" style="margin:6px 0">Everything is stored only on this phone. Back up weekly so you don't lose it.</p>
    <button class="list-btn" id="backup">Back up<span>Save a file</span></button>
    <label class="list-btn" for="restoreIn">Restore from backup<span>Choose file</span></label><input type="file" id="restoreIn" accept="application/json,.json" hidden>
    <button class="list-btn" id="share">Share app with a friend<span>Sends the link only</span></button>
    <button class="list-btn" id="reset" style="color:var(--bad)">Delete all my data<span></span></button></section>
  <p class="tiny faint" style="text-align:center;margin:4px 0 0">Fight Camp gives fitness guidance, not medical advice. Talk to a doctor about health conditions, injuries or missed periods.</p>`;
}
function themePicks(th){
  return `<button class="theme-pick ${th === "blush" ? "on" : ""}" data-theme="blush" style="background:#141217"><div class="sw"><i style="background:#F6B6CE"></i><i style="background:#CBBDF6"></i><i style="background:#B6EFD5"></i></div><b style="color:#F7F2F5">Blush</b><span class="small" style="color:#A39AA6">Baby pink + pastels</span></button>
    <button class="theme-pick ${th === "noir" ? "on" : ""}" data-theme="noir" style="background:#0F0F10"><div class="sw"><i style="background:#FFFFFF"></i><i style="background:#B9B9BF"></i><i style="background:#77777E"></i></div><b style="color:#F5F5F6">Noir</b><span class="small" style="color:#9A9AA0">Pure black and white</span></button>`;
}
function bindThemes(root, after){ root.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => { store.set("theme", b.dataset.theme); applyTheme(); after(); }); }
function mountMe(){
  bindGo(); bindThemes(app, render);
  $("#editSetup").onclick = () => { ob = { step: 1, data: Object.assign(defaults(), profile()) }; renderOnboarding(); };
  $("#keyBtn").onclick = () => keySheet();
  $("#clearChat").onclick = () => { store.set("chat", []); toast("Chat cleared"); };
  $("#backup").onclick = async () => {
    const blob = new Blob([exportAll()], { type: "application/json" }), name = `fight-camp-backup-${today()}.json`;
    const file = new File([blob], name, { type: "application/json" });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: "Fight Camp backup" }); return; } } catch (e){ if (e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $("#restoreIn").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { importAll(await f.text()); applyTheme(); toast("Backup restored"); render(); } catch (er){ toast(er.message || "Couldn't read that file"); } };
  $("#share").onclick = async () => {
    const url = location.href.split("#")[0];
    try { await navigator.share({ title: "Fight Camp", text: "My fitness coach app. Open it, add to home screen, and do the setup. You'll need your own free Gemini key.", url }); }
    catch (e){ if (e.name !== "AbortError"){ try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); } } }
  };
  $("#reset").onclick = () => openSheet("Delete all data?", `<p style="margin:0">This removes your profile, logs, plan, chat and key from this phone. It can't be undone unless you have a backup.</p><button class="btn block" id="yesReset" style="background:var(--bad);color:#000">Delete everything</button><button class="btn ghost block" id="noReset">Cancel</button>`, body => {
    body.querySelector("#noReset").onclick = () => closeSheet();
    body.querySelector("#yesReset").onclick = () => { store.keys("").forEach(k => store.del(k)); closeSheet(); tab = "today"; ob = null; render(); };
  });
}
function keyInfoHTML(){
  return `<ol class="steps-list">
    <li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> and sign in with any Google account.</li>
    <li>Tap <b>Create API key</b>. Copy it.</li>
    <li>Paste it here. It stays on this phone and is only sent to Google.</li></ol>
    <p class="small muted" style="margin:0">Free tier: no card needed. It has a daily request limit; if you hit it, logging by hand still works and it resets the next day. On the free tier Google may use requests to improve its models, so don't put anything in chat you wouldn't want seen.</p>`;
}
function keySheet(){
  openSheet("Connect your free AI coach", `${keyInfoHTML()}<label class="field"><span>Gemini API key</span><input class="input" id="keyIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…" value=""></label><div class="err" id="keyErr"></div><button class="btn block" id="keySave">${hasKey() ? "Replace key" : "Connect"}</button>${hasKey() ? `<button class="btn ghost block" id="keyDel">Remove key</button>` : ""}`, body => {
    body.querySelector("#keySave").onclick = async () => {
      const b = body.querySelector("#keySave"); b.disabled = true; b.textContent = "Checking…";
      try { const m = await setupKey(body.querySelector("#keyIn").value); closeSheet(); toast(`Connected · ${m}`); render(); }
      catch (e){ body.querySelector("#keyErr").textContent = e.message; b.disabled = false; b.textContent = "Try again"; }
    };
    body.querySelector("#keyDel")?.addEventListener("click", () => { store.del("apiKey"); store.del("models"); closeSheet(); render(); toast("Key removed"); });
  });
}

/* ---------------- ONBOARDING ---------------- */
let ob = null;
function renderOnboarding(){
  if (!ob) ob = { step: 0, data: Object.assign(defaults(), store.get("obDraft", {})) };
  const total = STEPS.length + 2; // welcome + steps + ai + result
  const s = ob.step;
  const prog = `<div class="ob-prog">${Array.from({ length: total }, (_, i) => `<i class="${i <= s ? "on" : ""}"></i>`).join("")}</div>`;
  let html = "";
  if (s === 0){
    html = `${prog}<img src="icons/icon-192.png" width="68" height="68" alt="" style="border-radius:22px"><div><h1>Your personal fight camp</h1><p class="sub">A coach that knows your body, your training and your food. Setup takes about 4 minutes, and every number after that is built for you.</p></div>
      <div class="field"><span>Pick a look (you can change it later)</span><div class="themes">${themePicks(store.get("theme", "blush"))}</div></div>
      <div class="ob-foot"><button class="btn block" id="next">Start setup</button></div>`;
  } else if (s <= STEPS.length){
    const st = STEPS[s - 1];
    html = `${prog}<div><p class="label">Step ${s} of ${STEPS.length}</p><h1>${esc(st.title)}</h1><p class="sub">${esc(st.sub)}</p></div><div class="ob-fields">${st.fields.filter(f => !f.showIf || f.showIf(ob.data)).map(fieldHTML).join("")}</div>
      <div class="err" id="obErr"></div><div class="ob-foot"><button class="btn ghost" id="back">Back</button><button class="btn" id="next">Continue</button></div>`;
  } else if (s === STEPS.length + 1){
    html = `${prog}<div><p class="label">Almost done</p><h1>Connect your AI coach</h1><p class="sub">Food counting from text, voice and photos, plus your coach chat and plan, use Google's free Gemini AI.</p></div>
      ${keyInfoHTML()}<label class="field"><span>Gemini API key</span><input class="input" id="keyIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…"></label>
      <div class="err" id="obErr"></div><div class="ob-foot"><button class="btn ghost" id="back">Back</button><button class="btn ghost" id="skip">Later</button><button class="btn" id="next">Connect</button></div>`;
  } else {
    const p = Object.assign({}, ob.data); const t = computeTargets(p);
    html = `${prog}<div><p class="label">Your numbers</p><h1>Here's your plan, ${esc(p.name || "fighter")}</h1><p class="sub">Calculated from your answers. You'll see these on the Today screen.</p></div>
      <div class="big-targets">${[["Calories", t.kcal, "kcal"], ["Protein", t.protein, "g"], ["Carbs", t.carbs, "g"], ["Fat", t.fat, "g"], ["Water", t.water_ml / 1000, "L"], ["Sleep", t.sleep_h, "h"]].map(([l, v, u]) => `<div class="tile"><span class="sub">${l}</span><b class="num">${v}<small> ${u}</small></b></div>`).join("")}</div>
      <section class="card"><h2 style="font-size:15px;margin-bottom:10px">How I worked this out</h2><ul class="why">${t.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul></section>
      ${p.fight === "yes" && p.weightClass ? `<div class="question">Fight booked at ${esc(p.weightClass)}. If your goal weight is above that limit, talk to your coach about the class before bulking.</div>` : ""}
      <div class="ob-foot"><button class="btn ghost" id="back">Back</button><button class="btn" id="next">Let's go</button></div>`;
  }
  app.innerHTML = `<div class="ob">${html}</div>`;
  window.scrollTo(0, 0);
  bindThemes(app, () => app.querySelectorAll("[data-theme]").forEach(b => b.classList.toggle("on", b.dataset.theme === store.get("theme"))));
  app.querySelectorAll("[data-seg]").forEach(b => b.onclick = () => { readFields(); ob.data[b.dataset.seg] = b.dataset.v; store.set("obDraft", ob.data); renderOnboarding(); });
  app.querySelectorAll("[data-multi]").forEach(b => b.onclick = () => { const k = b.dataset.multi, v = b.dataset.v; let a = ob.data[k] || []; a = a.includes(v) ? a.filter(x => x !== v) : (v === "none" ? ["none"] : a.filter(x => x !== "none").concat(v)); ob.data[k] = a; b.classList.toggle("on"); readFields(); store.set("obDraft", ob.data); renderOnboarding(); });
  $("#back")?.addEventListener("click", () => { readFields(); ob.step = Math.max(0, ob.step - 1); renderOnboarding(); });
  $("#skip")?.addEventListener("click", () => { ob.step++; renderOnboarding(); });
  $("#next").onclick = async () => {
    if (s >= 1 && s <= STEPS.length){
      readFields();
      const st = STEPS[s - 1];
      const miss = st.fields.find(f => !f.optional && (!f.showIf || f.showIf(ob.data)) && (ob.data[f.id] === undefined || ob.data[f.id] === "" || (f.type === "multi" && !(ob.data[f.id] || []).length)));
      if (miss){ $("#obErr").textContent = `Please answer: ${miss.label}`; return; }
      const bad = st.fields.find(f => f.type === "number" && ob.data[f.id] !== "" && ob.data[f.id] != null && ((f.min != null && +ob.data[f.id] < f.min) || (f.max != null && +ob.data[f.id] > f.max)));
      if (bad){ $("#obErr").textContent = `${bad.label} should be between ${bad.min} and ${bad.max}.`; return; }
      if (st.id === "goal" && ob.data.goalDate <= today()){ $("#obErr").textContent = "Pick a goal date in the future."; return; }
      store.set("obDraft", ob.data);
    }
    if (s === STEPS.length + 1){
      const v = $("#keyIn").value.trim();
      if (v){ const b = $("#next"); b.disabled = true; b.textContent = "Checking…"; try { await setupKey(v); } catch (e){ $("#obErr").textContent = e.message; b.disabled = false; b.textContent = "Connect"; return; } }
      else if (!hasKey()){ $("#obErr").textContent = "Paste your key, or tap Later."; return; }
    }
    if (s === STEPS.length + 2){
      const p = Object.assign({}, ob.data);
      ["age", "height", "weight", "goalWeight", "mtDays", "mtHours", "gymDays", "gymMin", "meals", "sleepH", "stepsEst", "m_shoulders", "m_chest", "m_waist", "m_hips", "m_thigh", "m_arm"].forEach(k => { if (p[k] !== "" && p[k] != null) p[k] = +p[k]; else delete p[k]; });
      const old = profile();
      p.startDate = old?.startDate || today();
      p.targets = computeTargets(p);
      store.set("profile", p); store.del("obDraft");
      const d = getDay(today()); if (d.weight == null){ d.weight = r1(p.weight); saveDay(d); }
      if (old && store.get("plan")) toast("Setup updated. Rebuild your plan in Train to match.");
      ob = null; tab = "today"; render(); return;
    }
    ob.step++; renderOnboarding();
  };
}
function fieldHTML(f){
  const v = ob.data[f.id];
  const lab = `<span>${esc(f.label)}${f.optional ? ' <span class="faint">(optional)</span>' : ""}</span>`;
  if (f.type === "seg") return `<div class="field">${lab}<div class="seg">${f.options.map(([val, l]) => `<button type="button" data-seg="${f.id}" data-v="${val}" class="${v === val ? "on" : ""}">${esc(l)}</button>`).join("")}</div></div>`;
  if (f.type === "multi") return `<div class="field">${lab}<div class="chips">${f.options.map(([val, l]) => `<button type="button" class="chip ${(v || []).includes(val) ? "on" : ""}" data-multi="${f.id}" data-v="${val}">${esc(l)}</button>`).join("")}</div></div>`;
  const type = f.type === "number" ? "number" : f.type;
  return `<label class="field">${lab}<div class="unitwrap"><input class="input" data-f="${f.id}" type="${type}" ${f.type === "number" ? `inputmode="decimal" step="${f.step || 1}"` : ""} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} value="${esc(v ?? "")}">${f.unit ? `<span class="u">${esc(f.unit)}</span>` : ""}</div></label>`;
}
function readFields(){ app.querySelectorAll("[data-f]").forEach(i => { ob.data[i.dataset.f] = i.value.trim(); }); }

/* ---------------- boot ---------------- */
applyTheme();
fetch("data/exercise-media.json").then(r => r.json()).then(j => { MEDIA = j; if (profile() && tab === "train" && !sheetEl) render(); }).catch(() => {});
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
document.addEventListener("visibilitychange", () => { if (!document.hidden && profile() && !sheetEl && tab === "today") render(); });
render();
