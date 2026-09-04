import { IQuestionTemplate } from '../models/QuestionTemplate.js';

// Deterministic 32-bit FNV-1a Hash
export function hashToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Seeded Mulberry32 PRNG (Guarantees identical sequence given same seed across platforms)
export function createSeededRng(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GeneratedVariant {
  variantId: string;
  candidateId: string;
  mutatedCode: string;
  mutatedPrompt: string;
  mutatedTestCases: { input: string; output: string; isHidden: boolean; weight: number }[];
  bugCategory?: string;
  parameterMap: Record<string, string>;
}

export function generateQuestionVariant(
  template: IQuestionTemplate,
  candidateId: string,
  eventId: string = 'default'
): GeneratedVariant {
  if (!template.hasDnaMutation || !template.dnaConfig) {
    const defaultCode = template.starterCode instanceof Map 
      ? Object.fromEntries(template.starterCode) 
      : (template.starterCode || {});
    const firstCode = (Object.values(defaultCode)[0] as string) || '';
    return {
      variantId: 'base',
      candidateId,
      mutatedCode: firstCode,
      mutatedPrompt: template.prompt,
      mutatedTestCases: template.testCases || [],
      parameterMap: {}
    };
  }

  const seed = hashToSeed(`${candidateId}:${template._id}:${eventId}`);
  const rng = createSeededRng(seed);

  const parameterMap: Record<string, string> = {};

  // 1. Mutate variable names
  if (template.dnaConfig.mutationParams?.varNames) {
    template.dnaConfig.mutationParams.varNames.forEach((group, groupIdx) => {
      if (group && group.length > 0) {
        const chosen = group[Math.floor(rng() * group.length)];
        parameterMap[`VAR_${groupIdx + 1}`] = chosen;
        // Primary alias by first item
        parameterMap[group[0].toUpperCase()] = chosen;
      }
    });
  }

  // 2. Mutate numeric boundary ranges
  if (template.dnaConfig.mutationParams?.numericRanges) {
    template.dnaConfig.mutationParams.numericRanges.forEach(range => {
      const stepCount = Math.floor((range.max - range.min) / (range.step || 1));
      const chosenVal = range.min + Math.floor(rng() * (stepCount + 1)) * (range.step || 1);
      parameterMap[range.param.toUpperCase()] = chosenVal.toString();
    });
  }

  // 3. Mutate boundary operators (e.g. <= vs <)
  if (template.dnaConfig.mutationParams?.boundaryOps && template.dnaConfig.mutationParams.boundaryOps.length > 0) {
    const ops = template.dnaConfig.mutationParams.boundaryOps;
    const chosenOp = ops[Math.floor(rng() * ops.length)];
    parameterMap['BOUNDARY_OP'] = chosenOp;
  }

  // Perform substitution on codeTemplate
  let mutatedCode = template.dnaConfig.codeTemplate || '';
  for (const [key, val] of Object.entries(parameterMap)) {
    mutatedCode = mutatedCode.replaceAll(`{{${key}}}`, val);
  }

  // Perform substitution on prompt
  let mutatedPrompt = template.prompt;
  for (const [key, val] of Object.entries(parameterMap)) {
    mutatedPrompt = mutatedPrompt.replaceAll(`{{${key}}}`, val);
  }

  // Perform substitution on test cases
  const mutatedTestCases = (template.testCases || []).map(tc => {
    let input = tc.input;
    let output = tc.output;
    for (const [key, val] of Object.entries(parameterMap)) {
      input = input.replaceAll(`{{${key}}}`, val);
      output = output.replaceAll(`{{${key}}}`, val);
    }
    return {
      input,
      output,
      isHidden: tc.isHidden,
      weight: tc.weight || 10
    };
  });

  const variantLetter = String.fromCharCode(65 + (Math.abs(seed) % 5)); // Variant A, B, C, D, or E
  const variantId = `VAR-${variantLetter}-${Math.abs(seed).toString(16).slice(0, 4).toUpperCase()}`;

  return {
    variantId,
    candidateId,
    mutatedCode,
    mutatedPrompt,
    mutatedTestCases,
    bugCategory: template.dnaConfig.bugCategory,
    parameterMap
  };
}

export function previewVariants(template: IQuestionTemplate, count: number = 4): GeneratedVariant[] {
  const sampleCandidates = ['candidate_alex', 'candidate_bianca', 'candidate_charles', 'candidate_david'];
  return sampleCandidates.slice(0, count).map(cand => generateQuestionVariant(template, cand, 'preview-event'));
}
