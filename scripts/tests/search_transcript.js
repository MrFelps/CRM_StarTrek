const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Adm\\.gemini\\antigravity\\brain\\4615f3b4-4944-4152-9e76-f0f97f82d989\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(transcriptPath)) {
  console.log('Transcript not found');
  process.exit(0);
}

const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let found = 0;
rl.on('line', (line) => {
  if (line.includes('ninerouter') || line.includes('sk-b73e8')) {
    found++;
    try {
      const obj = JSON.parse(line);
      console.log(`[Step ${obj.step_index}] Source: ${obj.source}, Type: ${obj.type}`);
      if (obj.content) {
        console.log('Content preview:', obj.content.slice(0, 300));
      }
      if (obj.tool_calls) {
        console.log('Tool calls:', JSON.stringify(obj.tool_calls).slice(0, 300));
      }
    } catch (e) {
      console.log('Match in raw line:', line.slice(0, 200));
    }
  }
});

rl.on('close', () => {
  console.log(`Finished search. Found ${found} matches.`);
});
