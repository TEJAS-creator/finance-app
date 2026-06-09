/**
 * Secure Serverless Vercel Function for Google Gemini Statement Parsing.
 * Running in a server-side Node.js environment, keeping the Gemini API key hidden.
 */
export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { statementText, fileExtension } = req.body;

    // Securely pull the key from server-side environment variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Gemini API Key is not configured in environment variables. Please add GEMINI_API_KEY to your deployment Environment Variables.' 
      });
    }

    const GEMINI_MODEL = 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const RESPONSE_SCHEMA = {
      type: 'OBJECT',
      properties: {
        transactions: {
          type: 'ARRAY',
          description: 'The parsed transaction rows from the statement.',
          items: {
            type: 'OBJECT',
            properties: {
              date: { type: 'STRING', description: 'YYYY-MM-DD format.' },
              description: { type: 'STRING', description: 'Raw description/narration.' },
              merchant: { type: 'STRING', description: 'Cleaned, human-friendly merchant name.' },
              amount: { type: 'NUMBER', description: 'Absolute cost as positive number.' },
              type: { type: 'STRING', enum: ['debit', 'credit'] },
              category: { 
                type: 'STRING', 
                enum: ['Food', 'Transport', 'Shopping', 'Subscription', 'Essentials', 'Entertainment', 'Healthcare', 'Education', 'Miscellaneous'], 
                description: 'Financial bucket category classification.' 
              },
              confidence: { type: 'STRING', enum: ['High', 'Medium', 'Low'] }
            },
            required: ['date', 'description', 'merchant', 'amount', 'type', 'category', 'confidence']
          }
        },
        insights: {
          type: 'ARRAY',
          description: '3 bespoke, highly tactical financial insights.',
          items: { type: 'STRING' }
        },
        summary: {
          type: 'STRING',
          description: 'A comprehensive, cohesive, and premium paragraph summary (2-3 sentences) detailing the overall cash flows, statement coverage, notable behavior or spend trends, and primary actionable suggestion.'
        }
      },
      required: ['transactions', 'insights', 'summary']
    };

    // Prompt context matching original client execution
    const prompt = `You are a world-class banking statement parser and financial intelligence analyst.
Analyze the raw text dump of the bank statement provided below. The file is uploaded as a .${fileExtension || 'txt'} format.

Carefully extract EVERY SINGLE transaction line item. Take special care with:
1. Identifying dates and converting them to YYYY-MM-DD.
2. Distinguishing between debits (outflows/expenses) and credits (inflows/income). 
3. Cleaning up raw transaction descriptions into professional, readable merchant or vendor names.
4. Categorizing the transactions precisely into one of the following categories:
   - Food
   - Transport
   - Shopping
   - Subscription
   - Essentials
   - Entertainment
   - Healthcare
   - Education
   - Miscellaneous

In addition to transactions, provide 3 premium, custom-tailored financial insights. Do not use generic statements; suggest real optimizations based on their specific transaction distribution and leaks.

STATEMENT TEXT:
"""
${statementText}
"""`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API Response Error: ${errText}` });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({ error: 'Gemini returned an empty text response.' });
    }

    const parsedData = JSON.parse(rawText.trim());
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('Serverless Vercel function error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
