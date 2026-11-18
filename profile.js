// Setup questions and the target maths. Targets are calculated here, not by the AI, so they are
// repeatable and explained: Mifflin-St Jeor BMR, a lifestyle factor, training energy from the
// Compendium of Physical Activities (MET values), and a surplus or deficit sized to your goal date.
import { today, parseD, DAY, ymd } from "./store.js";

const plus = days => ymd(new Date(Date.now() + days * DAY));

export const STEPS = [
  { id: "you", title: "Let's get to know you", sub: "This sets your calorie and protein targets.", fields: [
    { id: "name", label: "What should I call you?", type: "text", placeholder: "Your first name" },
    { id: "sex", label: "Sex (for the metabolism formula)", type: "seg", options: [["female", "Female"], ["male", "Male"]] },
    { id: "age", label: "Age", type: "number", unit: "years", min: 12, max: 80 },
    { id: "height", label: "Height", type: "number", unit: "cm", min: 120, max: 220, step: 0.5 },
    { id: "weight", label: "Weight today", type: "number", unit: "kg", min: 30, max: 200, step: 0.1 },
  ]},
  { id: "measure", title: "Your measurements", sub: "Optional, but this is how we track the shape you want. Measure relaxed, in the morning.", fields: [
    { id: "m_shoulders", label: "Shoulders (around, widest point)", type: "number", unit: "cm", optional: true, step: 0.5 },
    { id: "m_chest", label: "Chest", type: "number", unit: "cm", optional: true, step: 0.5 },
    { id: "m_waist", label: "Waist (narrowest point)", type: "number", unit: "cm", optional: true, step: 0.5 },
    { id: "m_hips", label: "Hips / glutes (widest point)", type: "number", unit: "cm", optional: true, step: 0.5 },
    { id: "m_thigh", label: "Thigh", type: "number", unit: "cm", optional: true, step: 0.5 },
    { id: "m_arm", label: "Upper arm (relaxed)", type: "number", unit: "cm", optional: true, step: 0.5 },
  ]},
  { id: "goal", title: "Your goal", sub: "Be specific. Everything else is built around this.", fields: [
    { id: "goalWeight", label: "Goal weight", type: "number", unit: "kg", min: 30, max: 200, step: 0.1 },
    { id: "goalDate", label: "By when?", type: "date" },
    { id: "focus", label: "Which areas do you most want to change?", type: "multi", options: [["glutes", "Bigger glutes"], ["shoulders", "Broad shoulders"], ["waist", "Thin waist"], ["arms", "Toned arms"], ["back", "Wide back"], ["core", "Visible abs"], ["legs", "Strong legs"], ["chest", "Chest"]] },
    { id: "priority", label: "If you had to pick one", type: "seg", options: [["gain", "Gain weight, stay lean"], ["recomp", "Same weight, more muscle"], ["cut", "Lose fat"]] },
  ]},
  { id: "muaythai", title: "Muay Thai", sub: "Your biggest energy cost, so this matters a lot.", fields: [
    { id: "mtDays", label: "Sessions per week", type: "number", unit: "days", min: 0, max: 14 },
    { id: "mtWhich", label: "Which days?", type: "multi", optional: true, options: [["Mon", "Mon"], ["Tue", "Tue"], ["Wed", "Wed"], ["Thu", "Thu"], ["Fri", "Fri"], ["Sat", "Sat"], ["Sun", "Sun"]] },
    { id: "mtHours", label: "Hours per session", type: "number", unit: "h", min: 0, max: 5, step: 0.25 },
    { id: "mtType", label: "Usual intensity", type: "seg", options: [["technique", "Mostly technique"], ["pads", "Pads and bag"], ["hard", "Sparring / hard rounds"]] },
    { id: "fight", label: "Is a fight booked?", type: "seg", options: [["no", "Not yet"], ["yes", "Yes"]] },
    { id: "fightDate", label: "Fight date", type: "date", optional: true, showIf: p => p.fight === "yes" },
    { id: "weightClass", label: "Weight class or limit", type: "text", placeholder: "e.g. 48 kg", optional: true, showIf: p => p.fight === "yes" },
  ]},
  { id: "gym", title: "Gym", sub: "So your plan fits around Muay Thai.", fields: [
    { id: "gymDays", label: "Gym days per week you can do", type: "number", unit: "days", min: 0, max: 7 },
    { id: "gymMin", label: "Minutes per gym session", type: "number", unit: "min", min: 0, max: 180, step: 5 },
    { id: "gymExp", label: "Lifting experience", type: "seg", options: [["new", "New"], ["some", "Under 1 year"], ["mid", "1-3 years"], ["adv", "3+ years"]] },
    { id: "equipment", label: "Where you train", type: "seg", options: [["gym", "Full gym"], ["home", "Home, dumbbells"], ["body", "Bodyweight only"]] },
    { id: "trainTime", label: "When you usually train", type: "seg", options: [["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"]] },
  ]},
  { id: "life", title: "Your day", sub: "Sleep and daily movement change your needs and recovery.", fields: [
    { id: "job", label: "Most of your day", type: "seg", options: [["desk", "Sitting / desk"], ["student", "Student"], ["feet", "On my feet"], ["physical", "Physical work"]] },
    { id: "stepsEst", label: "Rough daily steps (not counting training)", type: "number", unit: "steps", min: 0, max: 40000, step: 500, optional: true },
    { id: "sleepH", label: "Hours you usually sleep", type: "number", unit: "h", min: 3, max: 12, step: 0.5 },
    { id: "wake", label: "Usual wake-up time", type: "time" },
    { id: "stress", label: "Stress lately", type: "seg", options: [["low", "Low"], ["med", "Medium"], ["high", "High"]] },
  ]},
  { id: "food", title: "How you eat", sub: "Your coach only suggests food you'd actually eat.", fields: [
    { id: "diet", label: "Diet", type: "seg", options: [["nonveg", "Non-veg"], ["egg", "Eggetarian"], ["veg", "Vegetarian"], ["vegan", "Vegan"]] },
    { id: "cuisine", label: "Food you mostly eat", type: "text", placeholder: "e.g. South Indian home food, some Chinese" },
    { id: "meals", label: "Meals a day", type: "number", unit: "meals", min: 1, max: 8 },
    { id: "cook", label: "Who makes your food?", type: "seg", options: [["me", "I cook"], ["family", "Family"], ["mess", "Hostel / mess"], ["out", "Mostly eat out"]] },
    { id: "budget", label: "Food budget", type: "seg", options: [["low", "Tight"], ["mid", "Medium"], ["high", "Flexible"]] },
    { id: "allergies", label: "Allergies or foods you avoid", type: "text", placeholder: "e.g. lactose, peanuts, none", optional: true },
    { id: "dislikes", label: "Foods you dislike", type: "text", optional: true },
    { id: "supps", label: "Supplements you have or would take", type: "multi", optional: true, options: [["whey", "Whey / protein powder"], ["creatine", "Creatine"], ["multi", "Multivitamin"], ["iron", "Iron"], ["vitd", "Vitamin D"], ["omega3", "Omega-3"], ["none", "None"]] },
  ]},
  { id: "health", title: "Health", sub: "Private to this phone. It keeps advice safe for you.", fields: [
    { id: "injuries", label: "Injuries or pain", type: "text", placeholder: "e.g. left knee hurts on deep squats", optional: true },
    { id: "conditions", label: "Medical conditions or medication", type: "text", placeholder: "e.g. thyroid, asthma, none", optional: true },
    { id: "periods", label: "Periods (female only)", type: "seg", optional: true, options: [["regular", "Regular"], ["irregular", "Irregular / missed"], ["na", "Skip"]] },
  ]},
];

