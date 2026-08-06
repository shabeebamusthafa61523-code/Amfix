import fs from 'fs';

const filePath = 'c:/Users/Lenovo L460/Desktop/crm-1/crm-test/front crm/src/pages/OpsReportPage.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 230; i < 300; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
