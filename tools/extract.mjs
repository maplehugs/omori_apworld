// Saca de tu copia de OMORI el grafo de mapas: conexiones, cofres/items y sus condiciones (switches, variables, items).
// uso: node tools/extract.mjs > data/graph.json
import fs from 'node:fs'; import crypto from 'node:crypto';
const HOME = process.env.HOME;
const GAME = process.env.OMORI_DIR || `${HOME}/.local/share/Steam/steamapps/common/OMORI/www`;
const KEY = fs.readFileSync(`${HOME}/.local/share/Steam/appcache/appinfo.vdf`, 'latin1').match(/--([0-9a-f]{32})/)[1];
const load = f => { const b = fs.readFileSync(`${GAME}/data/${f}.KEL`), d = crypto.createDecipheriv('aes-256-ctr', KEY, b.subarray(0, 16)); return JSON.parse(Buffer.concat([d.update(b.subarray(16)), d.final()])); };

const infos = load('MapInfos'), sys = load('System');
const names = { item: load('Items'), weapon: load('Weapons'), armor: load('Armors') };
const nm = (kind, id) => names[kind][id] ? names[kind][id].name : `${kind}#${id}`;
const sw = id => `S${id}:${sys.switches[id] || ''}`;
const vr = id => `V${id}:${sys.variables[id] || ''}`;
const OPS = ['==', '>=', '<=', '>', '<', '!='];

// condiciones de pagina de evento
const pageConds = c => [
  c.switch1Valid && sw(c.switch1Id), c.switch2Valid && sw(c.switch2Id),
  c.variableValid && `${vr(c.variableId)}>=${c.variableValue}`,
  c.selfSwitchValid && `self${c.selfSwitchCh}`, c.itemValid && `has ${nm('item', c.itemId)}`, c.actorValid && `actor${c.actorId}`,
].filter(Boolean);
// condicion de un "Conditional Branch" (111)
const branch = p => {
  switch (p[0]) {
    case 0: return `${sw(p[1])}${p[2] === 0 ? '' : '=OFF'}`;
    case 1: return `${vr(p[1])}${OPS[p[4]]}${p[2] === 0 ? p[3] : vr(p[3])}`;
    case 2: return `self${p[1]}${p[2] === 0 ? '' : '=OFF'}`;
    case 8: return `has ${nm('item', p[1])}`;
    case 9: return `has ${nm('weapon', p[1])}`;
    case 10: return `has ${nm('armor', p[1])}`;
    case 12: return `script(${String(p[1]).slice(0, 80)})`;
    default: return `cond${p[0]}`;
  }
};

const TRANSFER_CE = new Set([31, 37]);
const maps = {};
for (const [i, info] of infos.entries()) {
  if (!info) continue;
  let M; try { M = load(`Map${String(i).padStart(3, '0')}`); } catch { continue; }
  const chain = []; for (let p = info.parentId; p; p = infos[p] && infos[p].parentId) chain.unshift(infos[p].name.trim());
  const out = { name: info.name.trim(), path: chain, exits: [], gains: [], sets: [] };
  for (const ev of M.events) {
    if (!ev) continue;
    ev.pages.forEach((pg, pi) => {
      const base = pageConds(pg.conditions), stack = [], vars = {};
      const where = { ev: ev.id, evName: ev.name, page: pi, x: ev.x, y: ev.y, trigger: pg.trigger };
      for (const c of pg.list) {
        stack.length = c.indent; // condiciones abiertas hasta esta indentacion
        if (c.code === 111) stack[c.indent] = branch(c.parameters);
        if (c.code === 411) stack[c.indent - 1] = 'NOT(' + (stack[c.indent - 1] || '?') + ')'; // else
        const cond = [...base, ...stack.filter(Boolean)];
        const P = c.parameters;
        // OMORI cambia de mapa con CE 31/37, que lee mapa/x/y de las variables 9/10/11
        if (c.code === 122 && P[3] === 0 && P[2] === 0) for (let v = P[0]; v <= P[1]; v++) vars[v] = P[4];
        if (c.code === 355 || c.code === 655) for (const m of String(P[0]).matchAll(/\$gameVariables\.setValue\(\s*(\d+)\s*,\s*(-?\d+)\s*\)/g)) vars[+m[1]] = +m[2];
        if (c.code === 117 && TRANSFER_CE.has(P[0]) && vars[9] != null) { out.exits.push({ ...where, to: vars[9], x: vars[10], y: vars[11], via: P[0], cond }); continue; }
        if (c.code === 201) out.exits.push({ ...where, to: P[0] === 0 ? P[1] : `var:${vr(P[1])}`, cond });
        if (c.code === 117) out.exits.push({ ...where, commonEvent: P[0], cond }); // transfers via CE (se resuelven luego)
        if ([126, 127, 128].includes(c.code) && P[1] === 0) out.gains.push({ ...where, kind: ['item', 'weapon', 'armor'][c.code - 126], name: nm(['item', 'weapon', 'armor'][c.code - 126], P[0]), id: P[0], qty: P[2] === 0 ? P[3] : `var${P[3]}`, cond });
        if (c.code === 121 && P[2] === 0) for (let s = P[0]; s <= P[1]; s++) out.sets.push({ ...where, switch: sw(s), cond });
      }
    });
  }
  maps[i] = out;
}
console.log(JSON.stringify({ maps }, null, 1));
