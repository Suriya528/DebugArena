import { Router, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { authenticate, requireAnyAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { Question } from '../models/Question.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { previewVariants } from '../services/dnaService.js';
import { AuditLog } from '../models/AuditLog.js';
import { seedDefaultQuestionTemplates } from '../services/defaultQuestions.js';
import {
  parseRawFile,
  previewImport,
  commitImport,
  generateOfficialTemplate
} from '../services/importEngine.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

export const adminQuestionBankRouter = Router();

adminQuestionBankRouter.use(authenticate, requireAnyAdmin);

// GET /api/admin/questions/bank
adminQuestionBankRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Auto-seed if question bank is currently empty or missing newly added categories
    const totalCount = await QuestionTemplate.countDocuments();
    if (totalCount < 25) {
      await seedDefaultQuestionTemplates();
    }

    const { topic, language, difficulty, type, search, eventId, stageNumber, exactEventLanguages } = req.query;
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

    // Inspect event languages if eventId is provided
    let eventLanguages: string[] = [];
    if (eventId) {
      const cleanEventId = mongoose.Types.ObjectId.isValid(eventId as string)
        ? new mongoose.Types.ObjectId(eventId as string)
        : eventId;

      const roundFilter: any = { eventId: { $in: [eventId, cleanEventId] } };
      if (stageNumber) {
        const parsedStage = parseInt(stageNumber as string, 10);
        if (!isNaN(parsedStage)) {
          roundFilter.roundNumber = parsedStage;
        }
      }
      const dynRounds = await DynamicRound.find(roundFilter);
      const langSet = new Set<string>();
      for (const r of dynRounds) {
        if (Array.isArray(r.allowedLanguages)) {
          for (const l of r.allowedLanguages) {
            if (l && typeof l === 'string') langSet.add(l.toLowerCase().trim());
          }
        }
      }
      eventLanguages = Array.from(langSet);
    }

    // Exact event language filtering
    if (exactEventLanguages === 'true' && eventLanguages.length > 0) {
      const langRegexList = eventLanguages.map(l => new RegExp(`^${l}$`, 'i'));
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { language: { $in: langRegexList } },
          { allowedLanguages: { $in: langRegexList } },
          { type: 'aptitude' }
        ]
      });
    }

    const questions = await QuestionTemplate.find(filter).sort({ topic: 1, difficulty: 1 });
    const topics = await QuestionTemplate.distinct('topic');
    const languages = await QuestionTemplate.distinct('language');
    const types = await QuestionTemplate.distinct('type');

    // Aggregate counts by type for fast UI stats tabs
    const typeAgg = await QuestionTemplate.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const countsByType: Record<string, number> = {};
    for (const item of typeAgg) {
      if (item._id) countsByType[item._id] = item.count;
    }

    const grandTotal = await QuestionTemplate.countDocuments();

    // Event-scoped deployment mapping
    let roundCounts: Record<number, number> = {};
    const deployedMap: Record<string, number[]> = {};

    if (eventId) {
      const cleanEventId = mongoose.Types.ObjectId.isValid(eventId as string)
        ? new mongoose.Types.ObjectId(eventId as string)
        : eventId;
      const deployedQuestions = await Question.find(
        { eventId: { $in: [eventId, cleanEventId] } },
        'title roundNumber orderIndex'
      );
      for (const dq of deployedQuestions) {
        roundCounts[dq.roundNumber] = (roundCounts[dq.roundNumber] || 0) + 1;
        if (!deployedMap[dq.title]) {
          deployedMap[dq.title] = [];
        }
        if (!deployedMap[dq.title].includes(dq.roundNumber)) {
          deployedMap[dq.title].push(dq.roundNumber);
        }
      }
    }

    const enrichedQuestions = questions.map(q => {
      const obj: any = q.toObject();
      obj.deployedInRounds = deployedMap[q.title] || [];

      let matches = true;
      if (eventLanguages.length > 0) {
        const qLang = (q.language || '').toLowerCase().trim();
        const hasLangMatch = qLang ? eventLanguages.includes(qLang) : false;
        const hasAllowedMatch = Array.isArray(q.allowedLanguages) && q.allowedLanguages.some(al => eventLanguages.includes(al.toLowerCase().trim()));
        matches = hasLangMatch || hasAllowedMatch || q.type === 'aptitude';
      }
      obj.matchesEventLanguages = matches;
      return obj;
    });

    res.json({
      questions: enrichedQuestions,
      topics,
      languages,
      types,
      countsByType,
      totalCount: grandTotal,
      roundCounts,
      deployedMap,
      eventLanguages
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question bank' });
  }
});

