import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  jdLink: String,
  notes: String,
  dateApplied: { type: Date, default: Date.now },
  status: { type: String, enum: ['Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
  salaryRange: String,
  requiredSkills: [String],
  niceToHaveSkills: [String],
  seniority: String,
  location: String,
}, { timestamps: true });

export default mongoose.model('Application', applicationSchema);