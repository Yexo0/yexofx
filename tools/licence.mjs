// Licences YexoFX : clé signée (Ed25519), liée à un PC. Rien n'est envoyé sur Internet.
//   node tools/licence.mjs keygen            crée la paire de clés (keys/) et cep/js/pubkey.js
//   node tools/licence.mjs machine           affiche l'ID machine de CE PC
//   node tools/licence.mjs issue <ID> <nom> [--days 365]
//                                            génère la clé à envoyer à la personne (liée à son ID machine)
// La clé privée (keys/yexofx_private.pem) ne doit JAMAIS être partagée ni copiée dans cep/.
import { generateKeyPairSync, createPrivateKey, sign, createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRIV = join(ROOT, "keys", "yexofx_private.pem");
const PUB = join(ROOT, "keys", "yexofx_public.pem");
const PUBJS = join(ROOT, "cep", "js", "pubkey.js");

// Même calcul que cep/js/licence.js : sha256("yexofx|" + MachineGuid Windows), 16 hex en 4 groupes.
export function machineGuid() {
  try {
    const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { windowsHide: true }).toString();
    const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
    if (m) return m[1].toLowerCase();
  } catch (e) { /* hors Windows */ }
  return hostname() + "|" + userInfo().username;
}
export function machineId(guid = machineGuid()) {
  const h = createHash("sha256").update("yexofx|" + guid).digest("hex").slice(0, 16).toUpperCase();
  return h.match(/.{4}/g).join("-");
}
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function issue(id, name, days, privPem = readFileSync(PRIV, "utf8")) {
  if (!/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(id)) throw new Error("ID machine invalide : " + id + " (format XXXX-XXXX-XXXX-XXXX)");
  const now = Math.floor(Date.now() / 1000);
  const payload = { v: 1, n: String(name || "").slice(0, 40), m: id, iat: now, exp: days ? now + days * 86400 : null };
  const p = b64url(JSON.stringify(payload));
  const s = b64url(sign(null, Buffer.from("YFX1." + p), createPrivateKey(privPem)));
  return "YFX1." + p + "." + s;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "keygen") {
  if (existsSync(PRIV) && !args.includes("--force")) {
    console.error("Une clé privée existe déjà (" + PRIV + ").\nLa remplacer invaliderait TOUTES les licences déjà données. Ajoute --force si c'est vraiment voulu.");
    process.exit(1);
  }
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  mkdirSync(dirname(PRIV), { recursive: true });
  writeFileSync(PRIV, privateKey.export({ type: "pkcs8", format: "pem" }));
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  writeFileSync(PUB, pubPem);
  writeFileSync(PUBJS, "/* Clé publique des licences YexoFX (générée par tools/licence.mjs keygen). */\nwindow.YX = window.YX || {};\nwindow.YX.PUBKEY_PEM = " + JSON.stringify(pubPem) + ";\n");
  console.log("OK  paire de clés créée : keys/ (privée, à garder pour toi) + cep/js/pubkey.js (publique)");
} else if (cmd === "machine") {
  console.log(machineId());
} else if (cmd === "issue") {
  const [id, name] = args;
  const di = args.indexOf("--days");
  const days = di >= 0 ? Number(args[di + 1]) : null;
  if (!id) { console.error('Usage : node tools/licence.mjs issue <ID-MACHINE> "<nom>" [--days 365]'); process.exit(1); }
  console.log(issue(id.toUpperCase(), name, days));
} else if (cmd) {
  console.error("Commande inconnue : " + cmd);
  process.exit(1);
} else {
  console.log("Usage : node tools/licence.mjs keygen | machine | issue <ID> <nom> [--days N]");
}
