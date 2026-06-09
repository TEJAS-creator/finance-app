/**
 * High-performance Gemini AI Integration Service.
 * Parses raw text from statement files into typed transaction schemas
 * and dynamically extracts bespoke financial advisory insights.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transactions: {
      type: 'ARRAY',
      description: 'The parsed transaction rows from the statement.',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'YYYY-MM-DD format, fallback to current year if only month/day provided.' },
          description: { type: 'STRING', description: 'Raw description/narration from the line item.' },
          merchant: { type: 'STRING', description: 'Cleaned, human-friendly merchant or counterparty name (e.g. Starbucks, Amazon, Rent, Net Salary).' },
          amount: { type: 'NUMBER', description: 'Absolute transaction cost as positive numeric amount.' },
          type: { type: 'STRING', enum: ['debit', 'credit'], description: 'debit for purchases, subscriptions, withdrawals. credit for salary, transfers-in, refunds.' },
          category: { 
            type: 'STRING', 
            enum: ['Food', 'Transport', 'Shopping', 'Subscription', 'Essentials', 'Entertainment', 'Healthcare', 'Education', 'Miscellaneous'], 
            description: 'Financial bucket category classification.' 
          },
          confidence: { type: 'STRING', enum: ['High', 'Medium', 'Low'], description: 'AI classification confidence level.' }
        },
        required: ['date', 'description', 'merchant', 'amount', 'type', 'category', 'confidence']
      }
    },
    insights: {
      type: 'ARRAY',
      description: '3 bespoke, highly tactical, realistic action points tailored to this statement data.',
      items: { type: 'STRING' }
    },
    summary: {
      type: 'STRING',
      description: 'A comprehensive, cohesive, and premium paragraph summary (2-3 sentences) detailing the overall cash flows, statement coverage, notable behavior or spend trends, and primary actionable suggestion.'
    }
  },
  required: ['transactions', 'insights', 'summary']
};

export const geminiService = {
  /**
   * Evaluates if a key is formatted correctly
   * @param {string} key 
   * @returns {boolean}
   */
  validateApiKeyFormat(key) {
    if (!key) return false;
    // Simple format check (usually AIzaSy... of length ~39)
    return key.trim().startsWith('AIzaSy') && key.trim().length >= 35;
  },

  /**
   * Feeds raw bank statement text directly to Gemini for structuring and analytics.
   * Prioritizes secure server-side proxy endpoint, with client-side direct request as local fallback.
   * @param {string} apiKey 
   * @param {string} statementText 
   * @param {string} fileExtension 
   * @returns {Promise<{transactions: Array, insights: Array}>}
   */
  async analyzeStatement(apiKey, statementText, fileExtension) {
    // 1. Attempt Secure Serverless backend proxy request
    try {
      console.log('Sending parsing request through secure backend proxy: /api/analyze...');
      const proxyResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statementText, fileExtension })
      });

      if (proxyResponse.ok) {
        const parsedData = await proxyResponse.json();
        if (parsedData.transactions && Array.isArray(parsedData.transactions)) {
          console.log('Statement parsed successfully via secure backend proxy!');
          return {
            transactions: parsedData.transactions,
            insights: parsedData.insights || [],
            summary: parsedData.summary || ''
          };
        }
      } else {
        // Log details if it hit our serverless endpoint but failed (e.g. key missing)
        const errorText = await proxyResponse.text();
        console.warn('Backend proxy returned an unsuccessful status, checking fallback options:', errorText);
      }
    } catch (proxyError) {
      console.warn('Backend serverless proxy not reachable (standard in local Vite dev). Falling back to client-side parsing...', proxyError);
    }

    // 2. Client-Side Fallback Mode
    // Gather key from manual input, local storage, or Vite environment variables
    const activeKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');

    if (!activeKey) {
      throw new Error('Gemini AI services are not configured. To enable statement parsing:\n1. Deploy to Vercel and add your GEMINI_API_KEY in environment settings, OR\n2. Create a local .env file with VITE_GEMINI_API_KEY, OR\n3. Input your API key directly in the Dashboard settings panel.');
    }

    const cleanedKey = activeKey.trim();
    
    // Construct rich context prompt
    const prompt = `You are a world-class banking statement parser and financial intelligence analyst.
Analyze the raw text dump of the bank statement provided below. The file is uploaded as a .${fileExtension} format.

Carefully extract EVERY SINGLE transaction line item. Take special care with:
1. Identifying dates and converting them to YYYY-MM-DD.
2. Distinguishing between debits (outflows/expenses) and credits (inflows/income). 
3. Cleaning up raw transaction descriptions into professional, readable merchant or vendor names.
4. Categorizing the transactions precisely into one of the following categories:
   - Food (Restaurants, grocery stores, cafes, food delivery)
   - Transport (Uber/Ola, fuel, transit fares, toll charges)
   - Shopping (Clothing, gadgets, retail shopping, department stores)
   - Subscription (Netflix, Spotify, SaaS, internet, recurring software bills)
   - Essentials (Electricity/water bills, rent payments, insurance, loan EMIs)
   - Entertainment (Movie theaters, bars, gaming, recreational activities)
   - Healthcare (Pharmacies, diagnostic labs, hospitals, clinics)
   - Education (Course fees, book purchases, training modules)
   - Miscellaneous (Unidentified items, minor cash withdrawals, ad-hoc wire transfers)

In addition to transactions, provide 3 premium, custom-tailored financial insights. Do not use generic statements; suggest real optimizations based on their specific transaction distribution and leaks.

STATEMENT TEXT:
"""
${statementText}
"""`;

    try {
      // Build the Request Body with modern schema rules
      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA
        }
      };

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${cleanedKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${response.status} Error`;
        throw new Error(`Gemini API error: ${errMsg}`);
      }

      const responseData = await response.json();
      const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error('Gemini returned an empty text response.');
      }

      // Safe parse
      const parsedData = JSON.parse(rawText.trim());
      
      if (!parsedData.transactions || !Array.isArray(parsedData.transactions)) {
        throw new Error('Invalid parser structure returned: Missing transactions list.');
      }

      return {
        transactions: parsedData.transactions,
        insights: parsedData.insights || [],
        summary: parsedData.summary || ''
      };

    } catch (error) {
      console.error('Failed to parse statement using Gemini schema mode:', error);
      
      // Secondary fallback flow (in case schema mode is rejected by a legacy endpoint proxy)
      try {
        console.log('Attempting secondary legacy parsing mode...');
        const endpointFallback = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${cleanedKey}`;
        const fallbackPrompt = `${prompt}\n\nYou MUST respond with raw JSON in the exact schema layout requested. Wrap it inside code fences like \`\`\`json ... \`\`\``;
        
        const fallbackBody = {
          contents: [{ parts: [{ text: fallbackPrompt }] }]
        };

        const fallbackResponse = await fetch(endpointFallback, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackBody)
        });

        if (!fallbackResponse.ok) {
          throw new Error('Fallback parser call failed too.');
        }

        const fallbackData = await fallbackResponse.json();
        const fallbackText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!fallbackText) {
          throw new Error('Fallback parsing returned no text content.');
        }

        // Extract JSON codeblock using RegExp
        const jsonMatch = fallbackText.match(/```json\s*([\s\S]*?)\s*```/) || fallbackText.match(/{[\s\S]*}/);
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : fallbackText;
        const parsedData = JSON.parse(jsonString.trim());
        
        return {
          transactions: parsedData.transactions || [],
          insights: parsedData.insights || [],
          summary: parsedData.summary || ''
        };
      } catch (fallbackError) {
        throw new Error(`AI Processing failed. Details: ${error.message}`);
      }
    }
  }
};
