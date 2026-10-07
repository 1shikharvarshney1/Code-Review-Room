import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { registerYjsHandlers } from './yjsHandlers.js';
import { registerReviewHandlers } from './reviewHandlers.js';

export function setupSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.data.user = {
        id: user._id.toString(),
        username: user.username,
        color: user.color,
      };
      
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.data.user.username})`);
    
    registerRoomHandlers(io, socket);
    registerYjsHandlers(io, socket);
    registerReviewHandlers(io, socket);
    
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
