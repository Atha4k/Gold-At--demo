import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { JournalEntry } from '../shared/types.js';

fs.mkdirSync(path.resolve('data'), { recursive: true });
export const db: Database.Database = new Database(path.resolve('data/gold-intel.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS journal (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
export const getJournal = (): JournalEntry[] => db.prepare('SELECT id, payload FROM journal ORDER BY id DESC').all().map((r: any) => ({ id: r.id, ...JSON.parse(r.payload) }));
export const saveJournal = (entry: JournalEntry) => {
  const info = db.prepare('INSERT INTO journal(payload, created_at) VALUES (?, ?)').run(JSON.stringify(entry), new Date().toISOString());
  return { id: Number(info.lastInsertRowid), ...entry };
};
