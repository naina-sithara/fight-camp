// Google Gemini client. The key stays on this phone and is only sent to Google.
// Model names change often, so we ask Google which models this key can use and pick the best Flash models.
import { store } from "./store.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export class AIError extends Error {
  constructor(code, message){ super(message); this.code = code; }
}

export function hasKey(){ return !!store.get("apiKey", ""); }

async function listModels(key){
  const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (r.status === 400 || r.status === 401 || r.status === 403) throw new AIError("bad_key", "That key wasn't accepted by Google. Copy it again from AI Studio.");
  if (!r.ok) throw new AIError("network", `Google returned ${r.status}. Try again in a minute.`);
  const j = await r.json();
  const ok = (j.models || []).filter(m =>
    (m.supportedGenerationMethods || []).includes("generateContent") &&
    /gemini/i.test(m.name) && /flash/i.test(m.name) &&
    !/(image|tts|live|audio|embedding|vision-only|8b|transcribe|omni|robotics|computer-use|latest)/i.test(m.name) && /gemini-\d/i.test(m.name));
  const ver = name => { const m = name.match(/gemini-(\d+(?:\.\d+)?)/i); return m ? parseFloat(m[1]) : 0; };
  const score = m => ver(m.name) * 10 - (/(preview|exp)/i.test(m.name) ? 3 : 0);
  ok.sort((a, b) => score(b) - score(a));
  const names = ok.map(m => m.name.replace(/^models\//, ""));
  // Keep the 4 newest full Flash and the 4 newest Flash-Lite models.
  return names.filter(x => !/lite/i.test(x)).slice(0, 4).concat(names.filter(x => /lite/i.test(x)).slice(0, 4));
}

// "fast" (logging): Flash-Lite first, it's quick and was accurate in testing. "smart" (coach, plan): full Flash first.
function order(list, mode){
  const lite = list.filter(x => /lite/i.test(x)), full = list.filter(x => !/lite/i.test(x));
  const o = mode === "fast" ? lite.concat(full) : full.concat(lite);
  const good = store.get("good:" + mode); // last model that answered for this kind of request
  return good && o.includes(good) ? [good, ...o.filter(x => x !== good)] : o;
}

export async function setupKey(key){
  key = key.trim();
  if (!key) throw new AIError("bad_key", "Paste your key first.");
  const models = await listModels(key);
  if (!models.length) throw new AIError("no_models", "This key has no Gemini Flash models available. Check it's a Gemini API key from aistudio.google.com.");
  store.set("apiKey", key);
  store.set("models", models);
  store.set("modelsAt", Date.now());
  return models[0];
}

async function models(){
  const key = store.get("apiKey", "");
  let ms = store.get("models", []);
  if (!ms.length || Date.now() - store.get("modelsAt", 0) > 7 * 864e5){
    try { ms = await listModels(key); store.set("models", ms); store.set("modelsAt", Date.now()); } catch (e){ if (!ms.length) throw e; }
  }
  return ms;
}

// Models sometimes put raw line breaks inside JSON strings; escape them so the reply still parses.
function fixControlChars(s){
  let out = "", inStr = false, esc = false;
  for (const ch of s){
    if (inStr){
      if (esc){ out += ch; esc = false; continue; }
      if (ch === "\\"){ out += ch; esc = true; continue; }
      if (ch === '"'){ inStr = false; out += ch; continue; }
      if (ch === "\n"){ out += "\\n"; continue; }
      if (ch === "\r"){ continue; }
      if (ch === "\t"){ out += "\\t"; continue; }
      out += ch;
    } else { if (ch === '"') inStr = true; out += ch; }
  }
  return out;
}
function parseJSON(text){
  try { return JSON.parse(text); } catch {}
  try { return JSON.parse(fixControlChars(text)); } catch {}
  text = fixControlChars(text);
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (fence){ try { return JSON.parse(fence[1]); } catch {} }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a){ try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  throw new AIError("bad_json", "The coach's answer came back garbled. Try again.");
}

// parts: [{text}] or [{inlineData:{mimeType,data}}]; history: [{role:"user"|"model", text}]
export async function ask({ system, parts, history = [], json = false, temperature = 0.3, signal, mode = "smart", timeoutMs = 40000 }){
  const key = store.get("apiKey", "");
  if (!key) throw new AIError("no_key", "Add your free Gemini key in Me → AI coach to use this.");
  const list = order(await models(), mode);
  const started = Date.now();
  const contents = history.map(h => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] }));
  contents.push({ role: "user", parts });
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: Object.assign({ temperature }, json ? { responseMimeType: "application/json" } : {}),
  };
  let lastErr;
  for (const model of list){
    if (Date.now() - started > 100000) break; // don't keep the person waiting more than ~2 minutes
    let r;
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
    if (signal) signal.addEventListener("abort", () => ctl.abort(), { once: true });
    try {
      r = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: "POST", signal: ctl.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      });
    } catch (e){
      clearTimeout(timer);
      if (signal?.aborted) throw new AIError("cancelled", "Stopped.");
      if (e.name === "AbortError"){ lastErr = new AIError("slow", "Google's AI is very slow right now. Try again in a minute."); continue; }
      if (!navigator.onLine) throw new AIError("offline", "You're offline. Logging with AI needs internet.");
      lastErr = new AIError("network", "Couldn't reach Google. Check your connection and try again."); continue;
    }
    clearTimeout(timer);
    if (r.status === 429){ lastErr = new AIError("rate_limited", "You've hit today's free limit for the AI. It resets daily; you can still log water, sleep and weight by hand."); continue; }
    if (r.status === 404 || r.status === 503 || r.status === 500){ lastErr = new AIError("unavailable", "Google's AI is busy right now. Try again in a minute."); continue; }
    if (r.status === 401 || r.status === 403){ throw new AIError("bad_key", "Your Gemini key stopped working. Add it again in Me → AI coach."); }
    if (!r.ok){
      let msg = ""; try { msg = (await r.json()).error?.message || ""; } catch {}
      lastErr = new AIError("error", msg || `Google returned ${r.status}.`); continue;
    }
    const j = await r.json();
    const cand = j.candidates?.[0];
    const text = (cand?.content?.parts || []).map(p => p.text || "").join("").trim();
    if (!text){ lastErr = new AIError("empty", cand?.finishReason === "SAFETY" ? "The AI wouldn't answer that one. Try wording it differently." : "Got an empty answer. Try again."); continue; }
    let out;
    try { out = json ? parseJSON(text) : text; } catch (e){ lastErr = e; continue; }
    store.set("lastModel", model); store.set("good:" + mode, model);
    return out;
  }
  throw lastErr || new AIError("error", "Couldn't reach the AI.");
}

// ---- media helpers ----
export function blobToBase64(blob){
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
}

export async function shrinkImage(file, max = 1280){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, "image/jpeg", 0.85));
    return { mimeType: "image/jpeg", data: await blobToBase64(blob), preview: c.toDataURL("image/jpeg", 0.6) };
  } finally { URL.revokeObjectURL(url); }
}

export class Recorder {
  async start(){
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
    this.type = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
    this.rec = new MediaRecorder(this.stream, this.type ? { mimeType: this.type } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = e => e.data.size && this.chunks.push(e.data);
    this.rec.start();
    this.t0 = Date.now();
  }
  stop(){
    return new Promise(res => {
      this.rec.onstop = async () => {
        this.stream.getTracks().forEach(t => t.stop());
        const raw = (this.rec.mimeType || this.type || "audio/webm").split(";")[0];
        const blob = new Blob(this.chunks, { type: raw });
        const mime = raw === "audio/mp4" ? "audio/m4a" : raw;
        res({ mimeType: mime, data: await blobToBase64(blob), seconds: (Date.now() - this.t0) / 1000 });
      };
      this.rec.stop();
    });
  }
  cancel(){ try { this.rec.stop(); } catch {} this.stream?.getTracks().forEach(t => t.stop()); }
}
