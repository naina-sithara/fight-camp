// Everything is saved on this phone (localStorage). Back up from Me → Backup.
const NS = "fc:";
export const store = {
  get(k, d = null){ try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k){ try { localStorage.removeItem(NS + k); } catch {} },
  keys(prefix = ""){ const out = []; try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k.startsWith(NS + prefix)) out.push(k.slice(NS.length)); } } catch {} return out; },
};

export const ymd = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
export const today = () => ymd(new Date());
export const parseD = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
export const DAY = 864e5;

export function getDay(date){
  const d = store.get("day:" + date, {});
  return { date, meals: d.meals || [], workouts: d.workouts || [], water_ml: d.water_ml || 0, sleep_h: d.sleep_h ?? null, sleep_q: d.sleep_q ?? null,
    steps: d.steps ?? null, weight: d.weight ?? null, measurements: d.measurements || null, note: d.note || "" };
}
export function saveDay(day){ store.set("day:" + day.date, day); }
export function allDays(){ return store.keys("day:").map(k => k.slice(4)).sort(); }

export function exportAll(){
  const out = {};
  store.keys("").forEach(k => { if (k !== "apiKey") out[k] = store.get(k); });
  return JSON.stringify({ app: "fight-camp", version: 1, exported: new Date().toISOString(), data: out });
}
export function importAll(text){
  const j = JSON.parse(text);
  if (j.app !== "fight-camp" || !j.data) throw new Error("That file isn't a Fight Camp backup.");
  Object.entries(j.data).forEach(([k, v]) => store.set(k, v));
}