export function defaults(){
  return { sex: "female", mtDays: 5, mtHours: 2, mtType: "technique", fight: "no", gymDays: 4, gymMin: 60, gymExp: "new", equipment: "gym",
    trainTime: "evening", job: "student", sleepH: 7, wake: "07:00", stress: "med", diet: "nonveg", cuisine: "Indian home food", meals: 4,
    cook: "family", budget: "mid", focus: [], supps: [], priority: "gain", goalDate: plus(92), startDate: today() };
}

const MT_MET = { technique: 5.3, pads: 7.8, hard: 10.3 };   // Compendium: martial arts slower / boxing bag-sparring / martial arts moderate
const JOB = { desk: 1.25, student: 1.3, feet: 1.45, physical: 1.6 };
const r50 = v => Math.round(v / 50) * 50;

export function computeTargets(p){
  const w = +p.weight, h = +p.height, a = +p.age;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === "male" ? 5 : -161);
  const life = bmr * (JOB[p.job] || 1.3);
  const mtWeek = (+p.mtDays || 0) * (+p.mtHours || 0) * ((MT_MET[p.mtType] || 5.3) - 1) * w;
  const gymWeek = (+p.gymDays || 0) * ((+p.gymMin || 0) / 60) * (5.0 - 1) * w;
  const train = (mtWeek + gymWeek) / 7;
  const tdee = life + train;
  const daysLeft = Math.max(14, Math.round((parseD(p.goalDate) - parseD(today())) / DAY));
  const diff = (+p.goalWeight || w) - w;
  const need = diff * 7700 / daysLeft;
  let adj, mode;
  if (p.priority === "cut" || diff < -1){ mode = "cut"; adj = -Math.min(500, Math.max(250, -need || 300)); }
  else if (Math.abs(diff) <= 1 || p.priority === "recomp"){ mode = "recomp"; adj = 100; }
  else { mode = "gain"; adj = Math.min(450, Math.max(200, need)); }
  const kcal = r50(tdee + adj);
  const protein = Math.round(w * (mode === "cut" ? 2.3 : mode === "recomp" ? 2.2 : 2.0));
  const fat = Math.round(Math.max(0.8 * w, kcal * 0.25 / 9));
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  const trainHoursDay = ((+p.mtDays || 0) * (+p.mtHours || 0) + (+p.gymDays || 0) * (+p.gymMin || 0) / 60) / 7;
  const water = Math.round((35 * w + 700 * trainHoursDay) / 250) * 250;
  const sleep = trainHoursDay * 7 >= 8 ? 8.5 : 8;
  const steps = Math.max(7000, Math.min(10000, Math.round(((+p.stepsEst || 6000) + 1500) / 500) * 500));
  const weekly = adj * 7 / 7700;
  const needWeekly = diff / (daysLeft / 7);
  const why = [
    `Resting burn (BMR): ${Math.round(bmr)} kcal, from your age, height and weight.`,
    `Daily life adds ${Math.round(life - bmr)} kcal (${({ desk: "mostly sitting", student: "student day", feet: "on your feet", physical: "physical work" })[p.job] || "average day"}).`,
    `Training averages ${Math.round(train)} kcal a day: ${p.mtDays} × ${p.mtHours} h Muay Thai and ${p.gymDays} × ${p.gymMin} min gym a week.`,
    `So you burn about ${r50(tdee)} kcal a day.`,
    mode === "gain" ? `To gain lean weight we add ${Math.round(adj)} kcal, about +${weekly.toFixed(2)} kg a week.${needWeekly > weekly + 0.05 ? ` Your date needs ${needWeekly.toFixed(2)} kg a week; faster than this mostly adds fat, so expect to reach the goal a bit later or accept some extra fat.` : ""}`
      : mode === "cut" ? `To lose fat and keep muscle we take off ${Math.round(-adj)} kcal, about ${weekly.toFixed(2)} kg a week.`
      : `For building muscle at the same weight we add a small ${adj} kcal.`,
    `Protein ${protein} g (${(protein / w).toFixed(1)} g per kg) to build muscle. Fat ${fat} g for hormones. Carbs ${carbs} g fuel your training.`,
    `Water ${water / 1000} L: 35 ml per kg plus extra for sweat. Sleep ${sleep} h because hard training needs more recovery.`,
  ];
  return { kcal, protein, carbs, fat, water_ml: water, sleep_h: sleep, steps, bmr: Math.round(bmr), tdee: r50(tdee), mode, adj: Math.round(adj), why };
}

