// Elige 12 retos variados de pool.json, comprueba que cada uno tiene UNA solución y monta el HTML.
//   node seleccionar.js
'use strict';
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/generador.js', 'utf8').replace(/const quiero[\s\S]*$/, '');
const m = new module.constructor();
m._compile(src + ';module.exports={resuelve,valida};', 'gen.js');
const { resuelve, valida } = m.exports;

const pool = require('./pool.json');
const nPreg = r => r.fijas.filter(f => f.r == null).length;
const tiene = (r, t) => r.solucion.some(f => f.t === t);
const punt = r => r.objetivos * 4 + nPreg(r) * 2 + r.añadir.length * 2 + (tiene(r, 'CP') ? 1.5 : 0) + (tiene(r, 'DM') ? 1 : 0)
  + r.solucion.length * .5 + (r.fijas.some(f => f.diana) ? 1 : 0);

const sel = [], combos = {};
for (const r of [...pool].sort((a, b) => punt(b) - punt(a))) {
  const k = [...r.añadir].sort().join();
  if ((combos[k] || 0) >= 3) continue;
  combos[k] = (combos[k] || 0) + 1;
  sel.push(r);
  if (sel.length === 12) break;
}
sel.sort((a, b) => punt(a) - punt(b));

sel.forEach((r, k) => {
  const s = resuelve(r, 5);
  const sol = new Map(r.solucion.map(f => [f.i, { t: f.t, r: f.r }]));
  const ok = valida(sol, r.objetivos, r.fijas.filter(f => f.diana).map(f => f.i));
  const igual = s.length === 1 && [...s[0]].every(([i, f]) => sol.get(i) && sol.get(i).t === f.t && sol.get(i).r === f.r);
  console.log(`tarjeta ${k + 1}: añadir ${r.añadir.join('+')} · ? ${nPreg(r)} · objetivos ${r.objetivos} · soluciones ${s.length} · ${ok && igual ? 'OK' : 'FALLO'}`);
  if (!(ok && igual)) process.exitCode = 1;
});

fs.writeFileSync(__dirname + '/retos.json', JSON.stringify(sel));
const html = fs.readFileSync(__dirname + '/plantilla.html', 'utf8').replace('/*RETOS*/[]', JSON.stringify(sel));
fs.writeFileSync(__dirname + '/index.html', html);   // portada para GitHub Pages
console.log('HTML generado');
