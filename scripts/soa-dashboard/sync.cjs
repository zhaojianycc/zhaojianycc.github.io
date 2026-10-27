'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = 'zzzbm/mems-dashboard';
const RECORD = 'data/workspaces/zbm_dashboard.sqlite';
const OUT = path.join(ROOT, 'SOA-dashboard/dashboard.enc.json');
const STATE = path.join(ROOT, 'SOA-dashboard/source-state.json');
const TEMPLATE = path.join(__dirname, 'template.html');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const num = value => Number.parseFloat(value) || 0;
const round2 = value => Math.round(value * 100) / 100;

function decrypt(pack, config) {
  assert(pack.salt === config.salt, 'Key configuration does not match the existing password gate.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(config.key, 'base64'), Buffer.from(pack.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(pack.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(pack.data, 'base64')), decipher.final()]).toString('utf8');
}

// Match the management APP's cross-model OR-group and kit-availability rules.
function analyze(materials, bom) {
  const materialMap = new Map(materials.map(row => [row.code, row]));
  const globalGroups = {};
  for (const row of bom) {
    if (row.group) (globalGroups[row.group] ||= new Set()).add(row.material_code);
  }
  const models = [...new Set(bom.map(row => row.prototype_model))].sort();
  return models.map(model => {
    const groups = new Map();
    for (const row of bom.filter(item => item.prototype_model === model)) {
      const key = row.group ? '__grp__' + row.group : '__' + row.prototype_model + '_' + row.material_code;
      if (!groups.has(key)) groups.set(key, { codes: new Set(), perUnit: num(row.quantity_per_unit) || 1, isCritical: !!row.is_critical });
      for (const code of row.group ? globalGroups[row.group] : [row.material_code]) groups.get(key).codes.add(code);
    }
    const rows = [...groups.values()].map(group => {
      const items = [...group.codes].map(code => {
        const item = materialMap.get(code);
        return { code, name: item ? item.name : code, version: item ? item.version : null,
          unit: item ? item.unit : '', stock: item ? num(item.stock_quantity) : 0 };
      });
      const totalStock = items.reduce((total, item) => total + item.stock, 0);
      return { items, perUnit: group.perUnit, isCritical: group.isCritical, totalStock,
        support: Math.floor(totalStock / group.perUnit + 1e-9), gap: 0, isOr: items.length > 1 };
    });
    const criticals = rows.filter(row => row.isCritical);
    const maxUnits = criticals.length ? Math.min(...criticals.map(row => row.support)) : 0;
    for (const row of rows) row.gap = Math.max(0, round2(maxUnits * row.perUnit - row.totalStock));
    return { model, maxUnits, criticalCount: criticals.length, shortageCount: rows.filter(row => row.gap > 0).length, rows };
  });
}

function buildData(file, timestamp) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    assert(db.prepare('PRAGMA integrity_check').get().integrity_check === 'ok', 'Source database integrity check failed.');
    const metadata = Object.fromEntries(db.prepare('SELECT key, value FROM sync_meta').all().map(row => [row.key, row.value]));
    assert(metadata.format === 'mems-workspace-sqlite-v1' && metadata.name === 'zbm_dashboard', 'Unexpected source record.');
    const read = table => {
      const count = db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n;
      assert(count <= 10000, 'Source table exceeds the supported size.');
      return db.prepare('SELECT * FROM ' + table).all().map(row => {
        const out = { ...row };
        delete out.workspace_id;
        if (table === 'bom') { out.group = out.group_name; delete out.group_name; }
        if ('is_critical' in out) out.is_critical = !!out.is_critical;
        return out;
      });
    };
    const materials = read('materials').filter(row => row.deleted_at == null)
      .sort((a, b) => String(a.category).localeCompare(String(b.category)) || a.code.localeCompare(b.code));
    const bom = read('bom').sort((a, b) => a.prototype_model.localeCompare(b.prototype_model) || a.material_code.localeCompare(b.material_code));
    const heads = read('heads').sort((a, b) => a.head_id.localeCompare(b.head_id, 'zh-CN'));
    const prototypes = read('prototypes').sort((a, b) => a.serial_number.localeCompare(b.serial_number));
    const logs = read('stock_logs').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 50);
    return { generatedAt: timestamp, materials, heads, bom, prototypes, logs,
      analysis: { models: analyze(materials, bom), lowStockCount: materials.filter(row => num(row.stock_quantity) < 5).length,
        totalMaterials: materials.length, totalHeads: heads.length, totalPrototypes: prototypes.length } };
  } finally { db.close(); }
}

