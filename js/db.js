// IndexedDB による端末内保存。相談記録・自分へのメモはすべてここに置く。
// 外部への送信は一切行わない。

const DB_NAME = 'kimochi-seiri';
const DB_VERSION = 1;
// 2: scenario / perspectiveResponse / todayMessage を追加（既存記録は空文字で補う）
export const SCHEMA_VERSION = 2;

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      // 将来の拡張はここに oldVersion ごとの分岐を足す
      if (e.oldVersion < 1) {
        const records = db.createObjectStore('records', { keyPath: 'id' });
        records.createIndex('createdAt', 'createdAt');
        records.createIndex('status', 'status');
        const memos = db.createObjectStore('memos', { keyPath: 'id' });
        memos.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('transaction aborted'));
  }));
}

const wrap = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 記録の形をそろえる。古い記録やインポートした記録にも使う。
export function normalizeRecord(r = {}) {
  const now = new Date().toISOString();
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const str = (v) => (typeof v === 'string' ? v : '');
  return {
    ...r, // 将来追加されたフィールドを落とさない
    id: str(r.id) || newId(),
    schemaVersion: SCHEMA_VERSION,
    status: r.status === 'saved' ? 'saved' : 'draft',
    createdAt: str(r.createdAt) || now,
    updatedAt: str(r.updatedAt) || now,
    initialMood: str(r.initialMood),
    eventText: str(r.eventText),
    emotions: arr(r.emotions),
    facts: arr(r.facts),
    interpretations: arr(r.interpretations),
    unknowns: arr(r.unknowns),
    coreConcern: str(r.coreConcern),
    chosenAction: str(r.chosenAction),
    adviceViewed: r.adviceViewed === true,
    outcome: str(r.outcome),
    outcomeNote: str(r.outcomeNote),
    outcomeDate: str(r.outcomeDate),
    personalMemo: str(r.personalMemo),
    replyDraft: str(r.replyDraft),
    reflectionNote: str(r.reflectionNote),
    safetyFlag: r.safetyFlag === true,
    scenario: str(r.scenario),
    perspectiveResponse: str(r.perspectiveResponse),
    todayMessage: str(r.todayMessage),
  };
}

export function normalizeMemo(m = {}) {
  const now = new Date().toISOString();
  return {
    ...m,
    id: typeof m.id === 'string' && m.id ? m.id : newId(),
    text: typeof m.text === 'string' ? m.text : '',
    createdAt: m.createdAt || now,
    updatedAt: m.updatedAt || now,
  };
}

// ---- records ----
export function saveRecord(record, { touch = true } = {}) {
  const r = normalizeRecord(record);
  if (touch) r.updatedAt = new Date().toISOString();
  return tx('records', 'readwrite', (s) => wrap(s.put(r))).then(() => r);
}

export function getRecord(id) {
  return tx('records', 'readonly', (s) => wrap(s.get(id)))
    .then((r) => (r ? normalizeRecord(r) : null));
}

export function getAllRecords() {
  return tx('records', 'readonly', (s) => wrap(s.getAll()))
    .then((list) => list.map(normalizeRecord).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function deleteRecord(id) {
  return tx('records', 'readwrite', (s) => wrap(s.delete(id)));
}

// ---- memos ----
export function saveMemo(memo) {
  const m = normalizeMemo(memo);
  m.updatedAt = new Date().toISOString();
  return tx('memos', 'readwrite', (s) => wrap(s.put(m))).then(() => m);
}

export function getAllMemos() {
  return tx('memos', 'readonly', (s) => wrap(s.getAll()))
    .then((list) => list.map(normalizeMemo).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function deleteMemo(id) {
  return tx('memos', 'readwrite', (s) => wrap(s.delete(id)));
}

// ---- backup ----
export async function exportAll() {
  const [records, memos] = await Promise.all([getAllRecords(), getAllMemos()]);
  return {
    app: 'kimochi-seiri',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records,
    memos,
  };
}

// 既存データは消さずに統合する。同じ id があれば updatedAt が新しい方を残す。
export async function importAll(data) {
  if (!data || typeof data !== 'object' || data.app !== 'kimochi-seiri') {
    throw new Error('invalid-format');
  }
  const records = Array.isArray(data.records) ? data.records : [];
  const memos = Array.isArray(data.memos) ? data.memos : [];
  const count = { added: 0, updated: 0, skipped: 0 };

  const merge = (storeName, items, normalize) => tx(storeName, 'readwrite', async (s) => {
    for (const raw of items) {
      if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') { count.skipped++; continue; }
      const item = normalize(raw);
      const existing = await wrap(s.get(item.id));
      if (!existing) { await wrap(s.put(item)); count.added++; }
      else if ((item.updatedAt || '') > (existing.updatedAt || '')) { await wrap(s.put(item)); count.updated++; }
      else count.skipped++;
    }
  });

  await merge('records', records, normalizeRecord);
  await merge('memos', memos, normalizeMemo);
  return count;
}

export function clearAll() {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(['records', 'memos'], 'readwrite');
    t.objectStore('records').clear();
    t.objectStore('memos').clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}
