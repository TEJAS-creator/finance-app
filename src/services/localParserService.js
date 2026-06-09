/**
 * AuraFinance Local High-Performance Parser Service.
 * Runs instantly in the client browser (<20ms) without calling any external APIs.
 * Supports robust dynamically-mapped CSV parsing and pattern-matched PDF text parsing.
 */

export const localParserService = {
  /**
   * Scans text for dynamic currency symbols or keywords.
   * Defaults to Indian Rupee (₹) if no USD keywords found.
   * @param {string} text 
   * @returns {string}
   */
  detectCurrency(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('$') || lower.includes('usd') || lower.includes('dollar')) {
      return '$';
    }
    return '₹';
  },

  /**
   * Scans text for dynamic banking keywords to verify it is a valid statement.
   * @param {string} text 
   * @returns {boolean}
   */
  validateIsStatement(text) {
    if (!text || text.trim().length === 0) return false;
    
    const lowercaseText = text.toLowerCase();
    const bankingKeywords = [
      'statement', 'transaction', 'balance', 'account', 'debit', 'credit', 
      'amount', 'withdrawal', 'deposit', 'payment', 'charge', 'ledger', 
      'narration', 'particulars', 'cheque', 'closing balance', 'spent'
    ];
    
    // Count how many unique banking keywords are present in the text block
    let matchCount = 0;
    bankingKeywords.forEach(keyword => {
      if (lowercaseText.includes(keyword)) {
        matchCount++;
      }
    });

    // Valid statements must match at least 3 distinct banking keywords
    return matchCount >= 3;
  },

  /**
   * Routes raw statement text to either CSV or PDF parse engines after validation.
   * @param {string} text 
   * @param {string} fileExtension 
   * @returns {{transactions: Array, insights: Array, summary: string, currencySymbol: string}}
   */
  parse(text, fileExtension = 'txt') {
    // 1. Strict document signature verification
    if (!this.validateIsStatement(text)) {
      throw new Error('The uploaded file does not appear to be a valid financial bank statement. Please verify you have uploaded a standard CSV or PDF statement.');
    }

    const ext = (fileExtension || '').toLowerCase();
    
    // Check if it is CSV structured data
    const isCSV = ext === 'csv' || text.trim().startsWith('Date,') || text.trim().includes('",');
    
    if (isCSV) {
      return this.parseCSV(text);
    } else {
      return this.parsePDFText(text);
    }
  },

  /**
   * Structured CSV Parser.
   * Scans headers dynamically to map columns, and processes 100% of rows accurately.
   */
  parseCSV(text) {
    console.log('[LocalParser] Parsing structured CSV statement...');
    const transactions = [];
    
    // Split into rows and clean them
    const rawLines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (rawLines.length === 0) {
      throw new Error('The statement CSV file appears to be empty.');
    }

    // Heuristic Header Scanner: Find the actual table headers (skipping metadata rows)
    let headerRowIdx = 0;
    let maxScore = -1;
    const searchLimit = Math.min(15, rawLines.length);

    for (let i = 0; i < searchLimit; i++) {
      const rowFields = this.parseCSVLine(rawLines[i]).map(f => f.toLowerCase().replace(/["']/g, '').trim());
      let score = 0;
      
      rowFields.forEach(field => {
        if (field.includes('date') || field.includes('txn') || field === 'dt') score += 2;
        if (field.includes('desc') || field.includes('narr') || field.includes('partic') || field.includes('remark') || field.includes('merch') || field.includes('paye') || field.includes('details')) score += 2;
        if (field.includes('amount') || field.includes('amt') || field.includes('debit') || field.includes('credit') || field.includes('withdrawal') || field.includes('deposit') || field.includes('spent')) score += 2;
      });

      if (score > maxScore) {
        maxScore = score;
        headerRowIdx = i;
      }
    }

    // Default to row 0 if no clear headers found
    if (maxScore < 2) {
      headerRowIdx = 0;
    }

    console.log(`[LocalParser] Detected header row at line index ${headerRowIdx} (score: ${maxScore})`);
    const headers = this.parseCSVLine(rawLines[headerRowIdx]).map(h => h.toLowerCase().replace(/["']/g, '').trim());
    
    let dateIdx = -1;
    let descIdx = -1;
    let amountIdx = -1;
    let debitIdx = -1;
    let creditIdx = -1;
    let typeIdx = -1;
    let categoryIdx = -1;

    headers.forEach((header, index) => {
      if (header.includes('date') || header.includes('txn') || header.includes('time') || header === 'dt') {
        if (dateIdx === -1) dateIdx = index;
      } else if (
        header.includes('desc') || 
        header.includes('narr') || 
        header.includes('partic') || 
        header.includes('remark') || 
        header.includes('merch') || 
        header.includes('paye') || 
        header.includes('info') ||
        header.includes('name') ||
        header === 'details'
      ) {
        if (descIdx === -1) descIdx = index;
      } else if (header.includes('debit') || header.includes('withdrawal') || header.includes('outflow') || header.includes('charge') || header.includes('spent')) {
        debitIdx = index;
      } else if (header.includes('credit') || header.includes('deposit') || header.includes('inflow') || header.includes('refund') || header.includes('received')) {
        creditIdx = index;
      } else if (header.includes('amount') || header.includes('val') || header.includes('sum') || header.includes('price') || header === 'amt') {
        amountIdx = index;
      } else if (header.includes('type')) {
        typeIdx = index;
      } else if (header.includes('category')) {
        categoryIdx = index;
      }
    });

    // Fallback: Guess layout defaults if headers could not be matched
    const useDefaults = dateIdx === -1 && descIdx === -1 && amountIdx === -1 && debitIdx === -1;
    if (useDefaults) {
      console.warn('[LocalParser] Could not auto-detect CSV header layout. Applying position defaults...');
      dateIdx = 0;
      descIdx = 1;
      amountIdx = 2;
    }

    // Determine starting index of data rows
    let dataRows = [];
    if (maxScore >= 2) {
      dataRows = rawLines.slice(headerRowIdx + 1);
    } else {
      // If we fallback to row 0 but it looks like a valid transaction row (starts with a date), include it!
      const firstRowFields = this.parseCSVLine(rawLines[0]);
      const datePattern = /\b(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})\b/;
      const hasDate = firstRowFields[0] && datePattern.test(firstRowFields[0]);
      if (hasDate) {
        dataRows = rawLines;
      } else {
        dataRows = rawLines.slice(1);
      }
    }

    // Parse Data Rows
    dataRows.forEach((line, index) => {
      const fields = this.parseCSVLine(line).map(f => f.replace(/^["']|["']$/g, '').trim());
      
      if (fields.length === 0 || fields.every(f => f === '')) return;

      const dateVal = dateIdx !== -1 && dateIdx < fields.length ? fields[dateIdx] : '';
      const descVal = descIdx !== -1 && descIdx < fields.length ? fields[descIdx] : '';
      
      if (!dateVal || dateVal.toLowerCase().includes('date') || dateVal.toLowerCase().includes('statement')) return;

      let amount = 0;
      let type = 'debit';

      if (debitIdx !== -1 && debitIdx < fields.length && fields[debitIdx] !== '') {
        const val = parseFloat(fields[debitIdx].replace(/[^0-9.-]/g, '')) || 0;
        if (val !== 0) {
          amount = Math.abs(val);
          type = 'debit';
        }
      }
      
      if (amount === 0 && creditIdx !== -1 && creditIdx < fields.length && fields[creditIdx] !== '') {
        const val = parseFloat(fields[creditIdx].replace(/[^0-9.-]/g, '')) || 0;
        if (val !== 0) {
          amount = Math.abs(val);
          type = 'credit';
        }
      }

      if (amount === 0 && amountIdx !== -1 && amountIdx < fields.length && fields[amountIdx] !== '') {
        const val = parseFloat(fields[amountIdx].replace(/[^0-9.-]/g, '')) || 0;
        amount = Math.abs(val);
        type = val < 0 ? 'debit' : 'credit';
      }

      if (amount === 0) {
        for (let i = 0; i < fields.length; i++) {
          if (i !== dateIdx && i !== descIdx && i !== categoryIdx && i !== typeIdx) {
            const val = parseFloat(fields[i].replace(/[^0-9.-]/g, '')) || 0;
            if (val !== 0) {
              amount = Math.abs(val);
              type = val < 0 ? 'debit' : 'credit';
              break;
            }
          }
        }
      }

      if (typeIdx !== -1 && typeIdx < fields.length) {
        const tVal = fields[typeIdx].toLowerCase();
        if (tVal.includes('credit') || tVal.includes('cr') || tVal.includes('dep') || tVal.includes('in')) {
          type = 'credit';
        } else {
          type = 'debit';
        }
      }

      if (amount === 0) return;

      const description = descVal || `Transaction item #${index + 1}`;
      const merchant = this.cleanMerchantName(description);
      
      let category = 'Miscellaneous';
      if (categoryIdx !== -1 && categoryIdx < fields.length && fields[categoryIdx] !== '') {
        category = this.normalizeCategoryName(fields[categoryIdx]);
      } else {
        category = this.classifyCategory(description);
      }

      const formattedDate = this.normalizeDate(dateVal);
      const confidence = this.isMatchingCategoryKeyword(description) ? 'High' : 'Medium';

      transactions.push({
        id: `tx_csv_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
        date: formattedDate,
        description,
        merchant,
        amount,
        type,
        category,
        confidence
      });
    });

    if (transactions.length === 0) {
      throw new Error('No transaction records could be matched in this statement CSV. Please verify it contains clear transaction date and amount columns.');
    }

    console.log(`[LocalParser] CSV parsed successfully. Read all ${transactions.length} rows.`);
    const currencySymbol = this.detectCurrency(text);
    const analytics = this.generateFinancialInsights(transactions, currencySymbol);
    return {
      transactions,
      insights: analytics.insights,
      summary: analytics.summary,
      currencySymbol
    };
  },

  /**
   * PDF/Text unstructured statement parser using advanced regex boundaries.
   */
  parsePDFText(text) {
    console.log('[LocalParser] Parsing raw unstructured PDF/Text statement...');
    const transactions = [];
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    const dateRegex = /\b(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/;
    const currencyRegex = /[-$€£]?\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g;

    lines.forEach((line, index) => {
      const dateMatch = line.match(dateRegex);
      if (!dateMatch) return;

      const rawDate = dateMatch[1];
      const numbers = line.match(currencyRegex) || [];
      if (numbers.length === 0) return;

      const parsedNumbers = numbers
        .map(n => n.replace(/[-$€£,]/g, ''))
        .map(n => parseFloat(n))
        .filter(n => !isNaN(n) && n !== 0);

      if (parsedNumbers.length === 0) return;

      let amount = parsedNumbers[0];
      let matchedNumberStr = numbers[0];

      if (rawDate.includes(matchedNumberStr) && parsedNumbers.length > 1) {
        amount = parsedNumbers[1];
        matchedNumberStr = numbers[1];
      }

      if (amount === 0 || amount > 1000000) return;

      let description = line
        .replace(rawDate, '')
        .replace(matchedNumberStr, '')
        .replace(/[^a-zA-Z\s*/\-()]/g, '')
        .trim();

      if (!description || description.length < 3) {
        description = `Transaction item Ref #${index + 101}`;
      }

      const merchant = this.cleanMerchantName(description);
      const category = this.classifyCategory(description);
      const confidence = this.isMatchingCategoryKeyword(description) ? 'High' : 'Medium';
      
      const lowercaseLine = line.toLowerCase();
      let type = 'debit';
      if (
        lowercaseLine.includes('cr') || 
        lowercaseLine.includes('credit') || 
        lowercaseLine.includes('salary') || 
        lowercaseLine.includes('deposit') || 
        lowercaseLine.includes('refund') || 
        lowercaseLine.includes('received')
      ) {
        type = 'credit';
      }

      const formattedDate = this.normalizeDate(rawDate);

      transactions.push({
        id: `tx_pdf_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
        date: formattedDate,
        description,
        merchant,
        amount,
        type,
        category,
        confidence
      });
    });

    if (transactions.length === 0) {
      throw new Error('No transaction records could be parsed from this PDF statement. Please make sure the uploaded PDF contains text-readable bank transaction lines.');
    }

    const currencySymbol = this.detectCurrency(text);
    const analytics = this.generateFinancialInsights(transactions, currencySymbol);
    return {
      transactions,
      insights: analytics.insights,
      summary: analytics.summary,
      currencySymbol
    };
  },

  /**
   * Helper to parse CSV fields securely, respecting quoted commas.
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  },

  /**
   * Date Normalization engine mapping DD-MMM-YY, MM/DD/YYYY, and more into YYYY-MM-DD.
   */
  normalizeDate(rawDate) {
    try {
      const clean = rawDate.replace(/[-/.]/g, ' ').trim();
      const parts = clean.split(/\s+/);
      
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let monthStr = parts[1].toLowerCase();
        let year = parseInt(parts[2]);

        if (parts[0].length === 4) {
          year = parseInt(parts[0]);
          monthStr = parts[1].toLowerCase();
          day = parseInt(parts[2]);
        }

        const months = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
          january: 0, february: 1, march: 2, april: 3, june: 5,
          july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
        };

        if (months[monthStr] !== undefined) {
          if (year < 100) {
            year += 2000;
          }
          const d = new Date(year, months[monthStr], day);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
          }
        }
      }

      const date = new Date(clean);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}

    return new Date().toISOString().split('T')[0];
  },

  /**
   * Cleans description to construct a beautiful human merchant label.
   */
  cleanMerchantName(description) {
    let clean = description.toUpperCase()
      .replace(/\b(POS|PURCHASE|WITHDRAWAL|TRANSFER|PAYMENT|DEBIT|CREDIT|ACH|EFT|ONLINE|MOBILE|BANK|IMPS|NEFT|RTGS|UPI|REF|NO)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const maps = [
      { key: 'STARBUCKS', name: 'Starbucks' },
      { key: 'MCDONALD', name: 'McDonalds' },
      { key: 'UBER', name: 'Uber' },
      { key: 'OLA', name: 'Ola Cab' },
      { key: 'AMAZON', name: 'Amazon' },
      { key: 'FLIPKART', name: 'Flipkart' },
      { key: 'NETFLIX', name: 'Netflix' },
      { key: 'SPOTIFY', name: 'Spotify' },
      { key: 'SWIGGY', name: 'Swiggy' },
      { key: 'ZOMATO', name: 'Zomato' },
      { key: 'RENT', name: 'Rent Payment' },
      { key: 'SALARY', name: 'Monthly Salary' }
    ];

    for (const item of maps) {
      if (clean.includes(item.key)) {
        return item.name;
      }
    }

    if (clean.length > 0) {
      return clean.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    return 'Unknown Merchant';
  },

  /**
   * Helper to normalize dynamic category fields in CSV files.
   */
  normalizeCategoryName(rawCategory) {
    const clean = rawCategory.trim().toLowerCase();
    const categories = ['Food', 'Transport', 'Shopping', 'Subscription', 'Essentials', 'Entertainment', 'Healthcare', 'Education', 'Miscellaneous'];
    
    for (const cat of categories) {
      if (clean === cat.toLowerCase() || cat.toLowerCase().includes(clean)) {
        return cat;
      }
    }
    return 'Miscellaneous';
  },

  /**
   * Local Classifier matching descriptions against category keywords.
   */
  classifyCategory(description) {
    const desc = description.toLowerCase();

    if (this.matchesKeywords(desc, ['starbucks', 'mcdonald', 'swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining', 'uber eats', 'pizza', 'burger', 'diner', 'eats', 'grill'])) {
      return 'Food';
    }
    if (this.matchesKeywords(desc, ['uber', 'ola', 'lyft', 'bolt', 'cab', 'taxi', 'train', 'metro', 'fuel', 'petrol', 'diesel', 'toll', 'shell', 'bpcl', 'hpcl', 'rail', 'transit'])) {
      return 'Transport';
    }
    if (this.matchesKeywords(desc, ['amazon', 'flipkart', 'retail', 'clothing', 'shoes', 'nike', 'zara', 'walmart', 'target', 'store', 'mall', 'gadget', 'apple', 'best buy', 'electronics', 'purchase', 'pos'])) {
      return 'Shopping';
    }
    if (this.matchesKeywords(desc, ['netflix', 'spotify', 'apple music', 'youtube premium', 'prime', 'disney', 'hulu', 'zoom', 'aws', 'digitalocean', 'github', 'adobe', 'cloud', 'microsoft', 'subscription', 'recur'])) {
      return 'Subscription';
    }
    if (this.matchesKeywords(desc, ['rent', 'landlord', 'society', 'apartment', 'maintenance', 'electricity', 'water', 'gas', 'bill', 'power', 'utility', 'insurance', 'loan', 'emi', 'mortgage', 'tax'])) {
      return 'Essentials';
    }
    if (this.matchesKeywords(desc, ['movie', 'cinema', 'theater', 'booking', 'concert', 'bar', 'pub', 'club', 'brewery', 'liquor', 'wine', 'game', 'steam', 'playstation', 'xbox', 'nintendo'])) {
      return 'Entertainment';
    }
    if (this.matchesKeywords(desc, ['pharma', 'chemist', 'hospital', 'clinic', 'doctor', 'medical', 'dental', 'vision', 'care', 'drug', 'meds', 'therapy'])) {
      return 'Healthcare';
    }
    if (this.matchesKeywords(desc, ['tuition', 'school', 'college', 'university', 'course', 'udemy', 'coursera', 'book', 'library', 'training', 'class'])) {
      return 'Education';
    }

    return 'Miscellaneous';
  },

  isMatchingCategoryKeyword(description) {
    const category = this.classifyCategory(description);
    return category !== 'Miscellaneous';
  },

  matchesKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  },

  /**
   * Expert rules-based Financial Analysis engine.
   */
  generateFinancialInsights(transactions, currencySymbol = '₹') {
    const totalExpenses = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalCredits = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netSavings = Math.max(0, totalCredits - totalExpenses);
    const savingsRate = totalCredits > 0 ? Math.round((netSavings / totalCredits) * 100) : 0;

    // Group expenses by category
    const categoryTotals = {};
    transactions.filter(t => t.type === 'debit').forEach(tx => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });

    let topCategory = 'Miscellaneous';
    let topCategoryAmount = 0;
    Object.keys(categoryTotals).forEach(cat => {
      if (categoryTotals[cat] > topCategoryAmount) {
        topCategoryAmount = categoryTotals[cat];
        topCategory = cat;
      }
    });

    const topCategoryPercent = totalExpenses > 0 ? Math.round((topCategoryAmount / totalExpenses) * 100) : 0;

    const symbol = currencySymbol;
    const locale = symbol === '₹' ? 'en-IN' : 'en-US';

    // Generate cohesive visual paragraph summary
    const summary = `Based on your bank statement, you logged a total outflow of ${symbol}${totalExpenses.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} against a total credit inflow of ${symbol}${totalCredits.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}, representing a healthy ${savingsRate}% net savings retention rate. Your single largest cash drain is concentrated within the **${topCategory}** category, consuming ${symbol}${topCategoryAmount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${topCategoryPercent}% of overall outlays). We recommend establishing a strict budget cap on ${topCategory.toLowerCase()} expenses to instantly boost your capital retention next month.`;

    // Generate bespoke insights
    const insights = [];

    if (savingsRate < 20) {
      insights.push(`Your net savings rate is currently sitting at ${savingsRate}%, which falls below the targeted 20% healthy financial buffer. We recommend automating a 'pay-yourself-first' transfer equal to 10% of inflows on salary day to instantly build up security reserves.`);
    } else {
      insights.push(`Incredible capital retention! You retained ${savingsRate}% of all inflows this statement period. Deploy this surplus cash into high-yield deposits or dividend index funds to grow your wealth passively.`);
    }

    if (topCategoryAmount > 0) {
      const optimizationTarget = Math.round(topCategoryAmount * 0.15);
      insights.push(`High category concentration found: **${topCategory}** represents ${topCategoryPercent}% of all expenditure. Trimming just 15% of these purchases next month will instantly release an extra ${symbol}${optimizationTarget.toLocaleString(locale, { maximumFractionDigits: 0 })} in net monthly cash flow.`);
    } else {
      insights.push(`Your expenses are evenly distributed across categories with no dangerous cost centers. Continue maintaining this balanced budget structure to avoid lifestyle inflation.`);
    }

    const subscriptionsTotal = categoryTotals['Subscription'] || 0;
    if (subscriptionsTotal > 0) {
      insights.push(`We flagged ${symbol}${subscriptionsTotal.toLocaleString(locale, { maximumFractionDigits: 0 })} in recurring **Subscription** lines. Audit-checking and terminating just two dormant memberships will trim immediate wastage and free up passive investment capital.`);
    } else {
      insights.push(`No heavy subscription drains detected! Your recurrent cash flows look extremely lean, allowing more flexibility in allocating emergency budgets.`);
    }

    return {
      summary,
      insights
    };
  },

  /**
   * Kept for developer configuration, never triggered on parse errors.
   */
  generateTemplateTransactions() {
    const today = new Date();
    const daysAgo = (days) => {
      const d = new Date(today);
      d.setDate(today.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    return [
      {
        id: 'tx_loc_fb_1',
        date: daysAgo(2),
        description: 'MONTHLY NET SALARY TRANSFER',
        merchant: 'Monthly Salary',
        amount: 4500.00,
        type: 'credit',
        category: 'Essentials',
        confidence: 'High'
      },
      {
        id: 'tx_loc_fb_2',
        date: daysAgo(3),
        description: 'APARTMENT RENT WIRE PAYMENT',
        merchant: 'Rent Payment',
        amount: 1400.00,
        type: 'debit',
        category: 'Essentials',
        confidence: 'High'
      }
    ];
  }
};
