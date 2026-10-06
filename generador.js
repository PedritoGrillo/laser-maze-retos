// Generador de retos de nivel medio para Laser Maze (ThinkFun / Ravensburger)
// Simula el rayo, resuelve cada reto por fuerza bruta y solo acepta retos con UNA solución.
//   node generador.js [numero_de_retos] [semilla]  ->  retos.json
'use strict';
const fs = require('fs');

const N = 5;
// Lados / direcciones: 0=N 1=E 2=S 3=O (sentido horario)
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const OPU = s => (s + 2) % 4;

// Fichas: comportamiento en orientación 0 según el lado por el que ENTRA el rayo.
// Devuelve lados de salida, 'diana' (objetivo encendido) o [] (bloqueado).
//  - TM (objetivo/espejo): espejo '\' que mira al semicuadro N-E; diana en la cara O; cara S bloquea.
//  - DM (doble espejo) '\'   - BS (divisor) '\' semitransparente   - CP (checkpoint) pasa N-S
const BASE = {
  TM: [[1], [0], [], 'diana'],
  DM: [[1], [0], [3], [2]],
  BS: [[1, 2], [0, 3], [3, 0], [2, 1]],
  CP: [[2], [], [0], []],
};
const ORIENTS = { L: 4, TM: 4, DM: 2, BS: 2, CP: 2, CB: 1 };
const INVENTARIO = { TM: 5, BS: 2, DM: 1, CP: 1, CB: 1 };

function salida(tipo, r, ladoEntrada) {
  const res = BASE[tipo][(ladoEntrada - r + 4) % 4];
  if (res === 'diana') return 'diana';
  return res.map(o => (o + r) % 4);
}

/** Simula el rayo. fichas: Map idx -> {t, r}. Devuelve {encendidas:Set, tocadas:Set, tramos:[]} */
function simula(fichas) {
  let laser = null;
  for (const [i, f] of fichas) if (f.t === 'L') laser = i;
  const encendidas = new Set(), tocadas = new Set([laser]), tramos = [], visto = new Set();
  const pila = [[laser, fichas.get(laser).r]];
  while (pila.length) {
    const [desde, dir] = pila.pop();
    const k = desde * 4 + dir;
    if (visto.has(k)) continue;
    visto.add(k);
    let x = desde % N, y = Math.floor(desde / N);
    while (true) {
      const nx = x + DX[dir], ny = y + DY[dir];
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) { tramos.push([x, y, nx, ny, 'fuera']); break; }
      const i = ny * N + nx, f = fichas.get(i);
      tramos.push([x, y, nx, ny]);
      x = nx; y = ny;
      if (!f || f.t === 'CB') continue;
      if (f.t === 'L') { tocadas.add(i); break; }
      const s = salida(f.t, f.r, OPU(dir));
      // El checkpoint hay que ATRAVESARLO: chocar con su pared no cuenta como tocarlo
      if (f.t !== 'CP' || s.length) tocadas.add(i);
      if (s === 'diana') { encendidas.add(i); break; }
      for (const o of s) pila.push([i, o]);
      break;
    }
  }
  return { encendidas, tocadas, tramos };
}

function valida(fichas, objetivos, debenSerDiana) {
  const { encendidas, tocadas } = simula(fichas);
  if (encendidas.size !== objetivos) return false;
  for (const [i, f] of fichas) if (f.t !== 'CB' && !tocadas.has(i)) return false;
  for (const i of debenSerDiana) if (!encendidas.has(i)) return false;
  return true;
}

/** Cuenta soluciones (se para en 'tope'). reto: {fijas:[{i,t,r|null,diana?}], añadir:[t], objetivos} */
function resuelve(reto, tope = 2) {
  const fichas = new Map();
  const libres = [];
  const ocupadas = new Set(reto.fijas.map(f => f.i));
  for (let i = 0; i < N * N; i++) if (!ocupadas.has(i)) libres.push(i);
  const preguntas = reto.fijas.filter(f => f.r == null);
  for (const f of reto.fijas) fichas.set(f.i, { t: f.t, r: f.r ?? 0 });
  const debenSerDiana = reto.fijas.filter(f => f.diana).map(f => f.i);
  const añadir = [...reto.añadir].sort();
  const soluciones = [];

  const orientaPreguntas = (k) => {
    if (soluciones.length >= tope) return;
    if (k === preguntas.length) {
      if (valida(fichas, reto.objetivos, debenSerDiana)) soluciones.push(new Map([...fichas].map(([i, f]) => [i, { ...f }])));
      return;
    }
    const f = fichas.get(preguntas[k].i);
    for (let r = 0; r < ORIENTS[f.t]; r++) { f.r = r; orientaPreguntas(k + 1); }
  };
  const coloca = (k, minLibre) => {
    if (soluciones.length >= tope) return;
    if (k === añadir.length) { orientaPreguntas(0); return; }
    const t = añadir[k];
    // fichas iguales: casillas en orden creciente para no contar duplicados
    const desde = k > 0 && añadir[k - 1] === t ? minLibre : 0;
    for (let j = desde; j < libres.length; j++) {
      const i = libres[j];
      if (fichas.has(i)) continue;
      for (let r = 0; r < ORIENTS[t]; r++) {
        fichas.set(i, { t, r });
        coloca(k + 1, j + 1);
        fichas.delete(i);
        if (soluciones.length >= tope) return;
      }
    }
  };
  coloca(0, 0);
  return soluciones;
}

