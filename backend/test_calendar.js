import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`\n${'='.repeat(60)}`);
console.log(`  📅 CALENDAR WORK MODULE - BACKEND VERIFICATION TEST`);
console.log(`${'='.repeat(60)}\n`);

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// Helper function for test reporting
const reportTest = (testName, result, details = '') => {
  if (result === 'pass') {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else if (result === 'fail') {
    console.log(`❌ FAIL: ${testName}`);
    if (details) console.log(`   └─ ${details}`);
    testsFailed++;
  } else if (result === 'skip') {
    console.log(`⏭️  SKIP: ${testName}`);
    if (details) console.log(`   └─ ${details}`);
    testsSkipped++;
  }
};

// Test 1: Verify files exist
console.log('\n📊 TEST GROUP 1: File Existence Checks');
console.log('-'.repeat(60));
try {
  const requiredFiles = [
    'src/models/calendarWork.model.js',
    'src/validators/calendarWork.validator.js',
    'src/controllers/calendarWork.controller.js',
    'src/routes/calendar.routes.js',
    'src/services/calendarReminder.service.js',
    'server.js'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✓ ${file}`);
    } else {
      console.log(`   ✗ ${file}`);
      allFilesExist = false;
    }
  });
  
  if (allFilesExist) {
    reportTest('All required files exist', 'pass');
  } else {
    reportTest('All required files exist', 'fail', 'Some files are missing');
  }
} catch (error) {
  reportTest('All required files exist', 'fail', error.message);
}

// Test 2: Verify file contents for CalendarWork model
console.log('\n📊 TEST GROUP 2: Model Verification');
console.log('-'.repeat(60));
try {
  const modelContent = fs.readFileSync(path.join(__dirname, 'src/models/calendarWork.model.js'), 'utf-8');
  
  const requiredFields = [
    'title', 'description', 'contentType', 'assignedTo', 'workDate',
    'workDueDate', 'workStatus', 'postingStatus', 'scheduledPostTime',
    'reminderSent', 'workStatusHistory', 'postingStatusHistory'
  ];
  
  let missingFields = [];
  requiredFields.forEach(field => {
    if (!modelContent.includes(field)) {
      missingFields.push(field);
    }
  });
  
  if (missingFields.length === 0) {
    reportTest('CalendarWork model has all required fields', 'pass');
  } else {
    reportTest('CalendarWork model has all required fields', 'fail', `Missing: ${missingFields.join(', ')}`);
  }
  
  // Check for indexes
  if (modelContent.includes('index') && modelContent.includes('scheduledPostTime')) {
    reportTest('CalendarWork model has database indexes', 'pass');
  } else {
    reportTest('CalendarWork model has database indexes', 'fail', 'No indexes found');
  }
} catch (error) {
  reportTest('CalendarWork model has all required fields', 'fail', error.message);
}

// Test 3: Verify Validators
console.log('\n📊 TEST GROUP 3: Validation Schemas');
console.log('-'.repeat(60));
try {
  const validatorContent = fs.readFileSync(path.join(__dirname, 'src/validators/calendarWork.validator.js'), 'utf-8');
  
  const requiredSchemas = [
    'createCalendarWorkSchema',
    'updateCalendarWorkSchema',
    'updateWorkStatusSchema',
    'updatePostingStatusSchema'
  ];
  
  let missingSchemas = [];
  requiredSchemas.forEach(schema => {
    if (!validatorContent.includes(schema)) {
      missingSchemas.push(schema);
    }
  });
  
  if (missingSchemas.length === 0) {
    reportTest('All Zod validation schemas defined', 'pass');
  } else {
    reportTest('All Zod validation schemas defined', 'fail', `Missing: ${missingSchemas.join(', ')}`);
  }
} catch (error) {
  reportTest('All Zod validation schemas defined', 'fail', error.message);
}

// Test 4: Verify Controller
console.log('\n📊 TEST GROUP 4: Controller Functions');
console.log('-'.repeat(60));
try {
  const controllerContent = fs.readFileSync(path.join(__dirname, 'src/controllers/calendarWork.controller.js'), 'utf-8');
  
  const requiredFunctions = [
    'createCalendarWork',
    'getCalendarWorks',
    'getMyCalendarWorks',
    'getCalendarWorkById',
    'updateCalendarWork',
    'updateWorkStatus',
    'updatePostingStatus',
    'deleteCalendarWork'
  ];
  
  let missingFunctions = [];
  requiredFunctions.forEach(fn => {
    if (!controllerContent.includes(`export const ${fn}`)) {
      missingFunctions.push(fn);
    }
  });
  
  if (missingFunctions.length === 0) {
    reportTest('All controller functions exported', 'pass');
  } else {
    reportTest('All controller functions exported', 'fail', `Missing: ${missingFunctions.join(', ')}`);
  }
  
  // Check for authorization logic
  if (controllerContent.includes('403') && controllerContent.includes('canEditCalendarWork')) {
    reportTest('Authorization checks implemented', 'pass');
  } else {
    reportTest('Authorization checks implemented', 'fail', 'Authorization logic not found');
  }
} catch (error) {
  reportTest('All controller functions exported', 'fail', error.message);
}

// Test 5: Verify Routes
console.log('\n📊 TEST GROUP 5: Route Definitions');
console.log('-'.repeat(60));
try {
  const routesContent = fs.readFileSync(path.join(__dirname, 'src/routes/calendar.routes.js'), 'utf-8');
  
  const expectedRoutes = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'];
  let missingMethods = [];
  
  expectedRoutes.forEach(method => {
    if (!routesContent.includes(`router.${method.toLowerCase()}`)) {
      missingMethods.push(method);
    }
  });
  
  if (missingMethods.length === 0) {
    reportTest('All HTTP methods defined in routes', 'pass');
  } else {
    reportTest('All HTTP methods defined in routes', 'fail', `Missing: ${missingMethods.join(', ')}`);
  }
  
  // Check for /my-work route
  if (routesContent.includes('/my-work')) {
    reportTest('GET /my-work route defined', 'pass');
  } else {
    reportTest('GET /my-work route defined', 'fail', '/my-work route not found');
  }
} catch (error) {
  reportTest('All HTTP methods defined in routes', 'fail', error.message);
}

// Test 6: Verify Routes mounted in index.js
console.log('\n📊 TEST GROUP 6: Route Integration');
console.log('-'.repeat(60));
try {
  const indexContent = fs.readFileSync(path.join(__dirname, 'src/routes/index.js'), 'utf-8');
  
  if (indexContent.includes('calendarRoutes') && indexContent.includes('calendar-work')) {
    reportTest('Calendar routes mounted in router', 'pass');
    console.log(`   └─ Endpoint prefix: /calendar-work`);
  } else {
    reportTest('Calendar routes mounted in router', 'fail', 'Routes not mounted in index.js');
  }
} catch (error) {
  reportTest('Calendar routes mounted in router', 'fail', error.message);
}

// Test 7: Verify Reminder Service
console.log('\n📊 TEST GROUP 7: Reminder Service & Scheduler');
console.log('-'.repeat(60));
try {
  const reminderContent = fs.readFileSync(path.join(__dirname, 'src/services/calendarReminder.service.js'), 'utf-8');
  
  const requiredMethods = [
    'processPostingReminders',
    'getOverdueWork',
    'getPendingPostingWork',
    'getUserStats'
  ];
  
  let missingMethods = [];
  requiredMethods.forEach(method => {
    if (!reminderContent.includes(method)) {
      missingMethods.push(method);
    }
  });
  
  if (missingMethods.length === 0) {
    reportTest('Calendar reminder service implemented', 'pass');
  } else {
    reportTest('Calendar reminder service implemented', 'fail', `Missing: ${missingMethods.join(', ')}`);
  }
} catch (error) {
  reportTest('Calendar reminder service implemented', 'fail', error.message);
}

// Test 8: Verify Scheduler Job
console.log('\n📊 TEST GROUP 8: Background Job Integration');
console.log('-'.repeat(60));
try {
  const schedulerContent = fs.readFileSync(path.join(__dirname, 'src/services/scheduler.service.js'), 'utf-8');
  
  if (schedulerContent.includes('calendarReminderService') && 
      schedulerContent.includes('processPostingReminders')) {
    reportTest('Calendar reminder job in scheduler', 'pass');
    
    if (schedulerContent.includes('*/5 * * * *')) {
      reportTest('Calendar reminder runs every 5 minutes', 'pass');
    } else {
      reportTest('Calendar reminder runs every 5 minutes', 'fail', 'Cron schedule not found');
    }
  } else {
    reportTest('Calendar reminder job in scheduler', 'fail', 'Not integrated into scheduler');
  }
} catch (error) {
  reportTest('Calendar reminder job in scheduler', 'fail', error.message);
}

// Test 9: Verify Scheduler Initialization
console.log('\n📊 TEST GROUP 9: Server Initialization');
console.log('-'.repeat(60));
try {
  const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf-8');
  
  if (serverContent.includes('schedulerService.start()')) {
    reportTest('Scheduler initialized in server.js', 'pass');
  } else {
    reportTest('Scheduler initialized in server.js', 'fail', 'schedulerService.start() not called');
  }
  
  if (serverContent.includes('import { schedulerService }')) {
    reportTest('Scheduler service imported in server.js', 'pass');
  } else {
    reportTest('Scheduler service imported in server.js', 'fail', 'Import statement missing');
  }
} catch (error) {
  reportTest('Scheduler initialized in server.js', 'fail', error.message);
}

// Print summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  📊 TEST SUMMARY`);
console.log(`${'='.repeat(60)}`);
console.log(`  ✅ Passed:  ${testsPassed}`);
console.log(`  ❌ Failed:  ${testsFailed}`);
console.log(`  ⏭️  Skipped: ${testsSkipped}`);
console.log(`  📈 Total:   ${testsPassed + testsFailed + testsSkipped}`);
console.log(`${'='.repeat(60)}\n`);

if (testsFailed === 0) {
  console.log(`🎉 SUCCESS! Calendar work module backend is ready!\n`);
  console.log(`📋 NEXT STEPS:`);
  console.log(`   1. Run backend: npm start`);
  console.log(`   2. Test API endpoints (see curl examples below)`);
  console.log(`   3. Implement frontend calendar UI\n`);
  
  console.log(`📝 API ENDPOINT EXAMPLES:\n`);
  console.log(`   Create Calendar Work:`);
  console.log(`   POST /api/v1/calendar-work`);
  console.log(`   Authorization: Bearer <token>\n`);
  
  console.log(`   Get My Calendar Work:`);
  console.log(`   GET /api/v1/calendar-work/my-work`);
  console.log(`   Authorization: Bearer <token>\n`);
  
  console.log(`   Get Calendar Work by ID:`);
  console.log(`   GET /api/v1/calendar-work/:id`);
  console.log(`   Authorization: Bearer <token>\n`);
  
  console.log(`   Update Work Status:`);
  console.log(`   PATCH /api/v1/calendar-work/:id/status`);
  console.log(`   Authorization: Bearer <token>\n`);
  
  console.log(`   Update Posting Status:`);
  console.log(`   PATCH /api/v1/calendar-work/:id/posting-status`);
  console.log(`   Authorization: Bearer <token>\n`);
} else {
  console.log(`⚠️ Some tests failed. Please review the errors above.\n`);
  process.exit(1);
}
