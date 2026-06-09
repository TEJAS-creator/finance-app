const CATEGORY_RULES = [
  { keywords: ['swiggy', 'zomato', 'mcdonalds', 'starbucks', 'kfc', 'burger king', 'restro'], category: 'Food' },
  { keywords: ['uber', 'ola', 'rapido', 'irctc', 'metro', 'fuel', 'petrol', 'shell'], category: 'Transport' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'zara', 'ajio', 'meesho'], category: 'Shopping' },
  { keywords: ['netflix', 'spotify', 'prime video', 'youtube premium', 'icloud', 'disney'], category: 'Subscription' },
  { keywords: ['electricity', 'water bill', 'airtel', 'jio', 'act fibernet', 'rent'], category: 'Essentials' },
  { keywords: ['pvr', 'inox', 'bookmyshow', 'steam', 'epicgames', 'pub'], category: 'Entertainment' },
  { keywords: ['udemy', 'coursera', 'college', 'mit', 'bookstore'], category: 'Education' },
  { keywords: ['apollo', 'pharmacy', 'hospital', 'medplus', 'clinic'], category: 'Healthcare' }
];

export const parserEngine = {
  // Parse incoming text-based CSV strings
  parseCSV(rawText) {
    const lines = rawText.split('\n');
    const transactions = [];

    // Simple auto-detect header indices or fall back to standard schemas: Date, Description, Amount, Type
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle standard comma splits while protecting descriptions with internal punctuation commas
      const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      
      if (columns.length >= 3) {
        const rawDate = columns[0].replace(/"/g, '').trim();
        const rawDesc = columns[1].replace(/"/g, '').trim();
        const rawAmount = parseFloat(columns[2].replace(/"/g, '').trim());
        const rawType = columns[3] ? columns[3].replace(/"/g, '').trim().toLowerCase() : 'debit';

        if (!isNaN(rawAmount)) {
          // Pass item over to the rule parsing categorisation pipeline instantly
          const analysis = this.categorizeTransaction(rawDesc);

          transactions.push({
            id: 'tx_' + Math.random().toString(36).substr(2, 9),
            date: rawDate,
            description: rawDesc,
            merchant: analysis.merchant,
            amount: rawAmount,
            type: rawType, // 'debit' or 'credit'
            category: analysis.category,
            confidence: analysis.confidence
          });
        }
      }
    }
    return transactions;
  },

  // Rules-based keyword checking system (Phase 6)
  categorizeTransaction(description) {
    const cleanDesc = description.toLowerCase();
    let detectedCategory = 'Miscellaneous';
    let confidence = 'Low';
    let merchantName = description; // Fallback to raw description text

    // 1. Extract clean merchant labels by parsing common payment platforms away
    if (cleanDesc.includes('upizh') || cleanDesc.includes('upi')) {
      // Clear out common Indian banking processing codes to display cleaner items
      const parts = cleanDesc.split('-');
      if (parts.length > 1) merchantName = parts[1].toUpperCase();
    }

    // 2. Map keyword strings against the rule parameters
    for (const rule of CATEGORY_RULES) {
      for (const keyword of rule.keywords) {
        if (cleanDesc.includes(keyword)) {
          detectedCategory = rule.category;
          confidence = 'High';
          // Pretty-print the string match to isolate the clean vendor name
          merchantName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          return { category: detectedCategory, confidence, merchant: merchantName };
        }
      }
    }

    return { category: detectedCategory, confidence, merchant: merchantName };
  },

  // Quick fallback layout system to generate deterministic data if users use mock test clicks
  generateMockData() {
    return [
      { id: 'm1', date: '2026-05-10', description: 'UPI-Swiggy-RestoPay', merchant: 'Swiggy', amount: 450.00, type: 'debit', category: 'Food', confidence: 'High' },
      { id: 'm2', date: '2026-05-11', description: 'NETFLIX.COM INCOMING BILL', merchant: 'Netflix', amount: 649.00, type: 'debit', category: 'Subscription', confidence: 'High' },
      { id: 'm3', date: '2026-05-12', description: 'UPI-UberIndia-Ride', merchant: 'Uber', amount: 280.00, type: 'debit', category: 'Transport', confidence: 'High' },
      { id: 'm4', date: '2026-05-14', description: 'AMAZON SELLER PAYMENTS', merchant: 'Amazon', amount: 2499.00, type: 'debit', category: 'Shopping', confidence: 'High' },
      { id: 'm5', date: '2026-05-15', description: 'SALARY CREDIT COMP', merchant: 'Salary Accent', amount: 45000.00, type: 'credit', category: 'Miscellaneous', confidence: 'Low' },
      { id: 'm6', date: '2026-05-16', description: 'APOLLO PHARMACY BENGALURU', merchant: 'Apollo', amount: 820.00, type: 'debit', category: 'Healthcare', confidence: 'High' }
    ];
  }
};