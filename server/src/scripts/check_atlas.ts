import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { QuestionTemplate } from '../models/QuestionTemplate.js';

async function check() {
  console.log('Connecting to:', process.env.MONGODB_URI ? 'URI present' : 'No URI');
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected!');

  const count = await QuestionTemplate.countDocuments();
  const mcqs = await QuestionTemplate.find({ type: 'mcq' });
  const coding = await QuestionTemplate.find({ type: 'coding' });
  const debugging = await QuestionTemplate.find({ type: 'debugging' });
  const sql = await QuestionTemplate.find({ type: 'sql' });

  console.log('Total templates in DB:', count);
  console.log('MCQs in DB:', mcqs.length);
  console.log('Coding in DB:', coding.length);
  console.log('Debugging in DB:', debugging.length);
  console.log('SQL in DB:', sql.length);

  console.log('\n--- All MCQs in DB ---');
  mcqs.forEach((m, i) => console.log(`${i + 1}. [${m.title}]`));

  await mongoose.disconnect();
}
check().catch(console.error);
