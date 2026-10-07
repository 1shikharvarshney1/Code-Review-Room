import crypto from 'crypto';
import Room from '../models/Room.js';
import Review from '../models/Review.js';
import { getCode } from '../services/docStore.js';
import { streamReview, getProvider } from '../services/llmService.js';
import { createParser } from '../services/reviewParser.js';
import env from '../config/env.js';

const lockedRooms = new Set();
const cooldowns = new Map();

export function registerReviewHandlers(io, socket) {
  socket.on('review:request', async ({ code }) => {
    const upperCode = code ? code.toUpperCase() : '';

    try {
      if (!upperCode || !socket.data.rooms.has(upperCode)) {
        socket.emit('app:error', { message: 'Not in this room' });
        return;
      }

      const room = await Room.findOne({ code: upperCode });
      if (!room) {
        socket.emit('app:error', { message: 'Room not found' });
        return;
      }

      const isMember = room.members.some(
        m => m.toString() === socket.data.user.id
      );
      if (!isMember) {
        socket.emit('app:error', { message: 'Not a member of this room' });
        return;
      }

      if (lockedRooms.has(upperCode)) {
        socket.emit('review:error', { message: 'A review is already in progress' });
        return;
      }

      const lastFinished = cooldowns.get(upperCode);
      if (lastFinished) {
        const elapsed = (Date.now() - lastFinished) / 1000;
        if (elapsed < env.REVIEW_COOLDOWN_SECONDS) {
          const wait = Math.ceil(env.REVIEW_COOLDOWN_SECONDS - elapsed);
          socket.emit('review:error', {
            message: `Please wait ${wait} seconds before the next review`,
          });
          return;
        }
      }

      const codeText = getCode(upperCode);
      if (!codeText || codeText.trim().length === 0) {
        socket.emit('review:error', { message: 'The editor is empty. Write some code first.' });
        return;
      }

      const lineCount = codeText.split('\n').length;
      if (lineCount > env.MAX_REVIEW_LINES) {
        socket.emit('review:error', {
          message: `Code exceeds the maximum of ${env.MAX_REVIEW_LINES} lines (currently ${lineCount} lines). Reduce the code to request a review.`,
        });
        return;
      }

      lockedRooms.add(upperCode);

      const provider = getProvider();
      const review = await Review.create({
        room: room._id,
        requestedBy: socket.data.user.id,
        status: 'streaming',
        provider,
        comments: [],
      });

      io.to(upperCode).emit('review:started', {
        reviewId: review._id.toString(),
        requestedBy: socket.data.user.username,
        provider,
      });

      try {
        const parser = createParser();
        const totalLines = lineCount;

        for await (const textDelta of streamReview({
          code: codeText,
          language: room.language,
        })) {
          for (const parsed of parser.feed(textDelta)) {
            if (parsed.type === 'comment') {
              const comment = {
                id: crypto.randomUUID(),
                line: Math.max(1, Math.min(parsed.line, totalLines)),
                endLine: Math.max(1, Math.min(parsed.endLine, totalLines)),
                severity: parsed.severity,
                category: parsed.category,
                message: parsed.message,
                suggestedFix: parsed.suggestedFix || '',
                status: 'open',
              };

              review.comments.push(comment);
              await review.save();

              io.to(upperCode).emit('review:comment', {
                reviewId: review._id.toString(),
                comment,
              });
            } else if (parsed.type === 'summary') {
              review.summary = parsed.summary;
              await review.save();

              io.to(upperCode).emit('review:summary', {
                reviewId: review._id.toString(),
                summary: parsed.summary,
              });
            }
          }
        }

        for (const parsed of parser.flush()) {
          if (parsed.type === 'comment') {
            const comment = {
              id: crypto.randomUUID(),
              line: Math.max(1, Math.min(parsed.line, totalLines)),
              endLine: Math.max(1, Math.min(parsed.endLine, totalLines)),
              severity: parsed.severity,
              category: parsed.category,
              message: parsed.message,
              suggestedFix: parsed.suggestedFix || '',
              status: 'open',
            };

            review.comments.push(comment);
            await review.save();

            io.to(upperCode).emit('review:comment', {
              reviewId: review._id.toString(),
              comment,
            });
          } else if (parsed.type === 'summary') {
            review.summary = parsed.summary;
            await review.save();

            io.to(upperCode).emit('review:summary', {
              reviewId: review._id.toString(),
              summary: parsed.summary,
            });
          }
        }

        review.status = 'done';
        await review.save();
        io.to(upperCode).emit('review:done', {
          reviewId: review._id.toString(),
        });
      } catch (streamErr) {
        console.error('Review stream error:', streamErr.message);

        review.status = 'error';
        await review.save();

        let userMessage = 'An error occurred during the AI review.';
        const errMsg = streamErr.message || '';
        const errStatus = streamErr.status || streamErr.httpStatusCode || 0;

        if (errStatus === 429 || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
          userMessage = 'AI rate limit reached. Please wait a minute and try again.';
        } else if (errStatus === 404 || errMsg.includes('not found') || errMsg.includes('NOT_FOUND')) {
          userMessage = 'The configured GEMINI_MODEL is not available. Check the model name in Google AI Studio.';
        }

        io.to(upperCode).emit('review:error', { message: userMessage });
      }
    } catch (err) {
      console.error('review:request error:', err.message);
      socket.emit('review:error', { message: 'Failed to start review' });
    } finally {
      lockedRooms.delete(upperCode);
      cooldowns.set(upperCode, Date.now());
    }
  });

  socket.on('comment:status', async ({ reviewId, commentId, status }) => {
    try {
      if (!reviewId || !commentId || !['open', 'accepted', 'dismissed'].includes(status)) {
        socket.emit('app:error', { message: 'Invalid comment status update' });
        return;
      }

      const review = await Review.findById(reviewId);
      if (!review) {
        socket.emit('app:error', { message: 'Review not found' });
        return;
      }

      const room = await Room.findById(review.room);
      if (!room) {
        socket.emit('app:error', { message: 'Room not found' });
        return;
      }

      const isMember = room.members.some(
        m => m.toString() === socket.data.user.id
      );
      if (!isMember) {
        socket.emit('app:error', { message: 'Not a member of this room' });
        return;
      }

      const comment = review.comments.find(c => c.id === commentId);
      if (!comment) {
        socket.emit('app:error', { message: 'Comment not found' });
        return;
      }

      comment.status = status;
      await review.save();

      io.to(room.code).emit('comment:updated', {
        reviewId: review._id.toString(),
        comment: comment.toObject(),
      });
    } catch (err) {
      console.error('comment:status error:', err.message);
      socket.emit('app:error', { message: 'Failed to update comment status' });
    }
  });
}
