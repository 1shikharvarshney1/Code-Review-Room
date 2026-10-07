import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    language: {
      type: String,
      required: true,
      enum: ['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'html', 'css', 'json'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    ydocState: {
      type: Buffer,
      default: null,
    },
  },
  { timestamps: true }
);

roomSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.ydocState;
    return ret;
  },
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
