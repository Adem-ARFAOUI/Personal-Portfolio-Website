/**
 * Tiny file-based JSON datastore.
 *
 * This portfolio is small enough that a real database is overkill. This
 * module stores everything in data/db.json and gives you the same shape
 * of API a real DB would (get all, get by id, insert, update, remove),
 * with writes serialized so two requests can't corrupt the file.
 */
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

const DEFAULT_DATA = {
  users: [],
  projects: [],
  posts: [],
  messages: [],
  settings: {
    cvFile: null,
  },
};

function readRaw() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
  }
  const text = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("data/db.json is corrupted JSON: " + err.message);
  }
}

// Serialize writes so concurrent requests never interleave and corrupt the file.
let writeQueue = Promise.resolve();
function writeRaw(data) {
  writeQueue = writeQueue.then(
    () =>
      new Promise((resolve, reject) => {
        const tmpPath = DB_PATH + ".tmp";
        fs.writeFile(tmpPath, JSON.stringify(data, null, 2), (err) => {
          if (err) return reject(err);
          fs.rename(tmpPath, DB_PATH, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      }),
  );
  return writeQueue;
}

function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

const db = {
  read: readRaw,

  getAll(collection) {
    const data = readRaw();
    return data[collection] || [];
  },

  getById(collection, id) {
    const data = readRaw();
    return (data[collection] || []).find((item) => item.id === Number(id));
  },

  find(collection, predicate) {
    const data = readRaw();
    return (data[collection] || []).find(predicate);
  },

  filter(collection, predicate) {
    const data = readRaw();
    return (data[collection] || []).filter(predicate);
  },

  async insert(collection, item) {
    const data = readRaw();
    if (!data[collection]) data[collection] = [];
    const record = { id: nextId(data[collection]), ...item };
    data[collection].push(record);
    await writeRaw(data);
    return record;
  },

  async update(collection, id, patch) {
    const data = readRaw();
    const list = data[collection] || [];
    const idx = list.findIndex((item) => item.id === Number(id));
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, id: list[idx].id };
    await writeRaw(data);
    return list[idx];
  },

  async remove(collection, id) {
    const data = readRaw();
    const list = data[collection] || [];
    const idx = list.findIndex((item) => item.id === Number(id));
    if (idx === -1) return false;
    list.splice(idx, 1);
    await writeRaw(data);
    return true;
  },

  async setSettings(patch) {
    const data = readRaw();
    data.settings = { ...data.settings, ...patch };
    await writeRaw(data);
    return data.settings;
  },

  getSettings() {
    const data = readRaw();
    return data.settings || {};
  },
};

module.exports = db;
