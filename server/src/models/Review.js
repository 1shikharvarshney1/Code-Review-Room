import mongoose from 'mongoose';
import crypto from 'crypto';

const commentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    line: { type: Number, required: true },
    endLine: { type: Number, required: true },
    severity: {
      type: String,
      required: true,
      enum: ['bug', 'security', 'performance', 'style'],
    },
    category: { type: String, required: true },
    message: { type: String, required: true },
    suggestedFix: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'accepted', 'dismissed'],
      default: 'open',
    },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['streaming', 'done', 'error'],
      default: 'streaming',
    },
    summary: {
      type: String,
      default: '',
    },
    provider: {
      type: String,
      enum: ['gemini', 'mock'],
      required: true,
    },
    comments: [commentSchema],
  },
  { timestamps: true }
);

reviewSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
