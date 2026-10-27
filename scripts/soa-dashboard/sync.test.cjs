const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { analyze, buildData, buildHtml, escapeData, encrypt, decrypt } = require('./sync.cjs');

test('OR alternatives share stock across models; fractional tooling is supported', () => {
  const materials = [{ code: 'A', stock_quantity: 1 }, { code: 'B', stock_quantity: 2 }];
  const bom = [{ prototype_model: '18', material_code: 'A', group: 'chip', quantity_per_unit: 0.5, is_critical: true },
    { prototype_model: '24', material_code: 'B', group: 'chip', quantity_per_unit: 1, is_critical: true }];
  const result = analyze(materials, bom);
  assert.deepEqual(result.map(row => [row.model, row.maxUnits]), [['18', 6], ['24', 3]]);
  assert.equal(result[0].rows[0].totalStock, 3);
});

test('dashboard encryption retains the password-derived key and rejects tampering', () => {
  const salt = crypto.randomBytes(16);
  const password = 'test-only-shared-password';
  const config = { key: crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('base64'), salt: salt.toString('base64') };
  const pack = encrypt('<h1>test</h1>', config, '2026-10-27T00:00:00Z');
  const browserKey = crypto.pbkdf2Sync(password, Buffer.from(pack.salt, 'base64'), pack.iterations, 32, 'sha256');
  assert.equal(browserKey.toString('base64'), config.key);
  assert.equal(decrypt(pack, config), '<h1>test</h1>');
  assert.notEqual(pack.iv, encrypt('<h1>test</h1>', config, pack.publishedAt).iv);
  const bad = Buffer.from(pack.data, 'base64'); bad[0] ^= 1;
  assert.throws(() => decrypt({ ...pack, data: bad.toString('base64') }, config));
});

test('SQLite records render safely; isolated end-to-end synchronization skips unchanged records', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'soa-publisher-test-'));
  const file = path.join(folder, 'record.sqlite');
  const db = new DatabaseSync(file);
  try {
    db.exec(`
      CREATE TABLE sync_meta(key TEXT, value TEXT);
      INSERT INTO sync_meta VALUES('format','mems-workspace-sqlite-v1'),('name','zbm_dashboard');
      CREATE TABLE materials(code TEXT, name TEXT, category TEXT, stock_quantity REAL, unit TEXT, deleted_at TEXT);
      CREATE TABLE bom(prototype_model TEXT, material_code TEXT, quantity_per_unit REAL, is_critical INTEGER, group_name TEXT);
      CREATE TABLE heads(head_id TEXT, chip TEXT, owner TEXT, location TEXT, status TEXT);
      CREATE TABLE prototypes(serial_number TEXT, model TEXT, status TEXT, destination TEXT, built_date TEXT, updated_at TEXT);
      CREATE TABLE stock_logs(created_at TEXT);
      INSERT INTO materials VALUES('A','active','main',3,'pcs',NULL),('Z','deleted','main',20,'pcs','deleted');
      INSERT INTO bom VALUES('SOA-24','A',1,1,NULL);
      INSERT INTO heads VALUES('H1','24','test','shelf','ready');
      INSERT INTO prototypes VALUES('P1','SOA-24','在库','','2026-10-27','2026-10-27');
    `);
  } finally { db.close(); }
  try {
    const data = buildData(file, '2026-10-27T00:00:00Z');
    assert.equal(data.materials.length, 1);
    assert.equal(data.analysis.models[0].maxUnits, 3);
    assert.equal(data.heads.length, 1);
    const injection = '</script><img src=x onerror=alert(1)>';
    data.materials[0].name = injection;
    const html = buildHtml(data);
    assert(!html.includes(injection));
    assert(html.includes('&lt;img'));
    assert.equal(escapeData('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');

    // An isolated website and fake GitHub response exercise the complete publisher.
    // Only synthetic credentials are used; no network connections are made.
    const site = path.join(folder, 'site');
    const publisher = path.join(site, 'scripts/soa-dashboard');
    const output = path.join(site, 'SOA-dashboard');
    fs.mkdirSync(publisher, { recursive: true });
    fs.mkdirSync(output, { recursive: true });
    fs.copyFileSync(__filename.replace('sync.test.cjs', 'sync.cjs'), path.join(publisher, 'sync.cjs'));
    fs.copyFileSync(path.join(__dirname, 'template.html'), path.join(publisher, 'template.html'));
    const config = { key: crypto.randomBytes(32).toString('base64'), salt: crypto.randomBytes(16).toString('base64') };
    fs.writeFileSync(path.join(output, 'password-check.enc.json'), JSON.stringify(encrypt('SOA-DASHBOARD-PASSWORD-CHECK-V1', config, data.generatedAt)));
    const originalFetch = global.fetch;
    const originalToken = process.env.MEMS_SOURCE_TOKEN;
    const originalKey = process.env.SOA_KEY_CONFIG;
    let bytes = fs.readFileSync(file);
    global.fetch = async url => {
      assert(String(url).startsWith('https://api.github.com/repos/zzzbm/mems-dashboard/contents/'));
      return { ok: true, status: 200, json: async () => ({ type: 'file', encoding: 'base64', size: bytes.length,
        content: bytes.toString('base64'), sha: crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex') }) };
    };
    process.env.MEMS_SOURCE_TOKEN = 'synthetic-offline-test-token';
    process.env.SOA_KEY_CONFIG = JSON.stringify(config);
    try {
      const isolated = require(path.join(publisher, 'sync.cjs'));
      await isolated.synchronize();
      const first = fs.readFileSync(path.join(output, 'dashboard.enc.json'), 'utf8');
      assert(decrypt(JSON.parse(first), config).includes('SOA-24'));
      await isolated.synchronize();
      assert.equal(fs.readFileSync(path.join(output, 'dashboard.enc.json'), 'utf8'), first);
      const edit = new DatabaseSync(file);
      try { edit.exec("UPDATE materials SET stock_quantity = 4 WHERE code = 'A'"); } finally { edit.close(); }
      bytes = fs.readFileSync(file);
      await isolated.synchronize();
      const next = fs.readFileSync(path.join(output, 'dashboard.enc.json'), 'utf8');
      assert.notEqual(next, first);
      const decoded = decrypt(JSON.parse(next), config);
      const nextData = JSON.parse(decoded.match(/<script id="dashboardData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
      assert.equal(nextData.materials[0].stock_quantity, 4);
    } finally {
      global.fetch = originalFetch;
      if (originalToken === undefined) delete process.env.MEMS_SOURCE_TOKEN; else process.env.MEMS_SOURCE_TOKEN = originalToken;
      if (originalKey === undefined) delete process.env.SOA_KEY_CONFIG; else process.env.SOA_KEY_CONFIG = originalKey;
    }
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});
