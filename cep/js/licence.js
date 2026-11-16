/* YexoFX : licence liée au PC.
   Clé "YFX1.<données>.<signature>" signée en Ed25519 par tools/licence.mjs (clé privée gardée par Yexo).
   Le panel vérifie la signature avec la clé publique (pubkey.js) et compare l'ID machine.
   Aucune connexion Internet. Clé enregistrée dans %APPDATA%\YexoFX\licence.key.
   Limite : la vérification tourne sur le PC de l'utilisateur (voir docs/ARCHITECTURE.md). */
(function () {
  'use strict';
  const YX = window.YX = window.YX || {};
  const nodeRequire = (typeof window.require === 'function') ? window.require : null;
  const mod = (name) => { try { return nodeRequire ? nodeRequire(name) : null; } catch (e) { return null; } };
  const crypto = mod('crypto'), cp = mod('child_process'), os = mod('os'), fs = mod('fs'), path = mod('path');
  const Buf = (mod('buffer') || {}).Buffer || null;
  const keyFile = (YX.store && YX.store.userDir && path) ? path.join(YX.store.userDir, 'licence.key') : null;

  // Même calcul que tools/licence.mjs : sha256("yexofx|" + MachineGuid Windows), 16 hex en 4 groupes.
  const machineGuid = () => {
    if (cp) {
      try {
        const out = cp.execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { windowsHide: true }).toString();
        const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
        if (m) return m[1].toLowerCase();
      } catch (e) { /* hors Windows */ }
    }
    if (os) return os.hostname() + '|' + os.userInfo().username;
    return null;
  };
  let cachedId = null;
  const machineId = () => {
    if (cachedId) return cachedId;
    const guid = machineGuid();
    if (!crypto || !guid) return null;
    const h = crypto.createHash('sha256').update('yexofx|' + guid).digest('hex').slice(0, 16).toUpperCase();
    cachedId = h.match(/.{4}/g).join('-');
    return cachedId;
  };

  const b64 = (s) => Buf.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  // { ok, name, exp } ou { ok: false, reason, msg }
  const verify = (raw) => {
    const key = String(raw || '').replace(/\s+/g, '');
    if (!crypto || !Buf) return { ok: false, reason: 'env', msg: 'Vérification impossible hors d\'After Effects.' };
    if (!/^YFX1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return { ok: false, reason: 'format', msg: 'Ce n\'est pas une clé YexoFX. Elle commence par « YFX1. ».' };
    const parts = key.split('.');
    let sigOk = false;
    try { sigOk = crypto.verify(null, Buf.from('YFX1.' + parts[1]), YX.PUBKEY_PEM, b64(parts[2])); } catch (e) { sigOk = false; }
    if (!sigOk) return { ok: false, reason: 'signature', msg: 'Clé invalide : vérifie que tu l\'as copiée en entier.' };
    let data;
    try { data = JSON.parse(b64(parts[1]).toString('utf8')); } catch (e) { return { ok: false, reason: 'format', msg: 'Clé illisible.' }; }
    if (data.m !== machineId()) return { ok: false, reason: 'machine', msg: 'Cette clé est liée à un autre PC (' + data.m + ').' };
    if (data.exp && Date.now() / 1000 > data.exp) return { ok: false, reason: 'expired', msg: 'Cette clé a expiré. Demande-en une nouvelle à Yexo.' };
    return { ok: true, name: data.n || '', exp: data.exp || null, key };
  };

  const stored = () => { try { return keyFile && fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : null; } catch (e) { return null; } };
  const check = () => { const k = stored(); return k ? verify(k) : { ok: false, reason: 'none' }; };
  const activate = (raw) => {
    const r = verify(raw);
    if (r.ok && keyFile) {
      try { fs.mkdirSync(path.dirname(keyFile), { recursive: true }); fs.writeFileSync(keyFile, r.key, 'utf8'); } catch (e) { r.warn = 'Clé valide mais non enregistrée : ' + e.message; }
    }
    return r;
  };
  const deactivate = () => { try { if (keyFile && fs.existsSync(keyFile)) fs.unlinkSync(keyFile); } catch (e) { /* déjà absent */ } };

  YX.licence = { machineId, verify, check, activate, deactivate, available: !!(crypto && Buf) };
})();
