import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import {
  DEFAULT_ROUND_2_CODING,
  DEFAULT_ROUND_3_CODING,
  DEFAULT_TIE_BREAKER_QUESTION,
  seedDefaultQuestionTemplates
} from '../services/defaultQuestions.js';

async function main() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();

    console.log('🌱 Refreshing Question Bank templates with structured coding challenges...');
    await seedDefaultQuestionTemplates(true);

    console.log('🔍 Syncing existing Question documents in live rounds...');
    
    // 1. Sync Round 2 Questions
    for (const r2Q of DEFAULT_ROUND_2_CODING) {
      const res = await Question.updateMany(
        { roundNumber: 2, orderIndex: r2Q.orderIndex },
        {
          $set: {
            title: r2Q.title,
            prompt: r2Q.prompt,
            starterCode: r2Q.starterCode,
            allowedLanguages: r2Q.allowedLanguages,
            marks: r2Q.marks,
            timeLimitMs: r2Q.timeLimitMs
          }
        }
      );
      console.log(`Updated Round 2 Q${r2Q.orderIndex} ("${r2Q.title}"): ${res.modifiedCount} documents modified.`);
    }

    // Also update any Round 2 questions by title
    for (const r2Q of DEFAULT_ROUND_2_CODING) {
      await Question.updateMany(
        { roundNumber: 2, title: r2Q.title },
        {
          $set: {
            prompt: r2Q.prompt,
            starterCode: r2Q.starterCode,
            allowedLanguages: r2Q.allowedLanguages
          }
        }
      );
    }

    // 2. Sync Round 3 Questions
    for (const r3Q of DEFAULT_ROUND_3_CODING) {
      const res = await Question.updateMany(
        { roundNumber: 3, orderIndex: r3Q.orderIndex },
        {
          $set: {
            title: r3Q.title,
            prompt: r3Q.prompt,
            starterCode: r3Q.starterCode,
            allowedLanguages: r3Q.allowedLanguages,
            marks: r3Q.marks,
            timeLimitMs: r3Q.timeLimitMs
          }
        }
      );
      console.log(`Updated Round 3 Q${r3Q.orderIndex} ("${r3Q.title}"): ${res.modifiedCount} documents modified.`);
    }

    for (const r3Q of DEFAULT_ROUND_3_CODING) {
      await Question.updateMany(
        { roundNumber: 3, title: r3Q.title },
        {
          $set: {
            prompt: r3Q.prompt,
            starterCode: r3Q.starterCode,
            allowedLanguages: r3Q.allowedLanguages
          }
        }
      );
    }

    // 3. Sync Tie Breaker Questions (Round 99)
    const tbRes = await Question.updateMany(
      { roundNumber: 99 },
      {
        $set: {
          title: DEFAULT_TIE_BREAKER_QUESTION.title,
          prompt: DEFAULT_TIE_BREAKER_QUESTION.prompt,
          starterCode: DEFAULT_TIE_BREAKER_QUESTION.starterCode,
          allowedLanguages: DEFAULT_TIE_BREAKER_QUESTION.allowedLanguages,
          marks: DEFAULT_TIE_BREAKER_QUESTION.marks
        }
      }
    );
    console.log(`Updated Round 99 Tie-Breaker: ${tbRes.modifiedCount} documents modified.`);

    console.log('✅ All coding questions synced with 4-part structure (Scenario, Input, Output, Error Code) successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
}

main();
