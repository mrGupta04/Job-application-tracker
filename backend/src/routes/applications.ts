import express, { Request } from 'express';
import Application from '../models/Application';
import { protect } from '../middleware/auth';
import { parseJobDescription, generateResumeSuggestions } from '../services/aiService';

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// All routes protected
router.use(protect);

// Get all applications
router.get('/', async (req: AuthRequest, res) => {
  try {
    const applications = await Application.find({ user: req.user._id });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create application
router.post('/', async (req: AuthRequest, res) => {
  const { company, role, jdLink, notes, dateApplied, status, salaryRange } = req.body;
  try {
    const application = await Application.create({
      user: req.user._id,
      company,
      role,
      jdLink,
      notes,
      dateApplied,
      status,
      salaryRange,
    });
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update application
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application || application.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Application not found' });
    }
    const updatedApplication = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedApplication);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete application
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application || application.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Application not found' });
    }
    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Parse JD
router.post('/parse-jd', async (req, res) => {
  const { jobDescription } = req.body;
  try {
    const parsed = await parseJobDescription(jobDescription);
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ message: 'Error parsing job description' });
  }
});

// Generate suggestions
router.post('/generate-suggestions', async (req, res) => {
  const { company, role, requiredSkills, niceToHaveSkills, seniority, location } = req.body;
  try {
    const suggestions = await generateResumeSuggestions({ company, role, requiredSkills, niceToHaveSkills, seniority, location });
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: 'Error generating suggestions' });
  }
});

export default router;