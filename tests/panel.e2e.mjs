// Test du panel dans un vrai Chromium (Edge de Windows, piloté par playwright-core) à 340, 450 et 560 px de large,
// comme un panel AE étroit, moyen et large. Moteur simulé (hors AE). Vérifie : temps d'ouverture, pas de débordement
// horizontal, grille virtualisée (seules les cartes visibles existent, le défilement les remplace), fiche, comparer A/B,
// packs, palette, réglages, aucune erreur JS. Captures dans tests/screenshots/<largeur>_<vue>.png.
// Usage : node tests/panel.e2e.mjs
import http from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CEP = join(ROOT, "cep");
const OUT = join(ROOT, "tests", "screenshots");
const WIDTHS = [340, 450, 560];

let chromium;
try { ({ chromium } = await import("playwright-core")); } catch (e) { console.log("--   playwright-core absent (npm install) : test navigateur ignoré"); process.exit(0); }

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log("  ok   " + msg); else { failures++; console.log("  FAIL " + msg); } };

// ---- petit serveur statique pour cep/
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const f = normalize(join(CEP, rel));
  if (!f.startsWith(CEP) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

let browser;
try { browser = await chromium.launch({ channel: "msedge", headless: true }); }
catch (e) {
  try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
  catch (e2) { console.log("--   ni Edge ni Chrome trouvés : test navigateur ignoré"); server.close(); process.exit(0); }
}
mkdirSync(OUT, { recursive: true });

const shot = (page, W, name) => page.screenshot({ path: join(OUT, `${W}_${name}.png`) });
const frame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const settle = (page) => page.waitForTimeout(400); // fin des animations d'ouverture (feuilles, vues)
const noOverflow = (page) => page.evaluate(() => {
  const w = window.innerWidth;
  // rogné par un conteneur (overflow hidden / auto) qui, lui, tient dans le panel : pas un débordement visible
  const clipped = (el) => {
    for (let a = el.parentElement; a && a.id !== "panel"; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== "visible" || cs.overflow !== "visible") return a.getBoundingClientRect().right <= w + 1;
    }
    return false;
  };
  const out = Array.from(document.querySelectorAll("#panel *")).filter((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (el.closest(".toast, [hidden]")) return false;
    return r.right > w + 1 && !clipped(el);
  }).map((el) => el.tagName.toLowerCase() + "." + String(el.className).split(" ").join("."));
  return { page: document.documentElement.scrollWidth <= w, out: out.slice(0, 5) };
});

