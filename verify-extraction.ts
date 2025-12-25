
import { RagService } from './apps/backend/src/services/rag.service';

// Mocking env for test if not loaded
if (!process.env.DEEPSEEK_API_KEY) {
    // try to load from backend .env manually or just warn
    console.warn("DEEPSEEK_API_KEY not found in env, trying to load from apps/backend/.env");
    require('dotenv').config({ path: 'apps/backend/.env' });
}

async function verify() {
  const ragService = new RagService();

  console.log('--- Verifying Order Extraction ---\n');

  const testCases = [
    {
      input: "My name is John Doe, phone 0612345678, address 123 Main St, Casablanca.",
      desc: "Full valid info"
    },
    {
      input: "I want the samsung phone",
      desc: "No order details",
      expectEmpty: true
    },
    {
      input: "Call me at 0611223344",
      desc: "Only phone"
    },
    {
      input: "I live in Rabat Agdal",
      desc: "Only address"
    },
    {
      input: "Samsung is a good brand",
      desc: "Tricky input (Samsung is not a name)",
      expectEmpty: true
    }
  ];

  for (const test of testCases) {
    console.log(`Testing: "${test.input}" (${test.desc})`);
    try {
      const result = await ragService.extractOrderDetails(test.input);
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (test.expectEmpty && Object.keys(result).length > 0) {
        console.error('❌ FAILED: Expected empty result');
      } else if (!test.expectEmpty && Object.keys(result).length === 0) {
        console.warn('⚠️ WARNING: Expected some details but got none');
      } else {
         console.log('✅ Passed');
      }

    } catch (e) {
      console.error('❌ Error:', e);
    }
    console.log('--------------------------------\n');
  }
}

verify().catch(console.error);
