// Reference nutrition per 100 g of food as eaten, from USDA FoodData Central (SR Legacy / Foundation)
// unless noted. The AI matches what you typed to a key here; the app then does the maths itself,
// so common foods are counted from reference values instead of the AI's guess.
// unit = typical grams for one piece, used when you say "1 egg", "2 rotis".
export const FOODS = {
  rice_white_cooked:   { name: "White rice, cooked", kcal: 130, p: 2.7, c: 28.2, f: 0.3 },
  rice_brown_cooked:   { name: "Brown rice, cooked", kcal: 123, p: 2.7, c: 25.6, f: 1.0 },
  quinoa_cooked:       { name: "Quinoa, cooked", kcal: 120, p: 4.4, c: 21.3, f: 1.9 },
  pasta_cooked:        { name: "Pasta, cooked", kcal: 158, p: 5.8, c: 30.9, f: 0.9 },
  oats_dry:            { name: "Oats, dry", kcal: 379, p: 13.2, c: 67.7, f: 6.5 },
  bread_white:         { name: "White bread", kcal: 266, p: 8.9, c: 49.4, f: 3.3, unit: 28 },
  bread_wholewheat:    { name: "Whole wheat bread", kcal: 252, p: 12.4, c: 42.7, f: 3.5, unit: 32 },
  roti_chapati:        { name: "Roti / chapati", kcal: 299, p: 11.3, c: 46.4, f: 7.5, unit: 40 },
  potato_boiled:       { name: "Potato, boiled", kcal: 87, p: 1.9, c: 20.1, f: 0.1, unit: 150 },
  sweet_potato_baked:  { name: "Sweet potato, baked", kcal: 90, p: 2.0, c: 20.7, f: 0.2, unit: 130 },
  corn_boiled:         { name: "Sweet corn, boiled", kcal: 96, p: 3.4, c: 21.0, f: 1.5 },

  chicken_breast_cooked: { name: "Chicken breast, skinless, cooked (no oil)", kcal: 165, p: 31.0, c: 0, f: 3.6 },
  chicken_thigh_cooked:  { name: "Chicken thigh, skinless, cooked", kcal: 209, p: 26.0, c: 0, f: 10.9 },
  egg_whole_boiled:    { name: "Egg, whole, boiled", kcal: 155, p: 12.6, c: 1.1, f: 10.6, unit: 50 },
  egg_white:           { name: "Egg white", kcal: 52, p: 10.9, c: 0.7, f: 0.2, unit: 33 },
  fish_white_cooked:   { name: "White fish, cooked", kcal: 105, p: 22.8, c: 0, f: 0.9 },
  salmon_cooked:       { name: "Salmon, cooked", kcal: 206, p: 22.1, c: 0, f: 12.4 },
  prawns_cooked:       { name: "Prawns / shrimp, cooked", kcal: 99, p: 24.0, c: 0.2, f: 0.3 },
  goat_mutton_cooked:  { name: "Goat / mutton, lean, cooked", kcal: 143, p: 27.1, c: 0, f: 3.0 },
  tofu_firm:           { name: "Tofu, firm", kcal: 144, p: 17.3, c: 2.8, f: 8.7 },
  paneer:              { name: "Paneer, full fat (typical IFCT value)", kcal: 265, p: 18.3, c: 1.2, f: 20.8 },
  soya_chunks_dry:     { name: "Soya chunks, dry (typical label)", kcal: 345, p: 52.0, c: 33.0, f: 0.5 },
  whey_protein:        { name: "Whey protein powder (generic, check your label)", kcal: 390, p: 78.0, c: 8.0, f: 6.0, unit: 30 },

  lentils_dal_cooked:  { name: "Lentils / dal, boiled, thick, no oil", kcal: 116, p: 9.0, c: 20.1, f: 0.4 },
  chickpeas_boiled:    { name: "Chickpeas / chana, boiled", kcal: 164, p: 8.9, c: 27.4, f: 2.6 },
  kidney_beans_boiled: { name: "Kidney beans / rajma, boiled", kcal: 127, p: 8.7, c: 22.8, f: 0.5 },

  milk_whole:          { name: "Milk, whole", kcal: 61, p: 3.2, c: 4.8, f: 3.3 },
  milk_skim:           { name: "Milk, skim", kcal: 34, p: 3.4, c: 5.0, f: 0.1 },
  curd_yogurt_whole:   { name: "Curd / plain yogurt, whole milk", kcal: 61, p: 3.5, c: 4.7, f: 3.3 },
  greek_yogurt_nonfat: { name: "Greek yogurt, non-fat", kcal: 59, p: 10.2, c: 3.6, f: 0.4 },
  cheese_cheddar:      { name: "Cheddar cheese", kcal: 403, p: 24.9, c: 1.3, f: 33.1 },
  butter:              { name: "Butter", kcal: 717, p: 0.9, c: 0.1, f: 81.1 },
  ghee:                { name: "Ghee", kcal: 876, p: 0.3, c: 0, f: 99.5 },
  oil:                 { name: "Cooking oil", kcal: 884, p: 0, c: 0, f: 100 },

  peanut_butter:       { name: "Peanut butter", kcal: 597, p: 22.2, c: 22.3, f: 51.4 },
  peanuts:             { name: "Peanuts", kcal: 567, p: 25.8, c: 16.1, f: 49.2 },
  almonds:             { name: "Almonds", kcal: 579, p: 21.2, c: 21.6, f: 49.9 },

  banana:              { name: "Banana", kcal: 89, p: 1.1, c: 22.8, f: 0.3, unit: 118 },
  apple:               { name: "Apple", kcal: 52, p: 0.3, c: 13.8, f: 0.2, unit: 180 },
  orange:              { name: "Orange", kcal: 47, p: 0.9, c: 11.8, f: 0.1, unit: 130 },
  mango:               { name: "Mango", kcal: 60, p: 0.8, c: 15.0, f: 0.4 },
  papaya:              { name: "Papaya", kcal: 43, p: 0.5, c: 10.8, f: 0.3 },
  watermelon:          { name: "Watermelon", kcal: 30, p: 0.6, c: 7.6, f: 0.2 },
  grapes:              { name: "Grapes", kcal: 69, p: 0.7, c: 18.1, f: 0.2 },
  dates:               { name: "Dates", kcal: 277, p: 1.8, c: 75.0, f: 0.2, unit: 24 },
  avocado:             { name: "Avocado", kcal: 160, p: 2.0, c: 8.5, f: 14.7 },

  carrot_boiled:       { name: "Carrot, boiled", kcal: 35, p: 0.8, c: 8.2, f: 0.2, unit: 60 },
  carrot_raw:          { name: "Carrot, raw", kcal: 41, p: 0.9, c: 9.6, f: 0.2, unit: 60 },
  broccoli_boiled:     { name: "Broccoli, boiled", kcal: 35, p: 2.4, c: 7.2, f: 0.4 },
  spinach_cooked:      { name: "Spinach, cooked", kcal: 23, p: 3.0, c: 3.8, f: 0.3 },
  cucumber:            { name: "Cucumber", kcal: 15, p: 0.7, c: 3.6, f: 0.1 },
  tomato:              { name: "Tomato", kcal: 18, p: 0.9, c: 3.9, f: 0.2, unit: 120 },
  onion:               { name: "Onion", kcal: 40, p: 1.1, c: 9.3, f: 0.1, unit: 110 },

  honey:               { name: "Honey", kcal: 304, p: 0.3, c: 82.4, f: 0, unit: 21 },
  sugar:               { name: "Sugar", kcal: 387, p: 0, c: 100, f: 0, unit: 4 },
  coconut_water:       { name: "Coconut water", kcal: 19, p: 0.7, c: 3.7, f: 0.2 },
};

export function foodKeyList(){
  return Object.entries(FOODS).map(([k, v]) => `${k} = ${v.name}${v.unit ? ` (1 piece ≈ ${v.unit} g)` : ""}`).join("\n");
}
