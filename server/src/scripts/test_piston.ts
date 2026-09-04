import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: 'python',
      version: '3.10.0',
      files: [{ content: 'print("Hello")' }]
    });
    console.log('Success:', res.data);
  } catch (err: any) {
    console.log('Status:', err.response?.status);
    console.log('Data:', err.response?.data);
    console.log('Headers:', err.response?.headers);
  }
}

test();
