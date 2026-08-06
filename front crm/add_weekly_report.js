const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/DeveloperReportPage.jsx',
  'src/pages/GraphicDesignerReportPage.jsx',
  'src/pages/VideographerReportPage.jsx',
  'src/pages/MarketingReportPage.jsx',
  'src/pages/AcademicCounselorReportPage.jsx',
  'src/pages/HodRdReportPage.jsx'
];

function duplicateBlock(content, startStr, endStr, replaceFn) {
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) return content;
  
  // Find the end of the block
  // If endStr is a regex, find its match after startIdx
  let endIdx = -1;
  if (typeof endStr === 'string') {
    endIdx = content.indexOf(endStr, startIdx);
    if (endIdx !== -1) endIdx += endStr.length;
  } else {
    // Regex
    const sub = content.slice(startIdx);
    const match = sub.match(endStr);
    if (match) {
      endIdx = startIdx + match.index + match[0].length;
    }
  }

  if (endIdx === -1) return content;

  const originalBlock = content.slice(startIdx, endIdx);
  const newBlock = replaceFn(originalBlock);

  // Insert the new block right after the original block
  return content.slice(0, endIdx) + '\n\n' + newBlock + content.slice(endIdx);
}

for (const relPath of files) {
  const file = path.join(__dirname, relPath);
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. States
  const statesStart = 'const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);';
  const statesEnd = 'hodDate: \'\'\n  });';
  
  if (!content.includes('const [isWeeklyModalOpen')) {
    content = duplicateBlock(content, statesStart, statesEnd, (block) => {
      let b = block.replace(/Monthly/g, 'Weekly').replace(/monthly/g, 'weekly');
      b = b.replace(/d\.setDate\(d\.getDate\(\) - 30\);/g, 'd.setDate(d.getDate() - 7);');
      return '  // Weekly Report Consolidation States\n  ' + b;
    });
  }

  // 2. Fetch function
  const fetchStart = 'const handleFetchMonthlyData = async () => {';
  const fetchEnd = 'setIsMonthlyLoading(false);\n    }\n  };';
  
  if (!content.includes('const handleFetchWeeklyData = async () => {')) {
    content = duplicateBlock(content, fetchStart, fetchEnd, (block) => {
      return block.replace(/Monthly/g, 'Weekly').replace(/monthly/g, 'weekly');
    });
  }

  // 3. PDF Generator
  const pdfStart = 'const handleDownloadMonthlyPDF = async (';
  const pdfEnd = 'showToast("Failed to generate Monthly PDF.", "error");\n    }\n  };';
  
  if (!content.includes('const handleDownloadWeeklyPDF = async (')) {
    content = duplicateBlock(content, pdfStart, pdfEnd, (block) => {
      let b = block.replace(/Monthly/g, 'Weekly').replace(/monthly/g, 'weekly');
      b = b.replace(/'monthly'/g, "'weekly'");
      b = b.replace(/"monthly"/g, '"weekly"');
      return b;
    });
  }

  // 4. Button
  // Find the Monthly Report button block.
  // It usually looks like:
  // <button
  //   type="button"
  //   onClick={() => setIsMonthlyModalOpen(true)}
  // ...
  //   Monthly Report
  // </button>
  const btnMatch = content.match(/<button[^>]*onClick=\{\(\) => setIsMonthlyModalOpen\(true\)\}[^>]*>[\s\S]*?Monthly Report[\s\S]*?<\/button>/);
  if (btnMatch && !content.includes('setIsWeeklyModalOpen(true)')) {
    const originalBtn = btnMatch[0];
    let newBtn = originalBtn.replace(/Monthly/g, 'Weekly').replace(/monthly/g, 'weekly');
    
    const condition = `{(currentUser?.isTeamLead === true || ['1', '2', 'admin', 'hr'].includes(String(currentUser?.role_id || currentUser?.role || ''))) && (\n                ${newBtn}\n              )}`;
    
    content = content.replace(originalBtn, `${originalBtn}\n              ${condition}`);
  }

  // 5. Modal
  // It usually looks like:
  // {/* Monthly Consolidation Modal */}
  // <AnimatePresence>
  //   {isMonthlyModalOpen && (
  // ...
  //     )}
  //   </AnimatePresence>
  const modalStart = '{/* Monthly Consolidation Modal */}';
  const modalEndMatch = content.match(/\{\/\* Monthly Consolidation Modal \*\/\}[\s\S]*?<\/AnimatePresence>/);
  if (modalEndMatch && !content.includes('{/* Weekly Consolidation Modal */}')) {
    const originalModal = modalEndMatch[0];
    let newModal = originalModal.replace(/Monthly/g, 'Weekly').replace(/monthly/g, 'weekly');
    
    content = content.replace(originalModal, `${originalModal}\n\n      ${newModal}`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`No changes made to ${file}`);
  }
}

console.log("Done.");
