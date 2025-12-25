import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded
dotenv.config();

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX || 'watches';

if (!apiKey) {
    console.warn("Warning: PINECONE_API_KEY is not set in environment variables.");
}

export const pinecone = new Pinecone({ apiKey: apiKey || '' });
export const pineconeIndex = pinecone.index(indexName);

export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
