import { z } from 'zod';
import Room from '../models/Room.js';
import { generateRoomCode } from '../utils/roomCode.js';

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'html', 'css', 'json']),
});

const joinRoomSchema = z.object({
  code: z.string().length(6).toUpperCase(),
});

export async function createRoom(req, res, next) {
  try {
    const body = createRoomSchema.parse(req.body);

    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 100) {
        return res.status(500).json({ message: 'Could not generate unique room code' });
      }
    } while (await Room.findOne({ code }));

    const room = await Room.create({
      code,
      name: body.name,
      language: body.language,
      owner: req.user._id,
      members: [req.user._id],
    });

    const populated = await Room.findById(room._id)
      .populate('owner', 'username email color')
      .populate('members', 'username email color');

    res.status(201).json({ room: populated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    next(err);
  }
}

export async function joinRoom(req, res, next) {
  try {
    const body = joinRoomSchema.parse(req.body);

    const room = await Room.findOne({ code: body.code })
      .populate('owner', 'username email color')
      .populate('members', 'username email color');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      room.members.push(req.user._id);
      await room.save();
      await room.populate('members', 'username email color');
    }

    res.json({ room });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    next(err);
  }
}

export async function listRooms(req, res, next) {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('owner', 'username email color')
      .populate('members', 'username email color')
      .sort({ updatedAt: -1 });

    res.json({ rooms });
  } catch (err) {
    next(err);
  }
}

export async function getRoom(req, res, next) {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() })
      .populate('owner', 'username email color')
      .populate('members', 'username email color');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    res.json({ room });
  } catch (err) {
    next(err);
  }
}