// POST /api/admin/questions/bank/seed-defaults
adminQuestionBankRouter.post('/seed-defaults', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const seededCount = await seedDefaultQuestionTemplates(true);
    res.json({
      success: true,
      message: `Question bank initialized and updated with ${seededCount} curated templates across Multiple Choices, Coding, SQL, and Debugging`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed default questions' });
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

// POST /api/admin/questions/bank/populate-stage
adminQuestionBankRouter.post('/populate-stage', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, roundNumber } = req.body;
    if (!eventId || !roundNumber) {
      res.status(400).json({ error: 'eventId and roundNumber are required' });
      return;
    }

    const cleanEventId = mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : eventId;
    const targetRoundNumber = parseInt(roundNumber, 10);

    const event = await Event.findById(cleanEventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const dr = await DynamicRound.findOne({ eventId: cleanEventId, roundNumber: targetRoundNumber });
    const targetCount = dr ? dr.questionCount : (targetRoundNumber === 1 ? 10 : targetRoundNumber === 99 ? 1 : 3);
    const roundType = dr ? dr.type : (targetRoundNumber === 1 ? 'mcq' : 'coding');

    // Find existing questions deployed for this event & round
    const existing = await Question.find({ eventId: { $in: [eventId, cleanEventId] }, roundNumber: targetRoundNumber });
    const existingTitles = new Set(existing.map(q => q.title));
    const needed = Math.max(0, targetCount - existing.length);

    if (needed === 0) {
      res.json({
        success: true,
        message: `Stage ${targetRoundNumber} already has ${existing.length} questions (target quota: ${targetCount}).`,
        count: 0,
        totalCount: existing.length
      });
      return;
    }

    // Determine compatible types for QuestionTemplate
    let templateTypeQuery: any = roundType;
    if (roundType === 'mcq' || roundType === 'aptitude') {
      templateTypeQuery = { $in: ['mcq', 'aptitude'] };
    } else if (roundType === 'coding' || roundType === 'debugging') {
      templateTypeQuery = { $in: ['coding', 'debugging'] };
    } else if (roundType === 'sql') {
      templateTypeQuery = 'sql';
    }

    // Query candidate templates
    const candidateTemplates = await QuestionTemplate.find({
      type: templateTypeQuery,
      title: { $nin: Array.from(existingTitles) }
    }).limit(needed * 2);

    const templatesToDeploy = candidateTemplates.slice(0, needed);

    let maxOrder = existing.reduce((max, q) => Math.max(max, q.orderIndex || 0), 0);
    const createdDocs = [];

    for (const tmpl of templatesToDeploy) {
      maxOrder += 1;
      const isMcq = tmpl.type === 'mcq' || (tmpl.type === 'aptitude' && tmpl.options && tmpl.options.length > 0);
      const newQ = await Question.create({
        roundNumber: targetRoundNumber,
        orderIndex: maxOrder,
        eventId: cleanEventId,
        collegeId: event.collegeId,
        type: isMcq ? 'mcq' : 'coding',
        title: tmpl.title,
        prompt: tmpl.prompt,
        marks: tmpl.marks || (isMcq ? 10 : 25),
        options: tmpl.options?.map(o => o.text) || [],
        correctOptionIndex: tmpl.options?.findIndex(o => o.isCorrect) ?? 0,
        explanation: tmpl.explanation,
        allowedLanguages: tmpl.allowedLanguages || (dr?.allowedLanguages || ['python', 'cpp', 'java']),
        starterCode: tmpl.starterCode instanceof Map ? Object.fromEntries(tmpl.starterCode) : tmpl.starterCode,
        testCases: (tmpl.testCases || []).map(tc => ({
          input: tc.input,
          expectedOutput: tc.output,
          isHidden: tc.isHidden,
          weight: tc.weight
        }))
      });
      createdDocs.push(newQ);
    }

    res.json({
      success: true,
      message: `Successfully populated ${createdDocs.length} questions for Stage ${targetRoundNumber}!`,
      count: createdDocs.length,
      totalCount: existing.length + createdDocs.length,
      questions: createdDocs
    });
  } catch (err: any) {
    console.error('Error populating stage:', err);
    res.status(500).json({ error: 'Failed to populate stage questions' });
  }
});

// POST /api/admin/questions/bank/:templateId/deploy-to-round
adminQuestionBankRouter.post('/:templateId/deploy-to-round', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roundNumber, eventId } = req.body;
    if (!roundNumber) {
      res.status(400).json({ error: 'roundNumber is required' });
      return;
    }

    const template = await QuestionTemplate.findById(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Question template not found' });
      return;
    }

    const targetEventId = eventId || req.user?.eventId;
    let targetCollegeId: any = req.user?.collegeId;
    if (!targetCollegeId && targetEventId) {
      const parentEvent = await Event.findById(targetEventId).select('collegeId');
      if (parentEvent && parentEvent.collegeId) {
        targetCollegeId = parentEvent.collegeId;
      }
    }

    // Determine next order index for round
    const orderFilter: Record<string, any> = { roundNumber };
    if (targetEventId) orderFilter.eventId = targetEventId;
    const maxOrder = await Question.findOne(orderFilter).sort({ orderIndex: -1 });
    const nextOrder = maxOrder ? maxOrder.orderIndex + 1 : 1;

    let targetRoundLanguages: string[] = [];
    if (targetEventId) {
      const targetRound = await DynamicRound.findOne({ eventId: targetEventId, roundNumber });
      if (targetRound && Array.isArray(targetRound.allowedLanguages) && targetRound.allowedLanguages.length > 0) {
        targetRoundLanguages = targetRound.allowedLanguages;
      }
    }

    const resolvedAllowedLanguages = (template.allowedLanguages && template.allowedLanguages.length > 0)
      ? template.allowedLanguages
      : (template.language && template.language !== 'general'
          ? [template.language]
          : (targetRoundLanguages.length > 0 ? targetRoundLanguages : ['python', 'cpp', 'java', 'javascript', 'c']));

    const isMcqType = template.type === 'mcq' || (template.type === 'aptitude' && template.options && template.options.length > 0);
    const deployedQuestion = await Question.create({
      roundNumber,
      orderIndex: nextOrder,
      eventId: targetEventId,
      collegeId: targetCollegeId,
      type: isMcqType ? 'mcq' : 'coding',
      title: template.title,
      prompt: template.prompt,
      marks: template.marks,
      options: template.options?.map(o => o.text) || [],
      correctOptionIndex: template.options?.findIndex(o => o.isCorrect) ?? 0,
      explanation: template.explanation,
      allowedLanguages: resolvedAllowedLanguages,
      starterCode: template.starterCode instanceof Map ? Object.fromEntries(template.starterCode) : template.starterCode,
      testCases: (template.testCases || []).map(tc => ({
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

// PUT /api/admin/questions/bank/:templateId
// Allows editing/updating an existing question template in the question bank
adminQuestionBankRouter.put('/:templateId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const template = await QuestionTemplate.findById(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Question template not found' });
      return;
    }

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

    template.title = title.trim();
    template.topic = topic.trim();
    if (language) template.language = language;
    if (type) template.type = type;
    if (difficulty) template.difficulty = difficulty;
    if (expectedSolveTimeMinutes !== undefined) template.expectedSolveTimeMinutes = Number(expectedSolveTimeMinutes);
    if (marks !== undefined) template.marks = Number(marks);
    if (skillTags) template.skillTags = skillTags;
    template.prompt = prompt.trim();
    if (explanation !== undefined) template.explanation = explanation;
    if (options) template.options = options;
    if (allowedLanguages) template.allowedLanguages = allowedLanguages;
    if (starterCode) template.starterCode = starterCode;
    if (testCases) template.testCases = testCases;
    if (hasDnaMutation !== undefined) template.hasDnaMutation = Boolean(hasDnaMutation);
    if (dnaConfig) template.dnaConfig = dnaConfig;

    await template.save();

    await AuditLog.create({
      adminId: req.user!.userId,
      adminUsername: req.user!.username,
      action: 'QUESTION_TEMPLATE_UPDATED',
      targetType: 'QuestionTemplate',
      targetId: template._id.toString(),
      details: { title: template.title, topic: template.topic, type: template.type }
    });

    res.json({ success: true, template });
  } catch (err: any) {
    console.error('Failed to update question template:', err);
    res.status(500).json({ error: 'Failed to update question template' });
  }
});

// DELETE /api/admin/questions/bank/:templateId
// Permanently removes a question template from the bank
adminQuestionBankRouter.delete('/:templateId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const template = await QuestionTemplate.findById(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Question template not found' });
      return;
    }

    await QuestionTemplate.findByIdAndDelete(req.params.templateId);

    await AuditLog.create({
      adminId: req.user!.userId,
      adminUsername: req.user!.username,
      action: 'QUESTION_TEMPLATE_DELETED',
      targetType: 'QuestionTemplate',
      targetId: req.params.templateId,
      details: { title: template.title, topic: template.topic }
    });

    res.json({ success: true, message: `Question template "${template.title}" deleted successfully.` });
  } catch (err: any) {
    console.error('Failed to delete question template:', err);
    res.status(500).json({ error: 'Failed to delete question template' });
  }
});

