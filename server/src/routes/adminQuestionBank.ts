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
    // Auto-seed if question bank is currently empty or missing the 20 logic debugging MCQs
    const totalCount = await QuestionTemplate.countDocuments();
    const mcqCount = await QuestionTemplate.countDocuments({ type: 'mcq' });
    if (totalCount < 25 || mcqCount < 20) {
      await seedDefaultQuestionTemplates(true);
    }

    const {
      topic,
      language,
      difficulty,
      type,
      search,
      eventId,
      stageNumber,
      exactEventLanguages,
      page: queryPage,
      limit: queryLimit,
      sortBy,
      sortOrder,
      targetEventId,
      currentRoundNumber
    } = req.query;

    const filter: Record<string, any> = {};

    if (language) {
      const cleanLang = (language as string).toLowerCase().trim();
      filter.$and = filter.$and || [];
      if (cleanLang === 'general' || cleanLang === 'universal' || cleanLang === 'logic') {
        filter.$and.push({
          $or: [
            { language: 'general' },
            { language: 'universal' },
            { type: 'mcq' },
            { type: 'aptitude' }
          ]
        });
      } else {
        filter.$and.push({
          $or: [
            { language: cleanLang },
            { allowedLanguages: cleanLang },
            { type: 'mcq' },
            { language: 'general' }
          ]
        });
      }
    }
    if (difficulty) filter.difficulty = difficulty;
    if (type) {
      if (type === 'coding' || type === 'debugging') {
        filter.type = { $in: ['coding', 'debugging'] };
      } else {
        filter.type = type;
      }
    }
    if (search) {
      const rawSearch = decodeURIComponent(String(search)).replace(/\+/g, ' ').trim();
      const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { prompt: { $regex: escaped, $options: 'i' } },
        { skillTags: { $in: [new RegExp(escaped, 'i')] } }
      ];
    }

    // Pagination & Sorting calculations
    const page = Math.max(1, parseInt(queryPage as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryLimit as string, 10) || 25));
    const skip = (page - 1) * limit;

    const sortOrderNum = (sortOrder as string)?.toLowerCase() === 'desc' ? -1 : 1;
    let sortObj: Record<string, any> = { topic: 1, difficulty: 1, title: 1 };
    if (sortBy === 'title') {
      sortObj = { title: sortOrderNum };
    } else if (sortBy === 'difficulty') {
      sortObj = { difficulty: sortOrderNum };
    } else if (sortBy === 'topic') {
      sortObj = { topic: sortOrderNum };
    } else if (sortBy === 'createdAt') {
      sortObj = { createdAt: sortOrderNum };
    }

    const totalMatching = await QuestionTemplate.countDocuments(filter);
    const totalPages = Math.ceil(totalMatching / limit) || 1;

    const questions = await QuestionTemplate.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

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

    // Global Event Usage Aggregation (from DynamicRound.selectedQuestionIds as Single Source of Truth)
    const allRoundsWithSelections = await DynamicRound.find({
      'selectedQuestionIds.0': { $exists: true }
    }).populate('eventId', 'name code');

    const globalUsageMap = new Map<string, Array<{ eventId: string; eventName: string; eventCode: string; roundNumber: number; roundTitle: string }>>();
    for (const dr of allRoundsWithSelections) {
      const ev = dr.eventId as any;
      if (!ev) continue;
      for (const qid of dr.selectedQuestionIds || []) {
        const key = qid.toString();
        if (!globalUsageMap.has(key)) {
          globalUsageMap.set(key, []);
        }
        globalUsageMap.get(key)!.push({
          eventId: ev._id.toString(),
          eventName: ev.name,
          eventCode: ev.code,
          roundNumber: dr.roundNumber,
          roundTitle: dr.title
        });
      }
    }

    // Cross-round duplication detection for a specific target event
    const effectiveEventId = targetEventId || eventId;
    const otherRoundAssignedMap = new Map<string, number>();
    if (effectiveEventId) {
      const parsedCurrRound = currentRoundNumber ? parseInt(currentRoundNumber as string, 10) : (stageNumber ? parseInt(stageNumber as string, 10) : 0);
      const targetRounds = await DynamicRound.find({
        eventId: effectiveEventId,
        roundNumber: { $ne: parsedCurrRound }
      });
      for (const tr of targetRounds) {
        for (const qid of tr.selectedQuestionIds || []) {
          otherRoundAssignedMap.set(qid.toString(), tr.roundNumber);
        }
      }
    }

    const enrichedQuestions = questions.map(q => {
      const obj: any = q.toObject();
      const qidStr = q._id.toString();
      obj.usedInEvents = globalUsageMap.get(qidStr) || [];
      obj.isUsedInTargetEventOtherRound = otherRoundAssignedMap.has(qidStr);
      obj.targetEventOtherRoundNumber = otherRoundAssignedMap.get(qidStr) || null;
      return obj;
    });

    res.json({
      questions: enrichedQuestions,
      page,
      limit,
      total: totalMatching,
      totalCount: totalMatching,
      totalPages,
      grandTotal,
      topics,
      languages,
      types,
      countsByType
    });
  } catch (err) {
    console.error('Failed to fetch question bank:', err);
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

// POST /api/admin/questions/bank/by-ids
adminQuestionBankRouter.post('/by-ids', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.json({ questions: [] });
      return;
    }
    const cleanIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    const questions = await QuestionTemplate.find({ _id: { $in: cleanIds } });
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions by IDs' });
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

    const targetEventId = req.body.eventId || req.user?.eventId;
    const template = await QuestionTemplate.create({
      collegeId: req.user?.collegeId,
      eventId: targetEventId,
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
// Permanently removes a question template from the bank (Defensively guarded against deleting assigned questions)
adminQuestionBankRouter.delete('/:templateId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const template = await QuestionTemplate.findById(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Question template not found' });
      return;
    }

    // Defensive Deletion Invariant: Never silently remove a selected question from an event round!
    const assignedRounds = await DynamicRound.find({
      selectedQuestionIds: template._id
    }).populate('eventId', 'name code');

    if (assignedRounds.length > 0) {
      const usedIn = assignedRounds.map(r => ({
        eventId: (r.eventId as any)?._id || r.eventId,
        eventName: (r.eventId as any)?.name || 'Tournament',
        eventCode: (r.eventId as any)?.code || '',
        roundNumber: r.roundNumber,
        roundTitle: r.title
      }));
      const roundListStr = usedIn.map(u => `${u.eventName} (Round ${u.roundNumber})`).join(', ');
      res.status(409).json({
        error: `Cannot delete question "${template.title}". It is currently assigned to: ${roundListStr}. Please remove it from those event rounds before deleting.`,
        usedIn,
        conflictRounds: usedIn
      });
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
