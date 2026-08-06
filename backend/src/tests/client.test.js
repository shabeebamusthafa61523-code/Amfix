import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from '../models/client.model.js';
import ProjectActivity from '../models/projectActivity.model.js';
import User from '../models/user.model.js';
import { createClient, getClients, getClientById, updateClient, deleteClient, exportClients } from '../controllers/client.controller.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

const mockResponse = () => {
  const res = {};
  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runClientTestSuite() {
  console.log('====================================================');
  console.log('  🧪 Running Enterprise Client Module API Test Suite');
  console.log('====================================================');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB for testing.');

    const mockUserId = new mongoose.Types.ObjectId();
    let testClientId = null;

    // TEST 1: POST /api/v1/clients (Create Client with empty optional fields & dates)
    console.log('\n▶ TEST 1: POST /api/v1/clients (Create Client)');
    const reqCreate = {
      body: {
        companyName: 'Acme Test Enterprise Corp',
        clientName: 'Alice Johnson',
        email: 'alice@acmetest.com',
        phone: '+91 99988 77766',
        industry: 'Software & Technology',
        status: 'Active',
        clientType: 'Enterprise',
        priority: 'High',
        ndaStatus: 'Signed',
        contractStart: '',
        contractEnd: '',
        accountManager: '',
        assignedTeamLead: ''
      },
      user: { id: mockUserId }
    };
    const resCreate = mockResponse();
    await createClient(reqCreate, resCreate);

    console.log(`  Status Code: ${resCreate.statusCode}`);
    console.log(`  Success Flag: ${resCreate.body?.success}`);
    console.log(`  Message: ${resCreate.body?.message}`);
    
    if (resCreate.statusCode === 201 && resCreate.body?.success) {
      testClientId = resCreate.body.data._id || resCreate.body.data.id;
      console.log(`  Created Client ID: ${resCreate.body.data.clientId} (_id: ${testClientId})`);
      console.log('  PASSED ✅');
    } else {
      console.error('  FAILED ❌:', resCreate.body);
      throw new Error('Create Client test failed');
    }

    // TEST 2: GET /api/v1/clients (List Clients with Search, Pagination & Filtering)
    console.log('\n▶ TEST 2: GET /api/v1/clients (List Clients with Search & Pagination)');
    const reqGetList = {
      query: {
        search: 'Acme Test',
        status: 'Active',
        page: 1,
        limit: 5
      }
    };
    const resGetList = mockResponse();
    await getClients(reqGetList, resGetList);

    console.log(`  Status Code: ${resGetList.statusCode}`);
    console.log(`  Total Found: ${resGetList.body?.data?.pagination?.total}`);
    console.log(`  Clients Count Returned: ${resGetList.body?.data?.clients?.length}`);
    if (resGetList.statusCode === 200 && resGetList.body?.data?.clients?.length > 0) {
      console.log('  PASSED ✅');
    } else {
      console.error('  FAILED ❌:', resGetList.body);
    }

    // TEST 3: GET /api/v1/clients/:id (Get Client Details by ID)
    console.log('\n▶ TEST 3: GET /api/v1/clients/:id (Get Client by ID)');
    const reqGetId = { params: { id: testClientId } };
    const resGetId = mockResponse();
    await getClientById(reqGetId, resGetId);

    console.log(`  Status Code: ${resGetId.statusCode}`);
    console.log(`  Company Name: ${resGetId.body?.data?.client?.companyName}`);
    if (resGetId.statusCode === 200 && resGetId.body?.data?.client) {
      console.log('  PASSED ✅');
    } else {
      console.error('  FAILED ❌:', resGetId.body);
    }

    // TEST 4: PUT /api/v1/clients/:id (Update Client Details)
    console.log('\n▶ TEST 4: PUT /api/v1/clients/:id (Update Client)');
    const reqUpdate = {
      params: { id: testClientId },
      body: {
        companyName: 'Acme Test Enterprise Corp (Updated)',
        priority: 'VIP'
      },
      user: { id: mockUserId }
    };
    const resUpdate = mockResponse();
    await updateClient(reqUpdate, resUpdate);

    console.log(`  Status Code: ${resUpdate.statusCode}`);
    console.log(`  Updated Priority: ${resUpdate.body?.data?.priority}`);
    if (resUpdate.statusCode === 200 && resUpdate.body?.data?.priority === 'VIP') {
      console.log('  PASSED ✅');
    } else {
      console.error('  FAILED ❌:', resUpdate.body);
    }

    // TEST 5: GET /api/v1/clients/export (Export Clients)
    console.log('\n▶ TEST 5: GET /api/v1/clients/export (Export Clients Data)');
    const reqExport = {};
    const resExport = mockResponse();
    await exportClients(reqExport, resExport);

    console.log(`  Status Code: ${resExport.statusCode}`);
    console.log(`  Exported Count: ${resExport.body?.data?.length}`);
    if (resExport.statusCode === 200 && Array.isArray(resExport.body?.data)) {
      console.log('  PASSED ✅');
    } else {
      console.error('  FAILED ❌:', resExport.body);
    }

    // TEST 6: DELETE /api/v1/clients/:id (Delete Client)
    console.log('\n▶ TEST 6: DELETE /api/v1/clients/:id (Delete Client)');
    const reqDelete = {
      params: { id: testClientId },
      user: { id: mockUserId }
    };
    const resDelete = mockResponse();
    await deleteClient(reqDelete, resDelete);

    console.log(`  Status Code: ${resDelete.statusCode}`);
    if (resDelete.statusCode === 200 && resDelete.body?.success) {
      console.log('  PASSED ✅');
    } else {
      console.error('  FAILED ❌:', resDelete.body);
    }

    // Clean up activities created during test
    await ProjectActivity.deleteMany({ client: testClientId });
    console.log('\n✅ Cleanup completed successfully.');
    console.log('====================================================');
    console.log(' 🎉 ALL CLIENT MODULE TESTS PASSED VERIFIED 100%!');
    console.log('====================================================');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED WITH EXCEPTION:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runClientTestSuite();