// GET /api/admin/questions/bank/template/:type/:format
adminQuestionBankRouter.get('/template/:type/:format', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const rawType = (req.params.type || 'mcq').toLowerCase();
    const rawFormat = (req.params.format || 'xlsx').toLowerCase();

    const type = rawType === 'coding' ? 'coding' : 'mcq';
    const format = (['csv', 'xlsx', 'json'].includes(rawFormat) ? rawFormat : 'xlsx') as 'csv' | 'xlsx' | 'json';

    const { buffer, mimeType, fileName } = generateOfficialTemplate(type, format);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Failed to generate template:', err);
    res.status(500).json({ error: 'Failed to generate official question template' });
  }
});

// POST /api/admin/questions/bank/import/preview
adminQuestionBankRouter.post(
  '/import/preview',
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No question file uploaded. Please provide a CSV, XLSX, or JSON file.' });
        return;
      }

      const defaultType = (req.body.defaultType || 'mcq').toLowerCase() as 'mcq' | 'coding';
      const rawRows = parseRawFile(req.file.path, req.file.originalname, req.file.buffer);
      const preview = await previewImport(rawRows, defaultType);

      res.json({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        preview
      });
    } catch (err: any) {
      console.error('Question import preview failed:', err);
      res.status(400).json({ error: err.message || 'Failed to parse and preview uploaded question file.' });
    }
  }
);

// POST /api/admin/questions/bank/import/confirm
adminQuestionBankRouter.post('/import/confirm', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { questions, eventId, roundNumber, fileName, fileSize } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'No questions provided for confirmation import.' });
      return;
    }

    const result = await commitImport({
      questions,
      adminUserId: req.user!.userId,
      adminUsername: req.user!.username,
      collegeId: req.user?.collegeId?.toString(),
      eventId,
      roundNumber: roundNumber ? parseInt(roundNumber, 10) : undefined,
      sourceFileName: fileName || 'batch_upload',
      fileSizeBytes: fileSize || 0
    });

    res.json({
      success: true,
      message: `Successfully imported ${result.insertedCount} questions to the Question Bank.`,
      insertedCount: result.insertedCount,
      auditId: result.auditId
    });
  } catch (err: any) {
    console.error('Question import commit failed:', err);
    res.status(500).json({ error: err.message || 'Failed to commit imported questions.' });
  }
});
