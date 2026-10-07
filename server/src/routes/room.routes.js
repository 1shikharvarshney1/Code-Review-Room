import { Router } from 'express';
import { createRoom, joinRoom, listRooms, getRoom } from '../controllers/room.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, createRoom);
router.post('/join', authMiddleware, joinRoom);
router.get('/', authMiddleware, listRooms);
router.get('/:code', authMiddleware, getRoom);

export default router;