for (const W of WIDTHS) {
  console.log(`\nPanel à ${W} px`);
  const ctx = await browser.newContext({ viewport: { width: W, height: 860 }, colorScheme: "dark", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) errors.push(r.status() + " " + r.url()); });

  await page.goto(BASE + "/index.html");
  await page.waitForFunction(() => window.YX && YX.app && YX.app.state.engine === "ok" && document.querySelector("#view .home"));
  const t = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return { dcl: Math.round(nav.domContentLoadedEventEnd), ready: Math.round(performance.now()) };
  });
  // le moteur simulé répond en 30 ms par appel (4 appels au démarrage) : on compte l'ouverture du panel à part
  ok(t.dcl < 300, `ouverture : panel affiché en ${t.dcl} ms (moteur simulé prêt à ${t.ready} ms)`);
  await frame(page);
  let o = await noOverflow(page);
  ok(o.page && !o.out.length, "accueil : rien ne déborde" + (o.out.length ? " (" + o.out.join(", ") + ")" : ""));
  await shot(page, W, "accueil");

  // grille virtualisée
  const t0 = Date.now();
  await page.click('#cats [data-cat="impacts"]');
  await page.waitForSelector("#view .tile.card");
  const switchMs = Date.now() - t0;
  await frame(page);
  const g = await page.evaluate(() => {
    const total = YX.catalog.P.filter((p) => p.cat === "impacts").length;
    const tiles = Array.from(document.querySelectorAll("#view .tile.card"));
    const w = window.innerWidth, rs = tiles.map((t) => t.getBoundingClientRect());
    const cols = new Set(rs.map((r) => Math.round(r.left))).size;
    const overlap = rs.some((a, i) => rs.some((b, j) => i !== j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
    return { total, dom: tiles.length, cols, fits: rs.every((r) => r.right <= w + 0.5 && r.width >= 100), overlap, h: document.querySelector("#vgrid").offsetHeight };
  });
  ok(g.dom > 0 && g.dom < g.total, `virtualisation : ${g.dom} cartes dans le DOM sur ${g.total} (${g.cols} colonnes, catégorie ouverte en ${switchMs} ms)`);
  ok(g.fits && !g.overlap, "cartes : largeur ≥ 100 px, dans le panel, sans chevauchement");
  await shot(page, W, "impacts");
  await page.evaluate(() => { const s = document.querySelector("#scroll"); s.scrollTop = s.scrollHeight; });
  await frame(page);
  await frame(page);
  const last = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("#view .tile.card")).map((t) => t.dataset.id);
    const st = YX.app.state;
    return { has: ids.length > 0 && !ids.includes("killhit"), n: ids.length };
  });
  ok(last.has, `défilement en bas : les cartes du haut sont retirées, ${last.n} nouvelles cartes rendues`);
  await page.evaluate(() => { document.querySelector("#scroll").scrollTop = 0; });
  await frame(page);

  // style + survol
  await page.click('#view .style-chips [data-style="phonk"]');
  await frame(page);
  const ph = await page.evaluate(() => Array.from(document.querySelectorAll("#view .tile.card")).every((t) => YX.catalog.byId.get(t.dataset.id).styles.includes("phonk")));
  ok(ph, "style Phonk appliqué à la grille");
  await page.hover("#view .tile.card .hit");
  const toolsVisible = await page.evaluate(() => getComputedStyle(document.querySelector("#view .tile.card .tools")).opacity === "1");
  ok(toolsVisible, "survol d'une carte : boutons fiche / pile / favori visibles");
  const crumb = await page.evaluate(() => { const c = document.querySelector("#crumb .cur"); return c.scrollWidth <= c.clientWidth + 1 ? c.textContent : ""; });
  ok(crumb === "Impacts", "fil d'Ariane : « Impacts » en entier, même avec un style actif");
  await shot(page, W, "impacts_phonk");

  // fiche + comparer
  await page.click("#view .tile.card .tools .more");
  await page.waitForSelector("#sheet .sheet-card");
  await frame(page);
  o = await noOverflow(page);
  const focusOk = await page.evaluate(() => document.activeElement && document.activeElement.dataset.act === "apply-detail");
  ok(o.page && !o.out.length && focusOk, "fiche : rien ne déborde, focus sur Appliquer" + (o.out.length ? " (" + o.out.join(", ") + ")" : ""));
  await settle(page);
  await shot(page, W, "fiche");
  await page.click('#sheet [data-act="compare"]');
  await page.waitForSelector("#sheet .ab");
  await frame(page);
  const ab = await page.evaluate(() => Array.from(document.querySelectorAll("#sheet .ab-cell")).map((c) => Math.round(c.getBoundingClientRect().width)));
  ok(ab.length === 2 && ab.every((x) => x > 100), `comparer A/B : 2 aperçus de ${ab.join(" et ")} px`);
  await settle(page);
  await shot(page, W, "comparer");
  await page.keyboard.press("Escape");

  // packs
  await page.click('#cats [data-cat="packs"]');
  await page.waitForSelector("#view .pack-card");
  await frame(page);
  o = await noOverflow(page);
  ok(o.page && !o.out.length, "packs de style : rien ne déborde" + (o.out.length ? " (" + o.out.join(", ") + ")" : ""));
  await settle(page);
  await shot(page, W, "packs");

  // palette
  await page.keyboard.press("Control+k");
  await page.fill("#q", "ralenti");
  await frame(page);
  const pal = await page.evaluate(() => (document.querySelector('#palList .pal-it[aria-selected="true"]') || {}).textContent || "");
  ok(/^Ralenti/.test(pal.trim()), "palette : « ralenti » propose d'abord un ralenti, même avec le style Phonk actif (" + pal.replace(/\s+/g, " ").trim().slice(0, 40) + ")");
  await settle(page);
  await shot(page, W, "palette");
  await page.keyboard.press("Escape");

  // réglages
  await page.click("#btnSettings");
  await page.waitForSelector("#view .settings");
  await frame(page);
  o = await noOverflow(page);
  ok(o.page && !o.out.length, "réglages : rien ne déborde" + (o.out.length ? " (" + o.out.join(", ") + ")" : ""));
  await shot(page, W, "reglages");

  ok(errors.length === 0, "aucune erreur JS" + (errors.length ? " : " + errors.slice(0, 4).join(" | ") : ""));
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\nECHEC : ${failures} test(s) en échec\n` : `\nOK : panel validé dans Edge à ${WIDTHS.join(", ")} px (captures dans tests/screenshots)\n`);
process.exit(failures ? 1 : 0);
