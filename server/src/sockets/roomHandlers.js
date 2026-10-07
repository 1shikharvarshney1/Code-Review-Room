import Room from '../models/Room.js';
import Review from '../models/Review.js';
import { getDoc, releaseDoc } from '../services/docStore.js';

const presence = new Map();

function getPresenceList(code) {
  const room = presence.get(code);
  if (!room) return [];

  const seen = new Set();
  const users = [];
  for (const user of room.values()) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      users.push(user);
    }
  }
  return users;
}

export function registerRoomHandlers(io, socket) {
  socket.data.rooms = new Set();

  socket.on('room:join', async ({ code }) => {
    try {
      if (!code) {
        socket.emit('app:error', { message: 'Room code is required' });
        return;
      }

      const upperCode = code.toUpperCase();
      const room = await Room.findOne({ code: upperCode })
        .populate('members', 'username email color');

      if (!room) {
        socket.emit('app:error', { message: 'Room not found' });
        return;
      }

      const isMember = room.members.some(
        m => m._id.toString() === socket.data.user.id
      );
      if (!isMember) {
        socket.emit('app:error', { message: 'You are not a member of this room' });
        return;
      }

      socket.join(upperCode);
      socket.data.rooms.add(upperCode);

      await getDoc(upperCode);

      if (!presence.has(upperCode)) {
        presence.set(upperCode, new Map());
      }
      presence.get(upperCode).set(socket.id, socket.data.user);

      const latestReview = await Review.findOne({ room: room._id })
        .sort({ createdAt: -1 })
        .lean();

      let reviewPayload = null;
      if (latestReview) {
        reviewPayload = {
          ...latestReview,
          id: latestReview._id,
        };
        delete reviewPayload._id;
        delete reviewPayload.__v;
      }

      const currentUsers = getPresenceList(upperCode);

      socket.emit('room:joined', {
        room: {
          code: upperCode,
          name: room.name,
          language: room.language,
        },
        users: currentUsers,
        latestReview: reviewPayload,
      });

      io.to(upperCode).emit('presence:update', {
        users: currentUsers,
      });
    } catch (err) {
      console.error('room:join error:', err.message);
      socket.emit('app:error', { message: 'Failed to join room' });
    }
  });

  socket.on('room:leave', async ({ code }) => {
    try {
      if (!code) return;
      const upperCode = code.toUpperCase();
      await leaveRoom(io, socket, upperCode);
    } catch (err) {
      console.error('room:leave error:', err.message);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const rooms = Array.from(socket.data.rooms || []);
      for (const code of rooms) {
        await leaveRoom(io, socket, code);
      }
    } catch (err) {
      console.error('disconnect error:', err.message);
    }
  });
}

async function leaveRoom(io, socket, code) {
  socket.leave(code);
  socket.data.rooms.delete(code);

  const roomPresence = presence.get(code);
  if (roomPresence) {
    roomPresence.delete(socket.id);
    if (roomPresence.size === 0) {
      presence.delete(code);
      await releaseDoc(code);
    }
  }

  io.to(code).emit('presence:update', {
    users: getPresenceList(code),
  });
}

export { presence, getPresenceList };
