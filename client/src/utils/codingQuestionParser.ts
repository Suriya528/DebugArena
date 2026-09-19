export interface ParsedTestCase {
  input: string;
  expectedOutput: string;
  weight?: number;
}

export interface ParsedCodingProblem {
  scenario: string;
  inputFormat: string;
  outputFormat: string;
  constraints?: string;
  bugClue?: string;
  errorCode: string;
  sampleCases: ParsedTestCase[];
}

/**
 * Normalizes and extracts the 4 essential components of a coding question:
 * 1. Scenario (Problem description & context)
 * 2. Input (Format specifications & sample inputs)
 * 3. Output (Format specifications & expected outputs)
 * 4. Error Code (Flawed starter code that the participant needs to debug)
 */
export function parseCodingQuestion(
  question: {
    prompt?: string;
    starterCode?: Record<string, string>;
    errorCode?: Record<string, string>;
    testCases?: Array<{ input?: string; expectedOutput?: string; output?: string; isHidden?: boolean; weight?: number }>;
  },
  currentLang: string = 'python'
): ParsedCodingProblem {
  const safePrompt = (question.prompt || '').trim();
  const langKey = (currentLang || 'python').toLowerCase();

  // 1. Resolve Error Code (Starter Code containing the bug)
  let resolvedErrorCode = '';
  const codeSource = question.starterCode || question.errorCode || {};
  if (typeof codeSource === 'object' && codeSource !== null) {
    resolvedErrorCode =
      codeSource[langKey] ||
      codeSource[currentLang] ||
      codeSource['python'] ||
      codeSource['javascript'] ||
      codeSource['cpp'] ||
      codeSource['java'] ||
      codeSource['c'] ||
      Object.values(codeSource)[0] ||
      '';
  } else if (typeof codeSource === 'string') {
    resolvedErrorCode = codeSource;
  }

  // 2. Extract Sample Test Cases
  const sampleCases: ParsedTestCase[] = (question.testCases || [])
    .filter(tc => !tc.isHidden)
    .map(tc => ({
      input: tc.input || '',
      expectedOutput: tc.expectedOutput || (tc as any).output || '',
      weight: tc.weight
    }));

  // 3. Parse Markdown / Sections from Prompt
  // Pattern matches lines starting with ### or ## or bold titles
  const headerPattern = /^(?:#{1,4}\s+|\*\*)([A-Za-z0-9\s()&—–\-_/]+)(?:\*\*|:)?\s*$/i;

  const lines = safePrompt.split('\n');
  let hasSections = false;
  let activeSection: 'scenario' | 'input' | 'output' | 'constraints' | 'bug' = 'scenario';

  const sectionBuckets: Record<'scenario' | 'input' | 'output' | 'constraints' | 'bug', string[]> = {
    scenario: [],
    input: [],
    output: [],
    constraints: [],
    bug: []
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(headerPattern);

    if (match) {
      const headerText = match[1].toLowerCase().trim();
      if (
        headerText.includes('scenario') ||
        headerText.includes('problem description') ||
        headerText.includes('problem statement') ||
        headerText.includes('description') ||
        headerText.includes('challenge')
      ) {
        activeSection = 'scenario';
        hasSections = true;
        continue;
      } else if (
        headerText.includes('input format') ||
        headerText.includes('input') ||
        headerText.includes('inputs')
      ) {
        activeSection = 'input';
        hasSections = true;
        continue;
      } else if (
        headerText.includes('output format') ||
        headerText.includes('output') ||
        headerText.includes('outputs')
      ) {
        activeSection = 'output';
        hasSections = true;
        continue;
      } else if (
        headerText.includes('constraint') ||
        headerText.includes('constraints') ||
        headerText.includes('limits')
      ) {
        activeSection = 'constraints';
        hasSections = true;
        continue;
      } else if (
        headerText.includes('bug') ||
        headerText.includes('error code') ||
        headerText.includes('error') ||
        headerText.includes('defect') ||
        headerText.includes('clue')
      ) {
        activeSection = 'bug';
        hasSections = true;
        continue;
      }
    }

    if (activeSection in sectionBuckets) {
      sectionBuckets[activeSection].push(line);
    }
  }

  let scenario = sectionBuckets.scenario.join('\n').trim();
  let inputFormat = ((question as any).inputFormat || '').trim() || sectionBuckets.input.join('\n').trim();
  let outputFormat = ((question as any).outputFormat || '').trim() || sectionBuckets.output.join('\n').trim();
  let constraints = ((question as any).constraints || '').trim() || (sectionBuckets as any).constraints?.join('\n').trim() || '';
  let bugClue = sectionBuckets.bug.join('\n').trim();

  // If no markdown sectioning was found, treat entire prompt as the Scenario
  if (!hasSections || !scenario) {
    scenario = safePrompt || 'Implement or debug the solution to satisfy all evaluation test cases.';
  }

  // Provide default descriptions for Input/Output if not explicitly defined in prompt
  if (!inputFormat && sampleCases.length > 0) {
    inputFormat = 'Standard input (stdin) format specified in the sample test cases below:';
  }
  if (!outputFormat && sampleCases.length > 0) {
    outputFormat = 'Standard output (stdout) format matching the expected test cases below:';
  }

  return {
    scenario,
    inputFormat,
    outputFormat,
    bugClue: bugClue || undefined,
    errorCode: resolvedErrorCode,
    sampleCases
  };
}
