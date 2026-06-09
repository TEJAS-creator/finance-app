import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  writeBatch, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';

export const dbService = {
  // 1. Safe batch write transactions to Firestore in chunks of 400
  async saveTransactions(userId, transactions) {
    if (!userId || !transactions || transactions.length === 0) return;

    try {
      const userTxCollectionRef = collection(db, 'users', userId, 'transactions');
      const chunkSize = 400;

      for (let i = 0; i < transactions.length; i += chunkSize) {
        const chunk = transactions.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((tx) => {
          // Generate a new document reference with a generated ID if not present
          const txDocRef = doc(userTxCollectionRef, tx.id || undefined);
          
          // Prepare normalized record structures
          const normalizedTx = {
            id: txDocRef.id,
            date: tx.date || new Date().toISOString().split('T')[0],
            description: tx.description || '',
            merchant: tx.merchant || 'Unknown',
            amount: parseFloat(tx.amount) || 0,
            type: tx.type || 'debit',
            category: tx.category || 'Miscellaneous',
            confidence: tx.confidence || 'Low',
            uploadedAt: new Date().toISOString()
          };

          batch.set(txDocRef, normalizedTx);
        });

        // Commit the current chunk atomically
        await batch.commit();
      }

      console.log(`Successfully synced ${transactions.length} items to Firestore.`);
    } catch (error) {
      console.error('Error batch writing transactions to Firestore:', error);
      throw new Error('Failed to synchronize statement with database.');
    }
  },

  // 2. Query and retrieve all user transactions
  async getTransactions(userId) {
    if (!userId) return [];

    try {
      const userTxCollectionRef = collection(db, 'users', userId, 'transactions');
      // Sort primarily by transaction date descending
      const q = query(userTxCollectionRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      const transactions = [];
      querySnapshot.forEach((docSnap) => {
        transactions.push(docSnap.data());
      });

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions from Firestore:', error);
      throw new Error('Could not retrieve transaction records.');
    }
  },

  // 3. Clear all transaction logs and insights for a clean dashboard purge
  async clearTransactions(userId) {
    if (!userId) return;

    try {
      const userTxCollectionRef = collection(db, 'users', userId, 'transactions');
      const querySnapshot = await getDocs(userTxCollectionRef);

      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Also clear latest insights doc
      const insightsDocRef = doc(db, 'users', userId, 'insights', 'latest');
      batch.delete(insightsDocRef);

      await batch.commit();
      console.log('Successfully purged transactions and AI insights from Firestore.');
    } catch (error) {
      console.error('Error purging transactions from Firestore:', error);
      throw new Error('Could not reset statement database.');
    }
  },

  // 4. Save latest AI insights to Firestore
  async saveLatestInsights(userId, insights, summary = '', currencySymbol = '₹') {
    if (!userId || !insights) return;

    try {
      const batch = writeBatch(db);
      const insightsDocRef = doc(db, 'users', userId, 'insights', 'latest');
      
      batch.set(insightsDocRef, {
        insights: insights,
        summary: summary,
        currencySymbol: currencySymbol,
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
      console.log('Successfully saved AI insights and summary to Firestore.');
    } catch (error) {
      console.error('Error writing AI insights to Firestore:', error);
      throw new Error('Failed to synchronize AI insights.');
    }
  },

  // 5. Retrieve latest AI insights from Firestore
  async getLatestInsights(userId) {
    if (!userId) return { insights: [], summary: '', currencySymbol: '₹' };

    try {
      const querySnapshot = await getDocs(collection(db, 'users', userId, 'insights'));
      
      let data = { insights: [], summary: '', currencySymbol: '₹' };
      querySnapshot.forEach((docSnap) => {
        if (docSnap.id === 'latest') {
          data.insights = docSnap.data().insights || [];
          data.summary = docSnap.data().summary || '';
          data.currencySymbol = docSnap.data().currencySymbol || '₹';
        }
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching AI insights from Firestore:', error);
      return { insights: [], summary: '', currencySymbol: '₹' };
    }
  }
};