// The renderer uses innerHTML. Escape database strings without executing source-repository code.
function escapeData(value) {
  if (typeof value === 'string') return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  if (Array.isArray(value)) return value.map(escapeData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeData(item)]));
  return value;
}

function buildHtml(data) {
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  assert((template.match(/\{\{DASHBOARD_DATA\}\}/g) || []).length === 1, 'Dashboard template placeholder is invalid.');
  const safeData = escapeData(data);
  const html = template.replace('{{DASHBOARD_DATA}}', JSON.stringify(safeData).replace(/</g, '\\u003c'));
  const elements = new Map([['dashboardData', { textContent: JSON.stringify(safeData) }]]);
  const context = vm.createContext({ document: { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '' });
    return elements.get(id);
  } } });
  for (const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (!script[0].startsWith('<script id="dashboardData"')) new vm.Script(script[1]).runInContext(context, { timeout: 1000 });
  }
  for (const [id, expected] of [['inventoryBody', data.materials.length], ['headsBody', data.heads.length],
    ['prototypeBody', data.prototypes.length], ['analysisBody', data.analysis.models.length]]) {
    assert((elements.get(id).innerHTML.match(/<tr>/g) || []).length === expected, 'Dashboard rendering verification failed.');
  }
  return html;
}

function encrypt(html, config, timestamp) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(config.key, 'base64'), iv);
  const data = Buffer.concat([cipher.update(html, 'utf8'), cipher.final()]);
  const pack = { version: 1, kdf: 'PBKDF2-SHA-256', iterations: 210000, salt: config.salt,
    cipher: 'AES-GCM', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64'), publishedAt: timestamp };
  assert(decrypt(pack, config) === html, 'Encrypted round-trip verification failed.');
  return pack;
}

async function main() {
  assert(process.env.MEMS_SOURCE_TOKEN, 'Missing MEMS_SOURCE_TOKEN repository secret.');
  assert(process.env.SOA_KEY_CONFIG, 'Missing SOA_KEY_CONFIG repository secret.');
  const config = JSON.parse(process.env.SOA_KEY_CONFIG);
  assert(Buffer.from(config.key, 'base64').length === 32 && config.salt, 'Invalid encryption configuration.');
  const checkFile = path.join(ROOT, 'SOA-dashboard/password-check.enc.json');
  const check = JSON.parse(fs.readFileSync(checkFile, 'utf8'));
  assert(decrypt(check, config) === 'SOA-DASHBOARD-PASSWORD-CHECK-V1', 'Existing password validation failed.');
  const fingerprint = hash(Buffer.concat([fs.readFileSync(__filename), fs.readFileSync(TEMPLATE), fs.readFileSync(checkFile)]));
  const response = await fetch(`https://api.github.com/repos/${SOURCE}/contents/${RECORD}?ref=main`, {
    headers: { Authorization: 'Bearer ' + process.env.MEMS_SOURCE_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'SOA-dashboard-auto-sync' },
    signal: AbortSignal.timeout(30000),
  });
  assert(response.ok, 'Cannot read the shared record; GitHub HTTP ' + response.status + '. Check source-token access/expiry.');
  const remote = await response.json();
  assert(remote.type === 'file' && remote.encoding === 'base64' && remote.size < 1024 * 1024, 'Unsupported source file size or format.');
  const bytes = Buffer.from(remote.content, 'base64');
  const blob = crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
  assert(blob === remote.sha, 'Downloaded source checksum does not match GitHub.');
  const previous = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
  const current = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  if (previous.sourceBlob === blob && previous.publisherHash === fingerprint && previous.payloadHash === hash(JSON.stringify(current))) {
    console.log('The authoritative record is unchanged; no publication needed.');
    return;
  }
  const temporary = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'soa-record-'));
  try {
    const file = path.join(temporary, 'record.sqlite');
    fs.writeFileSync(file, bytes, { mode: 0o600 });
    const timestamp = new Date().toISOString();
    const html = buildHtml(buildData(file, timestamp));
    const pack = encrypt(html, config, timestamp);
    const state = { source: SOURCE, record: 'zbm_dashboard', sourceBlob: blob,
      publisherHash: fingerprint, payloadHash: hash(JSON.stringify(pack)), publishedAt: timestamp };
    // No database, decrypted HTML, passwords, or derived keys enter the website repository.
    fs.writeFileSync(OUT, JSON.stringify(pack) + '\n');
    fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
    console.log('Authoritative record validated; encrypted dashboard and source fingerprint updated.');
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

module.exports = { analyze, buildData, buildHtml, escapeData, encrypt, decrypt, synchronize: main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
