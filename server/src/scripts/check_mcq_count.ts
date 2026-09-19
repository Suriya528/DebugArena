import { DEFAULT_ROUND_1_MCQS } from '../services/defaultQuestions.js';

console.log('Total items in DEFAULT_ROUND_1_MCQS:', DEFAULT_ROUND_1_MCQS.length);
DEFAULT_ROUND_1_MCQS.forEach((m, i) => {
  console.log(`${i + 1}. [${m.title}]`);
});
