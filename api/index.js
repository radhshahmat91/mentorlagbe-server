// Vercel serverless entry: every request is rewritten to this Express app (see vercel.json).
import { createApp } from '../src/app.js';

export default createApp();
