import mongoose from 'mongoose';

export const APPLICATION_STATUSES = ['Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'] as const;

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  jdLink: { type: String, trim: true, maxlength: 2048 },
  notes: { type: String, trim: true, maxlength: 5000 },
  dateApplied: { type: Date, default: Date.now },
  followUpDate: { type: Date },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'Applied' },
  salaryRange: { type: String, trim: true, maxlength: 120 },
  requiredSkills: [{ type: String, trim: true, maxlength: 64 }],
  niceToHaveSkills: [{ type: String, trim: true, maxlength: 64 }],
  seniority: { type: String, trim: true, maxlength: 120 },
  location: { type: String, trim: true, maxlength: 120 },
}, { timestamps: true });

applicationSchema.index({ user: 1, status: 1, updatedAt: -1 });

export default mongoose.model('Application', applicationSchema);
