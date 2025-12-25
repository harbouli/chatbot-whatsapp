import { pinecone, pineconeIndex } from './clients';

export class VectorService {
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Using Pinecone Inference API (llama-text-embed-v2)
      const model = 'llama-text-embed-v2';
      const embeddings = await pinecone.inference.embed(
        model,
        [text],
        { inputType: 'passage', truncate: 'END' }
      );
      
      const data = (embeddings as any).data;
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Pinecone returned no embeddings data');
      }
      
      return data[0].values!;
    } catch (error) {
      console.error("Pinecone embedding error:", error);
      throw error;
    }
  }

  async upsertVector(id: string, text: string, metadata: any) {
    const embedding = await this.generateEmbedding(text);
    await pineconeIndex.upsert([
      {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          text,
        },
      },
    ]);
  }

  async searchSimilar(text: string, topK: number = 5) {
    const embedding = await this.generateEmbedding(text);
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });
    return queryResponse.matches;
  }

  async deleteVector(id: string) {
    try {
      await pineconeIndex.deleteOne(id);
      console.log(`Deleted vector with ID: ${id}`);
    } catch (error) {
      console.error(`Failed to delete vector ${id}:`, error);
      throw error;
    }
  }

  async deleteVectors(ids: string[]) {
    try {
      await pineconeIndex.deleteMany(ids);
      console.log(`Deleted ${ids.length} vectors`);
    } catch (error) {
      console.error(`Failed to delete vectors:`, error);
      throw error;
    }
  }
}
