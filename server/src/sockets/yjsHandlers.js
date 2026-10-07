import * as Y from 'yjs';
import Room from '../models/Room.js';
import { getDoc, getDocIfLoaded, validateUpdateSize } from '../services/docStore.js';

export function registerYjsHandlers(io, socket) {
  socket.on('yjs:sync-request', async ({ code }) => {
    try {
      if (!code) {
        socket.emit('app:error', { message: 'Room code is required' });
        return;
      }

      const upperCode = code.toUpperCase();

      const isMember = await verifyMembership(socket, upperCode);
      if (!isMember) return;

      const doc = await getDoc(upperCode);
      const update = Y.encodeStateAsUpdate(doc);
      socket.emit('yjs:sync', { update: Buffer.from(update) });
    } catch (err) {
      console.error('yjs:sync-request error:', err.message);
      socket.emit('app:error', { message: 'Failed to sync document' });
    }
  });

  socket.on('yjs:update', async ({ code, update }) => {
    try {
      if (!code || !socket.data.rooms.has(code.toUpperCase())) {
        socket.emit('app:error', { message: 'Not in this room' });
        return;
      }

      const upperCode = code.toUpperCase();

      const isMember = await verifyMembership(socket, upperCode);
      if (!isMember) return;

      const raw = new Uint8Array(update);
      validateUpdateSize(raw);

      const doc = getDocIfLoaded(upperCode);
      if (doc) {
        Y.applyUpdate(doc, raw);
      }

      socket.to(upperCode).emit('yjs:update', { update });
    } catch (err) {
      console.error('yjs:update error:', err.message);
      socket.emit('app:error', { message: err.message || 'Failed to apply update' });
    }
  });

  socket.on('awareness:update', async ({ code, update }) => {
    try {
      if (!code || !socket.data.rooms.has(code.toUpperCase())) return;
      const upperCode = code.toUpperCase();
      socket.to(upperCode).emit('awareness:update', { update });
    } catch (err) {
      console.error('awareness:update error:', err.message);
    }
  });
}

async function verifyMembership(socket, code) {
  const room = await Room.findOne({ code });
  if (!room) {
    socket.emit('app:error', { message: 'Room not found' });
    return false;
  }
  const isMember = room.members.some(
    m => m.toString() === socket.data.user.id
  );
  if (!isMember) {
    socket.emit('app:error', { message: 'Not a member of this room' });
    return false;
  }
  return true;
}
