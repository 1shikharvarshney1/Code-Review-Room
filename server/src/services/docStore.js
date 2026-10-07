import * as Y from 'yjs';
import Room from '../models/Room.js';

const docs = new Map();

const PERSIST_INTERVAL = 5000;
const MAX_UPDATE_SIZE = 1 * 1024 * 1024;

export function validateUpdateSize(update) {
  if (update && update.byteLength > MAX_UPDATE_SIZE) {
    throw new Error('Update too large (max 1 MB)');
  }
}

export async function getDoc(code) {
  if (docs.has(code)) {
    const entry = docs.get(code);
    entry.users++;
    return entry.doc;
  }

  const doc = new Y.Doc();
  const room = await Room.findOne({ code });

  if (room && room.ydocState) {
    Y.applyUpdate(doc, new Uint8Array(room.ydocState));
  }

  const entry = { doc, dirty: false, timer: null, users: 1 };

  doc.on('update', () => {
    entry.dirty = true;
  });

  entry.timer = setInterval(async () => {
    if (entry.dirty) {
      entry.dirty = false;
      await persistDoc(code, doc);
    }
  }, PERSIST_INTERVAL);

  docs.set(code, entry);
  return doc;
}

export async function releaseDoc(code) {
  const entry = docs.get(code);
  if (!entry) return;

  entry.users--;
  if (entry.users <= 0) {
    clearInterval(entry.timer);
    await persistDoc(code, entry.doc);
    entry.doc.destroy();
    docs.delete(code);
  }
}

export function getCode(code) {
  const entry = docs.get(code);
  if (!entry) return '';
  return entry.doc.getText('monaco').toString();
}

export function getDocIfLoaded(code) {
  const entry = docs.get(code);
  return entry ? entry.doc : null;
}

async function persistDoc(code, doc) {
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    await Room.updateOne({ code }, { ydocState: state });
  } catch (err) {
    console.error(`Failed to persist doc for room ${code}:`, err.message);
  }
}
