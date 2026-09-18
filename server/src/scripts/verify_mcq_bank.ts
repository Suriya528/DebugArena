import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { seedDefaultQuestionTemplates, DEFAULT_ROUND_1_MCQS } from '../services/defaultQuestions.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';

async function main() {
  await connectDB();
  console.log('Connected to MongoDB via connectDB()');

  // Force seed to ensure all 20 logic MCQs are in the database
  const count = await seedDefaultQuestionTemplates(true);
  console.log(`Seeded question templates. Total templates processed: ${count}`);

  const mcqs = await QuestionTemplate.find({ type: 'mcq' }).sort({ title: 1 });
  console.log(`Found ${mcqs.length} MCQ templates in database:`);
  mcqs.forEach((m, idx) => {
    const correctIdx = m.options?.findIndex(o => o.isCorrect);
    const correctLetter = correctIdx !== undefined && correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : '?';
    console.log(`  ${idx + 1}. [${m.title}] -> Answer: ${correctLetter} | Options: ${m.options?.length} | Explanation: ${m.explanation ? m.explanation.slice(0, 45) + '...' : 'NONE'}`);
  });

  console.log('\nVerifying DEFAULT_ROUND_1_MCQS count:', DEFAULT_ROUND_1_MCQS.length);
  if (mcqs.length >= 20 && DEFAULT_ROUND_1_MCQS.length === 20) {
    console.log('✅ All 20 Logic Debugging MCQs successfully verified in MongoDB Question Bank!');
  } else {
    console.error('❌ MCQ verification failed! Expected at least 20 MCQs.');
    process.exit(1);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
