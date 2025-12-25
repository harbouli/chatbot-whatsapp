
import { RagService } from './apps/backend/src/services/rag.service';
import dotenv from 'dotenv';
import path from 'path';

// Load env from apps/backend/.env
dotenv.config({ path: path.join(__dirname, 'apps/backend/.env') });

if (!process.env.PINECONE_API_KEY) {
    console.error("PINECONE_API_KEY is missing in apps/backend/.env");
    process.exit(1);
}

async function verifySearch() {
  const ragService = new RagService();
  const testId = "test-search-desc-1";
  const uniqueTerm = "chronos-stopping-mechanism"; 
  const textToEmbed = `Timestopper Watch: Featuring a unique ${uniqueTerm} that freezes time.`;
  
  console.log('1. Upserting test vector with unique description term...');
  try {
      await ragService.upsertVector(
        testId,
        textToEmbed,
        { name: "Timestopper Watch", description: "Featuring a unique chronos-stopping-mechanism that freezes time.", price: 999 }
      );
      
      console.log('   Upsert complete. Waiting 10s for consistency...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log(`2. Searching for unique term: "${uniqueTerm}"...`);
      const results = await ragService.searchSimilar(uniqueTerm, 3);
      
      console.log('   Results:', results.map(r => ({ 
          name: r.metadata ? (r.metadata as any).name : 'No Name', 
          score: r.score 
      })));

      const found = results.some(r => r.id === testId);
      if (found) {
          console.log('✅ SUCCESS: Found product by description term.');
      } else {
          console.error('❌ FAILED: Product not found by description.');
      }

      console.log('3. Cleaning up...');
      await ragService.deleteVector(testId);

  } catch (err) {
      console.error('Error:', err);
  }
}

verifySearch();
