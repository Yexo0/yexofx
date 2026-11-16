// Build du moteur YexoFX (ExtendScript)
//   1. concatène src/*.jsx (ordre alphabétique) -> cep/host/yexofx_host.jsx
//   2. encode tout caractère non ASCII en \uXXXX (fichier final 100 % ASCII)
//   3. vérifie la syntaxe ES3 stricte (acorn, ecmaVersion 3)
//   4. traque les méthodes absentes d'ExtendScript (forEach, map, indexOf, trim, JSON...)
// Le fichier n'est PAS mis à jour si un problème est trouvé.
// Usage : node build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "cep", "host", "yexofx_host.jsx");

const toAscii = (s) =>
  s.replace(/[^\x00-\x7F]/g, (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"));

const pad2 = (n) => String(n).padStart(2, "0");
const now = new Date();
const STAMP = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

// ---------------------------------------------------------------- 1. concat
const files = readdirSync(SRC).filter((f) => f.endsWith(".jsx")).sort();
const lines = [];
const origin = []; // ligne générée (index 0-based) -> { file, line }
for (const f of files) {
  const text = readFileSync(join(SRC, f), "utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const ls = text.split("\n");
  if (ls[ls.length - 1] === "") ls.pop();
  lines.push(`// ---- src/${f} ----`);
  origin.push(null);
  ls.forEach((l, i) => {
    lines.push(l);
    origin.push({ file: f, line: i + 1 });
  });
}
const code = toAscii(lines.join("\n").replace(/__YFX_BUILD__/g, STAMP)) + "\n";
const where = (line) => {
  const o = origin[line - 1];
  return o ? `src/${o.file}:${o.line}` : `host:${line}`;
};

// ---------------------------------------------------------------- 2. lint ES3
const problems = [];
try {
  acorn.parse(code, { ecmaVersion: 3, sourceType: "script", locations: true, allowReserved: true });
} catch (e) {
  problems.push(`${where(e.loc ? e.loc.line : 0)}  syntaxe ES3 : ${e.message.replace(/\s*\(\d+:\d+\)$/, "")}`);
}

// Méthodes appelées sur un objet quelconque, absentes d'ES3 / ExtendScript.
const BAD_MEMBERS = new Set([
  "forEach", "map", "filter", "reduce", "reduceRight", "some", "every", "indexOf", "lastIndexOf",
  "trim", "trimLeft", "trimRight", "trimStart", "trimEnd", "bind", "startsWith", "endsWith", "includes",
  "padStart", "padEnd", "repeat", "find", "findIndex", "findLast", "toISOString", "toJSON", "flat",
  "flatMap", "fill", "codePointAt",
]);
// Méthodes statiques absentes d'ES3.
const BAD_STATIC = {
  Object: new Set(["keys", "values", "entries", "create", "defineProperty", "defineProperties", "freeze",
    "seal", "assign", "getPrototypeOf", "getOwnPropertyNames"]),
  Array: new Set(["isArray", "from", "of"]),
  Date: new Set(["now"]),
  Number: new Set(["isNaN", "isFinite", "isInteger", "parseFloat", "parseInt"]),
  String: new Set(["raw", "fromCodePoint"]),
};
// Globals absents d'ExtendScript.
const BAD_GLOBALS = new Set(["JSON", "Promise", "Map", "Set", "WeakMap", "WeakSet", "Symbol", "console",
  "Reflect", "Proxy", "require", "globalThis", "setTimeout", "setInterval"]);

// Une ligne qui contient "es3-ok" est exemptée (ex. String.indexOf, légal en ES3).
const okLines = new Set();
code.split("\n").forEach((l, i) => { if (l.includes("es3-ok")) okLines.add(i + 1); });

if (!problems.length) {
  const toks = [...acorn.tokenizer(code, { ecmaVersion: 3, locations: true, allowReserved: true })];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev = toks[i - 1];
    const prev2 = toks[i - 2];
    const line = t.loc.start.line;
    if (okLines.has(line)) continue;
    const label = t.type.label;
    if (label === "name") {
      const afterDot = prev && prev.type.label === ".";
      if (afterDot && prev2 && prev2.type.label === "name" && Object.hasOwn(BAD_STATIC, prev2.value) && BAD_STATIC[prev2.value].has(t.value)) {
        problems.push(`${where(line)}  ${prev2.value}.${t.value} n'existe pas en ES3`);
      } else if (afterDot && BAD_MEMBERS.has(t.value)) {
        problems.push(`${where(line)}  .${t.value}() n'existe pas en ExtendScript (ES3)`);
      } else if (!afterDot && BAD_GLOBALS.has(t.value)) {
        problems.push(`${where(line)}  ${t.value} n'existe pas en ExtendScript`);
      }
    }
    if (label === "]" && prev && prev.type.label === ",") {
      problems.push(`${where(line)}  virgule finale dans un tableau (élément fantôme en ES3)`);
    }
  }
}

if (problems.length) {
  console.error(`\nECHEC : ${problems.length} probleme(s) ES3. Le moteur n'a PAS ete mis a jour.\n`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

// ---------------------------------------------------------------- 3. écriture
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, code, "utf8");
const nLines = code.split("\n").length - 1;
console.log(`OK  cep/host/yexofx_host.jsx : ${nLines} lignes, ${files.length} modules, ES3 valide (build ${STAMP})`);
