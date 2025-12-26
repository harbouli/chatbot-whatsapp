import { Pinecone } from '@pinecone-database/pinecone';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Ensure .env is loaded
dotenv.config();

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX || 'watches';

if (!apiKey) {
    console.warn("Warning: PINECONE_API_KEY is not set in environment variables.");
}

export const pinecone = new Pinecone({ apiKey: apiKey || '' });
export const pineconeIndex = pinecone.index(indexName);

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';