// --- generación aleatoria reproducible ---
let semilla = Number(process.argv[3] || 20261006);
function rnd() { // mulberry32
  semilla = (semilla + 0x6D2B79F5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const elige = a => a[Math.floor(rnd() * a.length)];
const baraja = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function candidato() {
  // Tablero solución: láser + 4..6 fichas del inventario
  const bolsa = [];
  for (const [t, n] of Object.entries(INVENTARIO)) for (let k = 0; k < n; k++) bolsa.push(t);
  baraja(bolsa);
  const nFichas = 4 + Math.floor(rnd() * 3);
  // Se construye siguiendo el rayo: cada ficha nueva va en una casilla por la que ya pasa el láser
  const fichas = new Map();
  fichas.set(Math.floor(rnd() * N * N), { t: 'L', r: Math.floor(rnd() * 4) });
  let puestas = 0;
  for (let intento = 0; intento < 60 && puestas < nFichas && bolsa.length; intento++) {
    const { tramos: tr } = simula(fichas);
    const camino = [...new Set(tr.filter(s => s[4] !== 'fuera').map(([, , x, y]) => y * N + x))].filter(i => !fichas.has(i));
    if (!camino.length) break;
    const i = elige(camino);
    const k = Math.floor(rnd() * bolsa.length), t = bolsa[k];
    fichas.set(i, { t, r: Math.floor(rnd() * ORIENTS[t]) });
    const s = simula(fichas);
    const ok = [...fichas].every(([j, f]) => f.t === 'CB' || s.tocadas.has(j));
    if (ok) { bolsa.splice(k, 1); puestas++; } else fichas.delete(i);
  }
  const tipos = [...fichas.values()].map(f => f.t).filter(t => t !== 'L');
  if (puestas < 4) return null;
  const { encendidas, tocadas, tramos } = simula(fichas);
  if (encendidas.size < 1 || encendidas.size > 3) return null;
  for (const [i, f] of fichas) if (f.t !== 'CB' && !tocadas.has(i)) return null;
  if (fichas.size - (tipos.includes('CB') ? 1 : 0) < 5) return null;
  if (tramos.length < 9) return null;                       // recorrido con chicha
  // Reto: se quitan 2-3 fichas (a "añadir") y 1-2 fijas quedan con orientación '?'
  const quitables = [...fichas].filter(([, f]) => f.t !== 'L' && f.t !== 'CB').map(([i]) => i);
  const nAñadir = 2 + (rnd() < .5 ? 1 : 0);
  if (quitables.length < nAñadir + 1) return null;
  baraja(quitables);
  const quitar = new Set(quitables.slice(0, nAñadir));
  const restantes = [...fichas.keys()].filter(i => !quitar.has(i) && fichas.get(i).t !== 'CB');
  baraja(restantes);
  const nPreg = 1 + (rnd() < .5 ? 1 : 0);
  const pregunta = new Set(restantes.slice(0, nPreg));
  const reto = {
    objetivos: encendidas.size,
    añadir: [...quitar].map(i => fichas.get(i).t),
    fijas: [...fichas].filter(([i]) => !quitar.has(i)).map(([i, f]) => {
      const o = { i, t: f.t, r: pregunta.has(i) ? null : f.r };
      if (f.t === 'TM' && pregunta.has(i) && encendidas.has(i) && rnd() < .5) o.diana = true;
      return o;
    }),
  };
  return reto;
}

const quiero = Number(process.argv[2] || 12);
const retos = [];
const vistos = new Set();
let intentos = 0;
const t0 = Date.now();
while (retos.length < quiero && intentos < 200000) {
  intentos++;
  const reto = candidato();
  if (!reto) continue;
  const sols = resuelve(reto, 2);
  if (sols.length !== 1) continue;
  const clave = JSON.stringify(reto);
  if (vistos.has(clave)) continue;
  vistos.add(clave);
  const sol = sols[0];
  const sim = simula(sol);
  reto.solucion = [...sol].map(([i, f]) => ({ i, t: f.t, r: f.r }));
  reto.rayo = sim.tramos;
  reto.encendidas = [...sim.encendidas];
  retos.push(reto);
  console.log(`reto ${retos.length}: añadir ${reto.añadir.join(',')} · ? ${reto.fijas.filter(f => f.r == null).length} · objetivos ${reto.objetivos} (${intentos} intentos, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
// De más fácil a más difícil: nº de fichas a añadir, nº de '?', objetivos
retos.sort((a, b) => (a.añadir.length - b.añadir.length) || (a.fijas.filter(f => f.r == null).length - b.fijas.filter(f => f.r == null).length) || (a.objetivos - b.objetivos));
fs.writeFileSync(__dirname + '/retos.json', JSON.stringify(retos));
console.log('guardados', retos.length, 'retos');
module.exports = { simula, resuelve };
