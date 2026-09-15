const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Adm\\.gemini\\antigravity\\brain\\4615f3b4-4944-4152-9e76-f0f97f82d989\\.system_generated\\logs\\transcript.jsonl';
const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    if (obj.step_index < 95 && obj.type === 'USER_INPUT') {
      console.log(`=== USER_INPUT [Step ${obj.step_index}] ===`);
      console.log(obj.content);
    }
  } catch(e) {}
});
