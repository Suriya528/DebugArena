import { spawn } from 'child_process';

function runNodeNative(code: string, stdinText: string, timeoutMs: number = 3000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('node', ['-e', code], {
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ stdout, stderr: 'Execution Timed Out', exitCode: 124 });
    }, timeoutMs);

    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });

    child.on('close', code => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code || 0 });
    });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });

    if (stdinText) {
      child.stdin.write(stdinText);
    }
    child.stdin.end();
  });
}

async function main() {
  const jsCode = `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 2) {
  const n = parseInt(input[0]);
  const arr = input.slice(1, n + 1).map(Number);
  const start = parseInt(input[n + 1]);
  const end = parseInt(input[n + 2]);
  let i = start, j = end;
  while (i < j) {
    const temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
    i++; j--;
  }
  console.log(arr.join(' '));
}
`;

  const res = await runNodeNative(jsCode, '5\n1 2 3 4 5\n1 3');
  console.log('Node Result:', res);
}

main();