export function profileText(p){
  const t = p.targets || {};
  const m = ["shoulders", "chest", "waist", "hips", "thigh", "arm"].filter(k => p["m_" + k]).map(k => `${k} ${p["m_" + k]} cm`).join(", ");
  return [
    `Name: ${p.name || "athlete"}; ${p.sex}, ${p.age} y, ${p.height} cm, ${p.weight} kg at start (${p.startDate}).`,
    `Goal: ${p.goalWeight} kg by ${p.goalDate}; priority ${p.priority}; focus areas: ${(p.focus || []).join(", ") || "overall"}.`,
    m ? `Starting measurements: ${m}.` : "",
    `Muay Thai: ${p.mtDays} sessions/week × ${p.mtHours} h, mostly ${p.mtType}${(p.mtWhich || []).length ? `, on ${p.mtWhich.join(", ")}` : ""}. Fight booked: ${p.fight === "yes" ? `yes, ${p.fightDate || "date unknown"}, class ${p.weightClass || "unknown"}` : "no"}.`,
    `Gym: ${p.gymDays} days/week × ${p.gymMin} min, experience ${p.gymExp}, equipment ${p.equipment}, trains in the ${p.trainTime}.`,
    `Day: ${p.job}, ~${p.stepsEst || "?"} steps, sleeps ${p.sleepH} h, wakes ${p.wake}, stress ${p.stress}.`,
    `Food: ${p.diet}, eats ${p.cuisine}, ${p.meals} meals/day, food made by ${p.cook}, budget ${p.budget}. Avoids: ${p.allergies || "none"}. Dislikes: ${p.dislikes || "none"}. Supplements: ${(p.supps || []).join(", ") || "none"}.`,
    `Health: injuries ${p.injuries || "none"}; conditions/meds ${p.conditions || "none"}; periods ${p.periods || "not given"}.`,
    `Daily targets (calculated): ${t.kcal} kcal, protein ${t.protein} g, carbs ${t.carbs} g, fat ${t.fat} g, water ${t.water_ml} ml, sleep ${t.sleep_h} h, steps ${t.steps}. Mode: ${t.mode}.`,
  ].filter(Boolean).join("\n");
}
