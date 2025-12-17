import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // CORS configuration for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API Key not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Create ephemeral token specifically for Live API usage
    // We use v1alpha as Ephemeral Tokens are currently a preview feature
    const tokenResponse = await ai.authTokens.create({
      config: {
        httpOptions: { apiVersion: 'v1alpha' },
        uses: 1, // The token can only be used to start a single session (best practice)
        // expireTime defaults to 30 mins, which is sufficient
      }
    });

    // The token string is in tokenResponse.name
    return res.status(200).json({ token: tokenResponse.name });
  } catch (error) {
    console.error('Token Generation Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate token' });
  }
}