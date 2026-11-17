/* YexoFX : recherche floue dans le catalogue (v1.0).
   - minuscules sans accents, synonymes FR / EN (catalog/synonyms.json : tremblement = shake, ralenti = slowmo…)
   - chaque mot de la recherche doit correspondre (préfixe, sous-chaîne ou une faute de frappe pour les mots de 4+ lettres)
   - score : nom > nom anglais > tags > reste (catégorie, styles, rôle, recette)
   Filtres combinables (catégorie, style, rôle, perf, besoins) et tri (populaire, récent, A-Z, favoris). */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9#+]+/g, ' ').trim();
  const words = (s) => norm(s).split(' ').filter(Boolean);

  // Distance d'édition bornée à 1 (insertion, suppression, substitution, inversion de 2 lettres).
  const near1 = (a, b) => {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  };

  let index = null, synMap = null;

  const build = () => {
    const C = YX.catalog;
    synMap = new Map();
    (C.SYN || []).forEach((g) => {
      const n = g.map(norm).filter(Boolean);
      n.forEach((t) => { synMap.set(t, (synMap.get(t) || []).concat(n.filter((x) => x !== t))); });
    });
    const catLabel = {};
    C.CATS.forEach((c) => { catLabel[c.id] = c.label + ' ' + (c.en || ''); });
    index = C.P.map((p) => {
      const styles = p.styles.map((s) => (C.STYLE[s] ? C.STYLE[s].name + ' ' + s : s)).join(' ');
      const other = [p.sb, p.desc, catLabel[p.cat], styles, C.ROLES[p.role], p.role, p.rx.join(' '), p.recipe.map((s) => s.p).join(' ')].join(' ');
      return {
        p, name: norm(p.name), nameEn: norm(p.nameEn), tags: norm(p.tags.join(' ')), other: norm(other),
        words: new Set(words([p.name, p.nameEn, p.tags.join(' '), other].join(' '))),
      };
    });
  };

  // Variantes d'un mot de recherche : lui-même + ses synonymes (y compris ceux dont il est le début : « ralen » -> ralenti).
  const variants = (t) => {
    const out = [t];
    synMap.forEach((list, key) => { if (key === t || (t.length >= 3 && key.startsWith(t))) list.forEach((x) => out.push(x)); });
    return Array.from(new Set(out));
  };

  const scoreToken = (d, t) => {
    let best = 0;
    for (const v of variants(t)) {
      const syn = v === t ? 1 : 0.85;
      let s = 0;
      if (d.name.startsWith(v)) s = 10;
      else if ((' ' + d.name).includes(' ' + v)) s = 8;
      else if (d.nameEn.startsWith(v) || (' ' + d.nameEn).includes(' ' + v)) s = 7;
      else if ((' ' + d.tags).includes(' ' + v)) s = 6;
      else if (d.name.includes(v) || d.nameEn.includes(v) || d.tags.includes(v)) s = 5;
      else if ((' ' + d.other).includes(' ' + v)) s = 3;
      else if (v.length >= 4) {
        for (const w of d.words) { if (w.length >= 3 && near1(w, v)) { s = 2; break; } }
      }
      best = Math.max(best, s * syn);
    }
    return best;
  };

  // Presets correspondant à q (tous les mots doivent correspondre), du plus pertinent au moins pertinent.
  const query = (q, list) => {
    if (!index) build();
    const toks = words(q);
    if (!toks.length) return list ? list.slice() : YX.catalog.P.slice();
    const allow = list ? new Set(list.map((p) => p.id)) : null;
    const out = [];
    for (const d of index) {
      if (allow && !allow.has(d.p.id)) continue;
      let total = 0, ok = true;
      for (const t of toks) {
        const s = scoreToken(d, t);
        if (!s) { ok = false; break; }
        total += s;
      }
      if (ok) out.push({ p: d.p, s: total });
    }
    out.sort((a, b) => b.s - a.s || b.p.rank - a.p.rank);
    return out.map((x) => x.p);
  };

  // Filtres : { cats: Set, style: id|'', roles: Set, perf: Set, needs: Set } (ensembles vides = pas de filtre).
  const NEED_OF = (p) => (p.needs && p.needs.sel) || 'comp';
  const filter = (list, f) => list.filter((p) =>
    (!f.cats || !f.cats.size || f.cats.has(p.cat)) &&
    (!f.style || p.styles.includes(f.style)) &&
    (!f.roles || !f.roles.size || f.roles.has(p.role)) &&
    (!f.perf || !f.perf.size || f.perf.has(p.perf)) &&
    (!f.needs || !f.needs.size || f.needs.has(NEED_OF(p))));

  // Tri : pop (rang éditorial + tes usages), recent (version d'ajout), az, fav (tes favoris d'abord).
  const sort = (list, how, ctx) => {
    const usage = (ctx && ctx.usage) || {}, favs = (ctx && ctx.favs) || new Set();
    const pop = (p) => p.rank + (usage[p.id] || 0) * 8;
    const out = list.slice();
    if (how === 'az') out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    else if (how === 'recent') out.sort((a, b) => String(b.since || '').localeCompare(String(a.since || '')) || pop(b) - pop(a));
    else if (how === 'fav') out.sort((a, b) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0) || pop(b) - pop(a));
    else if (how === 'pop') out.sort((a, b) => pop(b) - pop(a));
    return out;
  };

  YX.search = { norm, query, filter, sort, near1, reset: () => { index = null; } };
})();
