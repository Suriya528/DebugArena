import { Router, Response } from 'express';
import { authenticate, requireAnyAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { Question } from '../models/Question.js';
import { previewVariants } from '../services/dnaService.js';
import { AuditLog } from '../models/AuditLog.js';

export const adminQuestionBankRouter = Router();

adminQuestionBankRouter.use(authenticate, requireAnyAdmin);

// GET /api/admin/questions/bank
adminQuestionBankRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { topic, language, difficulty, type, search } = req.query;
    const filter: Record<string, any> = {};

    if (topic) filter.topic = topic;
    if (language) filter.language = language;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { prompt: { $regex: search, $options: 'i' } },
        { skillTags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    const questions = await QuestionTemplate.find(filter).sort({ topic: 1, difficulty: 1 });
    const topics = await QuestionTemplate.distinct('topic');
    const languages = await QuestionTemplate.distinct('language');

    res.json({ questions, topics, languages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question bank' });
  }
});

// POST /api/admin/questions/bank
adminQuestionBankRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      topic,
      language,
      type,
      difficulty,
      expectedSolveTimeMinutes,
      marks,
      skillTags,
      prompt,
      explanation,
      options,
      allowedLanguages,
      starterCode,
      testCases,
      hasDnaMutation,
      dnaConfig
    } = req.body;

    if (!title || !topic || !prompt) {
      res.status(400).json({ error: 'Title, topic, and prompt are required' });
      return;
    }

    const template = await QuestionTemplate.create({
      collegeId: req.user?.collegeId,
      title: title.trim(),
      topic: topic.trim(),
      language: language || 'java',
      type: type || 'debugging',
      difficulty: difficulty || 'medium',
      expectedSolveTimeMinutes: expectedSolveTimeMinutes || 15,
      marks: marks || 20,
      skillTags: skillTags || [],
      prompt: prompt.trim(),
      explanation: explanation || '',
      options: options || [],
      allowedLanguages: allowedLanguages || ['java', 'python', 'cpp', 'javascript'],
      starterCode: starterCode || {},
      testCases: testCases || [],
      hasDnaMutation: Boolean(hasDnaMutation),
      dnaConfig: hasDnaMutation ? dnaConfig : undefined
    });

    await AuditLog.create({
      adminId: req.user!.userId,
      adminUsername: req.user!.username,
      action: 'QUESTION_TEMPLATE_CREATED',
      targetType: 'QuestionTemplate',
      targetId: template._id.toString(),
      details: { title, topic, type, hasDnaMutation }
    });

    res.status(201).json({ template });
  } catch (err: any) {
    console.error('Failed to create question template:', err);
    res.status(500).json({ error: 'Failed to create question template' });
  }
});

// GET /api/admin/questions/bank/:templateId
adminQuestionBankRouter.get('/:templateId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const template = await QuestionTemplate.findById(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Question template not found' });
      return;
    }
    res.json({ template });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question template' });
  }
});

// POST /api/admin/questions/bank/:templateId/preview-variants
adminQuestionBankRouter.post('/:templateId/preview-variants', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const template = await QuestionTemplate.findById(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Question template not found' });
      return;
    }

    const variants = previewVariants(template, 4);
    res.json({
      templateId: template._id,
      title: template.title,
      hasDnaMutation: template.hasDnaMutation,
      bugCategory: template.dnaConfig?.bugCategory,
      variants
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to preview variants' });
  }
});

// POST /api/admin/questions/bank/:templateId/deploy-to-round
adminQuestionBankRouter.post('/:templateId/deploy-to-round', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roundNumber } = req.body;
    if (!roundNumber) {
      res.status(400).json({ error: 'roundNumber is required' });
      return;
    }

    const template = await QuestionTemplate.findById(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Question template not found' });
      return;
    }

    // Determine next order index for round
    const maxOrder = await Question.findOne({ roundNumber }).sort({ orderIndex: -1 });
    const nextOrder = maxOrder ? maxOrder.orderIndex + 1 : 1;

    const deployedQuestion = await Question.create({
      roundNumber,
      orderIndex: nextOrder,
      type: template.type === 'mcq' ? 'mcq' : 'coding',
      title: template.title,
      prompt: template.prompt,
      marks: template.marks,
      options: template.options?.map(o => o.text) || [],
      correctOptionIndex: template.options?.findIndex(o => o.isCorrect) ?? 0,
      explanation: template.explanation,
      allowedLanguages: template.allowedLanguages,
      starterCode: template.starterCode instanceof Map ? Object.fromEntries(template.starterCode) : template.starterCode,
      testCases: template.testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.output,
        isHidden: tc.isHidden,
        weight: tc.weight
      }))
    });

    await AuditLog.create({
      adminId: req.user!.userId,
      adminUsername: req.user!.username,
      action: 'QUESTION_DEPLOYED_TO_ROUND',
      targetType: 'Question',
      targetId: deployedQuestion._id.toString(),
      details: { templateId: template._id, roundNumber, title: template.title }
    });

    res.json({ message: `Successfully deployed question to Round ${roundNumber}`, question: deployedQuestion });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deploy question to round' });
  }
});
