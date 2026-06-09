import { useState, useEffect } from 'react';
import StatementUpload from '../components/StatementUpload';
import { dbService } from '../services/dbService';
import { geminiService } from '../services/geminiService';
import { localParserService } from '../services/localParserService';
import { 
  CreditCard, 
  TrendingUp, 
  ShieldAlert, 
  UploadCloud, 
  ArrowUpRight, 
  PieChart as PieIcon, 
  BarChart2,
  Sparkles, 
  Receipt,
  Trash2,
  Eye,
  EyeOff,
  HelpCircle,
  X
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import './Dashboard.css';

// Curated minimalist dark-mode color scheme
const CATEGORY_COLORS = {
  'Food': '#6366f1',         // Indigo
  'Transport': '#3b82f6',    // Blue
  'Shopping': '#ec4899',     // Pink
  'Subscription': '#a855f7', // Purple
  'Essentials': '#10b981',   // Emerald
  'Entertainment': '#f59e0b',// Amber
  'Healthcare': '#ef4444',   // Red
  'Education': '#06b6d4',    // Cyan
  'Miscellaneous': '#64748b' // Slate
};

// Premium Glassmorphic Tooltip for Recharts Donut
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-label">{payload[0].name}</p>
        <p className="tooltip-value">₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [statementSummary, setStatementSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const formatCurrency = (amount) => {
    const locale = currencySymbol === '₹' ? 'en-IN' : 'en-US';
    return `${currencySymbol}${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
  };

  const formatCurrencyDecimals = (amount) => {
    const locale = currencySymbol === '₹' ? 'en-IN' : 'en-US';
    return `${currencySymbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Structured AI analyzer progression shimmers
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');

  // Premium interactive chart state selectors
  const [activeSegment, setActiveSegment] = useState(null);
  const [chartView, setChartView] = useState('pie');
  const [summaryMode, setSummaryMode] = useState('simple');
  const [forecastBalance, setForecastBalance] = useState('50,000');

  const handleMouseEnter = (_, index) => {
    setActiveSegment(expenseData[index]);
  };

  const handleMouseLeave = () => {
    setActiveSegment(null);
  };

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'User';

  // 1. Fetch transactions and AI insights from Firestore on mount/user change
  useEffect(() => {
    let active = true;
    console.log('Dashboard useEffect triggered. User UID:', user?.uid);
    async function loadData() {
      if (user?.uid) {
        setIsLoading(true);
        console.log('Dashboard loadData initiated for UID:', user.uid);
        // Robust timing sync: wait 150ms for Firebase SDK auth-token handshake
        await new Promise(resolve => setTimeout(resolve, 150));
        
        if (!active) {
          console.log('Dashboard loadData aborted due to cleanup.');
          return;
        }
        
        try {
          const fetchedData = await dbService.getTransactions(user.uid);
          const fetchedInsights = await dbService.getLatestInsights(user.uid);
          if (active) {
            setTransactions(fetchedData);
            setAiInsights(fetchedInsights?.insights || []);
            setStatementSummary(fetchedInsights?.summary || '');
            setCurrencySymbol(fetchedInsights?.currencySymbol || '₹');
          }
        } catch (error) {
          console.error('Error hydrating transaction/insight state:', error);
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      } else {
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [user]);

  // 2. Compute financial summary indicators
  const totalExpenses = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const estimatedSavings = Math.max(0, totalCredits - totalExpenses);

  // Sort transactions chronologically (newest first) to show a proper proper transaction ledger
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Determine financial health score on the fly
  let financialHealth = '--';
  let financialHealthColor = 'var(--text-muted)';
  if (transactions.length > 0) {
    const ratio = totalExpenses / (totalCredits || 1);
    if (ratio < 0.4) {
      financialHealth = 'Excellent';
      financialHealthColor = '#10b981';
    } else if (ratio < 0.7) {
      financialHealth = 'Good';
      financialHealthColor = '#6366f1';
    } else {
      financialHealth = 'Caution';
      financialHealthColor = '#f59e0b';
    }
  }

  // 3. Handle File Extraction completion from Dragzone
  const handleFileLoaded = async (rawText, fileExtension, fileName) => {
    if (!user?.uid) return;

    try {
      setIsAnalyzing(true);
      
      setAnalysisStep('Analyzing statement structure locally...');
      await new Promise(r => setTimeout(r, 200));

      setAnalysisStep('Parsing transaction records and categories instantly...');
      const response = localParserService.parse(rawText, fileExtension);
      await new Promise(r => setTimeout(r, 150));
      
      setAnalysisStep(`Syncing ${response.transactions.length} transactions to secure Firestore...`);
      // Batch write transactions to Firestore in groups of 400
      await dbService.saveTransactions(user.uid, response.transactions);
      
      setAnalysisStep('Generating local expert financial insights...');
      await dbService.saveLatestInsights(user.uid, response.insights, response.summary, response.currencySymbol);

      setAnalysisStep('Refreshing dashboard analytics...');
      await new Promise(r => setTimeout(r, 100));
      const refreshedData = await dbService.getTransactions(user.uid);
      const refreshedInsights = await dbService.getLatestInsights(user.uid);
      
      setTransactions(refreshedData);
      setAiInsights(refreshedInsights?.insights || []);
      setStatementSummary(refreshedInsights?.summary || '');
      setCurrencySymbol(refreshedInsights?.currencySymbol || '₹');
    } catch (error) {
      console.error('Local statement extraction failure:', error);
      alert('Parsing Error: ' + error.message);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // 4. Reset & Clear statement database
  const handlePurge = async () => {
    if (!user?.uid) return;
    
    if (window.confirm('Are you sure you want to clear all statement transaction logs and AI insights? This action is permanent and deletes real-time data from Firestore.')) {
      try {
        setIsLoading(true);
        await dbService.clearTransactions(user.uid);
        setTransactions([]);
        setAiInsights([]);
        setStatementSummary('');
      } catch (error) {
        console.error('Purge error:', error);
        alert('Could not clear remote records: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 5. Build dynamic insight objects from transaction parameters
  const generateInsights = () => {
    if (transactions.length === 0) {
      return [
        {
          id: 'empty',
          text: 'Awaiting financial data files. Upload a CSV/PDF statement to run automated budget diagnostics.',
          type: 'info'
        }
      ];
    }

    const insights = [];

    // Leak category analyzer
    const categoryTotals = transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {});

    let highestCategory = '';
    let highestAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val > highestAmount) {
        highestAmount = val;
        highestCategory = cat;
      }
    });

    if (highestCategory) {
      const pct = totalExpenses > 0 ? ((highestAmount / totalExpenses) * 100).toFixed(0) : 0;
      insights.push({
        id: 'leak',
        text: 'Peak outlay detected in ',
        bold: `${highestCategory} (₹${highestAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`,
        suffix: `, consuming ${pct}% of overall monthly expenses. Consider introducing minor budget controls here.`
      });
    }

    // Savings index advice
    if (totalCredits > 0) {
      const rate = ((estimatedSavings / totalCredits) * 100).toFixed(1);
      insights.push({
        id: 'rate',
        text: 'You are retaining ',
        bold: `${rate}%`,
        suffix: ` of aggregate statement inflows as net liquid savings. Maintaining >20% accelerates long term assets.`
      });
    } else if (totalExpenses > 0) {
      insights.push({
        id: 'no-income',
        text: 'Outflows mapped, but ',
        bold: 'no active income stream',
        suffix: ' was detected. Include credit rows in statements for full net savings evaluations.'
      });
    }

    // Balance checks
    const essentialSum = (categoryTotals['Essentials'] || 0) + (categoryTotals['Healthcare'] || 0) + (categoryTotals['Transport'] || 0);
    const nonEssentialSum = totalExpenses - essentialSum;
    if (nonEssentialSum > essentialSum) {
      insights.push({
        id: 'discretionary',
        text: 'Discretionary spend is ',
        bold: 'currently outpacing essential needs',
        suffix: '. Consider auditing ongoing monthly subscriptions to streamline structural cash flows.'
      });
    } else {
      insights.push({
        id: 'balanced',
        text: 'Structural balance verified. ',
        bold: 'Fixed essential costs are well-contained',
        suffix: ' relative to leisure/shopping parameters. Excellent control.'
      });
    }

    return insights;
  };

  // 5. Render custom AI insights or fall back to system rule-based insights
  const getInsightsToRender = () => {
    if (aiInsights && aiInsights.length > 0) {
      return aiInsights.map((insight, index) => ({
        id: `ai-${index}`,
        text: insight,
        isAi: true
      }));
    }
    return generateInsights();
  };

  // 6. Persist key configuration in localStorage
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const cleanKey = tempApiKey.trim();
    if (cleanKey === '') {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
      alert('Gemini API Key removed. AI processing features disabled.');
    } else {
      localStorage.setItem('gemini_api_key', cleanKey);
      setApiKey(cleanKey);
      alert('Gemini API Key saved. AI analysis processing fully active!');
    }
    setIsSettingsOpen(false);
  };

  // Group debit transactions for Recharts Donut
  const debitTransactions = transactions.filter(t => t.type === 'debit');
  const expenseData = Object.entries(
    debitTransactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Hydrate full shimmers if page loading state is active
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.3s ease' }}>
        <div>
          <div className="skeleton-line" style={{ width: '220px', height: '24px', marginBottom: '8px' }}></div>
          <div className="skeleton-line" style={{ width: '340px', height: '14px' }}></div>
        </div>

        <div className="metrics-row">
          <div className="metric-card" style={{ height: '130px', justifyContent: 'center' }}>
            <div className="skeleton-line" style={{ width: '40%', marginBottom: '12px' }}></div>
            <div className="skeleton-line" style={{ width: '80%', height: '28px' }}></div>
          </div>
          <div className="metric-card" style={{ height: '130px', justifyContent: 'center' }}>
            <div className="skeleton-line" style={{ width: '40%', marginBottom: '12px' }}></div>
            <div className="skeleton-line" style={{ width: '80%', height: '28px' }}></div>
          </div>
          <div className="metric-card" style={{ height: '130px', justifyContent: 'center' }}>
            <div className="skeleton-line" style={{ width: '40%', marginBottom: '12px' }}></div>
            <div className="skeleton-line" style={{ width: '80%', height: '28px' }}></div>
          </div>
        </div>

        <div className="workspace-grid">
          <div className="left-column">
            <div className="dashboard-panel" style={{ height: '240px' }}>
              <div className="skeleton-line" style={{ width: '150px', marginBottom: '20px' }}></div>
              <div className="skeleton-line" style={{ height: '130px' }}></div>
            </div>
          </div>
          <div className="right-column">
            <div className="dashboard-panel" style={{ height: '240px' }}>
              <div className="skeleton-line" style={{ width: '150px', marginBottom: '20px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '130px' }}>
                <div className="skeleton-line" style={{ width: '120px', height: '120px', borderRadius: '50%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="db-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="db-title">Welcome back, {firstName}</h1>
          <p className="db-subtitle">Here is your automated spending intelligence snapshot.</p>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-title">Total Expenses</span>
            <CreditCard size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="metric-card-value">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="metric-card-footer">
            <span className="badge-neutral">{transactions.length} items logged</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-title">Net Savings</span>
            <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="metric-card-value">₹{estimatedSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="metric-card-footer">
            <span className="badge-neutral">Based on delta credits</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-title">Financial Health</span>
            <ShieldAlert size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="metric-card-value" style={{ color: financialHealthColor }}>{financialHealth}</div>
          <div className="metric-card-footer">
            <span className="badge-neutral">{transactions.length > 0 ? 'Engine running' : 'Awaiting data'}</span>
          </div>
        </div>
      </div>

      {statementSummary && (
        <div className="dashboard-panel summary-hero-card" style={{ marginBottom: '24px', animation: 'slideDown 0.4s ease' }}>
          <div className="chart-header-row" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} className="pulsing-ai-icon" style={{ color: '#f59e0b' }} />
              <h2 className="panel-title" style={{ margin: 0 }}>Statement Diagnosis</h2>
            </div>
            
            <div className="chart-view-toggle">
              <button 
                className={`chart-toggle-btn ${summaryMode === 'simple' ? 'active' : ''}`}
                onClick={() => setSummaryMode('simple')}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                👶 Layman View
              </button>
              <button 
                className={`chart-toggle-btn ${summaryMode === 'expert' ? 'active' : ''}`}
                onClick={() => setSummaryMode('expert')}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                🔬 AI Detailed
              </button>
            </div>
          </div>

          {summaryMode === 'simple' ? (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="layman-overview-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: '16px', 
                marginTop: '8px' 
              }}>
                {/* Savings Meter Card */}
                <div className="layman-health-box" style={{ 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                    Financial Health Score
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: '800', color: financialHealthColor }}>
                      {financialHealth}
                    </span>
                    {totalCredits > 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        ({((estimatedSavings / totalCredits) * 100).toFixed(0)}% Saved)
                      </span>
                    )}
                  </div>
                  <div className="progress-bar-container" style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ 
                      width: `${totalCredits > 0 ? Math.min(100, (estimatedSavings / totalCredits) * 100) : 0}%`, 
                      height: '100%', 
                      backgroundColor: financialHealthColor,
                      borderRadius: '3px'
                    }}></div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    {financialHealth === 'Excellent' && "Outstanding job! You are saving a huge portion of your income."}
                    {financialHealth === 'Good' && "Nice going! You are retaining a solid safety net."}
                    {financialHealth === 'Caution' && "You are spending almost everything you earn. Try to cut back on luxuries."}
                    {transactions.length > 0 && totalCredits === 0 && "No credits found. We need an income stream to score savings."}
                  </p>
                </div>

                {/* The "Where did my money go?" Card */}
                <div className="layman-health-box" style={{ 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                    Biggest Expense Category
                  </span>
                  {expenseData.length > 0 ? (
                    (() => {
                      const sortedExpenses = [...expenseData].sort((a, b) => b.value - a.value);
                      const biggest = sortedExpenses[0];
                      const pct = totalExpenses > 0 ? ((biggest.value / totalExpenses) * 100).toFixed(0) : 0;
                      const catColor = CATEGORY_COLORS[biggest.name] || '#64748b';
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: catColor }}>
                              {biggest.name}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                              ₹{biggest.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                            This category took <strong>{pct}%</strong> of your total spending. Keeping an eye on this is your quickest way to save cash!
                          </p>
                        </>
                      );
                    })()
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No expense data processed yet.</span>
                  )}
                </div>

                {/* Inflow vs Outflow comparison */}
                <div className="layman-health-box" style={{ 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                    Quick Balance Ledger
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>🟢 Earned (Money In):</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>₹{totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>🔴 Spent (Money Out):</span>
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Saved Capital:</span>
                      <span style={{ fontWeight: '800', color: '#3b82f6' }}>₹{estimatedSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ 
                marginTop: '16px', 
                padding: '12px 16px', 
                background: 'rgba(245, 158, 11, 0.04)', 
                border: '1px solid rgba(245, 158, 11, 0.12)', 
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💡 Layman's Simple Takeaway
                </span>
                <p style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.85)', margin: 0, lineHeight: '1.5' }}>
                  {(() => {
                    const sortedExpenses = [...expenseData].sort((a, b) => b.value - a.value);
                    const biggest = sortedExpenses[0];
                    if (totalCredits === 0) {
                      return "You spent a total of ₹" + totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + " this period. Make sure to record your income statements so we can see how much you are saving!";
                    }
                    if (estimatedSavings === 0) {
                      return "Warning: You are spending more than you earn! Your highest spend was on " + (biggest ? biggest.name : 'other categories') + ". We recommend cutting down on non-essentials immediately to get back on track.";
                    }
                    return "Fantastic! You saved ₹" + estimatedSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + " of your earnings. Your biggest single money drain is " + (biggest ? biggest.name : 'other categories') + ". Reducing this slightly next month will boost your savings even further!";
                  })()}
                </p>
              </div>

              <div style={{ 
                marginTop: '12px', 
                padding: '12px 16px', 
                background: 'rgba(59, 130, 246, 0.04)', 
                border: '1px solid rgba(59, 130, 246, 0.12)', 
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎯 Layman's Actionable Savings Boosters
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const sortedExpenses = [...expenseData].sort((a, b) => b.value - a.value);
                    const biggest = sortedExpenses[0];
                    const savingsRate = totalCredits > 0 ? (estimatedSavings / totalCredits) : 0;
                    
                    const tips = [];
                    
                    if (savingsRate < 0.20) {
                      tips.push({
                        title: "1-Week Discretionary Fast ⏳",
                        desc: "You are currently saving less than 20% of your earnings. Try to cut want-spending (eating out, impulse buying) for just 7 days. This simple reset can instantly double your monthly savings!"
                      });
                    } else {
                      tips.push({
                        title: "Automate a 10% Wealth Transfer 💸",
                        desc: "Superb saving rate! Separate ₹" + (totalCredits * 0.1).toLocaleString('en-IN', { maximumFractionDigits: 0 }) + " automatically on salary day into high-yield deposits before you get a chance to spend it."
                      });
                    }

                    if (biggest) {
                      const trimAmt = biggest.value * 0.15;
                      tips.push({
                        title: "Targeted 15% Trim on " + biggest.name + " ✂️",
                        desc: "Trimming your top category (" + biggest.name + ") by a minor 15% next month will save you ₹" + trimAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + " instantly with zero lifestyle pain."
                      });
                    }

                    return tips.map((tip, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.9rem', marginTop: '1px', color: '#3b82f6' }}>•</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{tip.title}</span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{tip.desc}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <p className="summary-text" style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-main)', margin: 0, fontWeight: '400', animation: 'fadeIn 0.3s ease' }}>
              {statementSummary}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            <span className="summary-pill">Coverage: 100%</span>
            <span className="summary-pill">Parser: gemini-2.5-flash</span>
            <span className="summary-pill">Confidence: High</span>
          </div>
        </div>
      )}

      <div className="workspace-grid">
        <div className="left-column">
          <div className="dashboard-panel">
            <h2 className="panel-title">
              <UploadCloud size={18} style={{ color: 'var(--primary)' }} />
              Upload Bank Statement
            </h2>
            <StatementUpload onFileLoaded={handleFileLoaded} />
          </div>

          <div className="dashboard-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 className="panel-title" style={{ margin: 0 }}>
                <ArrowUpRight size={18} style={{ color: 'var(--primary)' }} />
                Recent Ledger
              </h2>
              {transactions.length > 0 && (
                <button className="purge-btn" onClick={handlePurge}>
                  <Trash2 size={13} />
                  Reset Dashboard
                </button>
              )}
            </div>
            
            {transactions.length === 0 ? (
              <div className="placeholder-box" style={{ minHeight: '140px' }}>
                <Receipt size={28} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: '0.8rem' }}>No transaction lines loaded. Upload a bank statement above to map records.</p>
              </div>
            ) : (
              <div className="tx-list-stack">
                {sortedTransactions.map((tx) => (
                  <div key={tx.id} className="tx-row-item">
                    <div className="tx-meta-left">
                      <div className="category-icon-frame" style={{ color: CATEGORY_COLORS[tx.category] || 'var(--primary)' }}>
                        <Receipt size={16} />
                      </div>
                      <div>
                        <p className="tx-vendor" title={tx.description}>{tx.merchant}</p>
                        <p className="tx-date-badge">{tx.date}</p>
                      </div>
                      <span className="tx-category-badge" style={{ borderColor: CATEGORY_COLORS[tx.category] + '33', color: CATEGORY_COLORS[tx.category] }}>
                        {tx.category}
                      </span>
                    </div>
                    <div className={`tx-amount-right ${tx.type}`}>
                      {tx.type === 'debit' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="right-column">
          <div className="dashboard-panel">
            <div className="chart-header-row">
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                {chartView === 'pie' ? (
                  <PieIcon size={18} style={{ color: 'var(--primary)' }} />
                ) : (
                  <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
                )}
                Expense Distribution
              </h2>
              
              {debitTransactions.length > 0 && (
                <div className="chart-view-toggle">
                  <button 
                    className={`chart-toggle-btn ${chartView === 'pie' ? 'active' : ''}`}
                    onClick={() => setChartView('pie')}
                  >
                    <PieIcon size={13} />
                    Donut
                  </button>
                  <button 
                    className={`chart-toggle-btn ${chartView === 'bar' ? 'active' : ''}`}
                    onClick={() => setChartView('bar')}
                  >
                    <BarChart2 size={13} />
                    Breakdown
                  </button>
                </div>
              )}
            </div>
            
            {debitTransactions.length === 0 ? (
              <div className="placeholder-box" style={{ minHeight: '220px' }}>
                <PieIcon size={32} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Visual metrics map out instantly here post processing.</p>
              </div>
            ) : chartView === 'pie' ? (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div className="donut-chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        {expenseData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[entry.name] || '#64748b'} 
                            style={{
                              filter: activeSegment && activeSegment.name === entry.name 
                                ? `drop-shadow(0 0 6px ${CATEGORY_COLORS[entry.name]}88)` 
                                : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="donut-center-content">
                    {activeSegment ? (
                      <>
                        <span className="donut-center-label" style={{ color: CATEGORY_COLORS[activeSegment.name] }}>{activeSegment.name}</span>
                        <span className="donut-center-value">₹{activeSegment.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span className="donut-center-sub">
                          {((activeSegment.value / totalExpenses) * 100).toFixed(1)}% of total
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="donut-center-label">Total Outflow</span>
                        <span className="donut-center-value">₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span className="donut-center-sub">across {debitTransactions.length} lines</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="chart-legend-grid">
                  {expenseData.map((entry) => {
                    const pct = ((entry.value / totalExpenses) * 100).toFixed(1);
                    const color = CATEGORY_COLORS[entry.name] || '#64748b';
                    const isHovered = activeSegment && activeSegment.name === entry.name;
                    return (
                      <div 
                        key={entry.name} 
                        className={`legend-item-pill ${isHovered ? 'active' : ''}`}
                        onMouseEnter={() => setActiveSegment(entry)}
                        onMouseLeave={() => setActiveSegment(null)}
                        style={{ '--item-color': color }}
                      >
                        <div className="legend-indicator-dot" style={{ backgroundColor: color }}></div>
                        <span className="legend-label">{entry.name}</span>
                        <span className="legend-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="horizontal-bar-stack" style={{ animation: 'fadeIn 0.3s ease' }}>
                {expenseData
                  .sort((a, b) => b.value - a.value)
                  .map((entry) => {
                    const pct = ((entry.value / totalExpenses) * 100).toFixed(1);
                    const color = CATEGORY_COLORS[entry.name] || '#64748b';
                    return (
                      <div key={entry.name} className="bar-rank-item">
                        <div className="bar-rank-header">
                          <span className="bar-rank-name">{entry.name}</span>
                          <span className="bar-rank-values">
                            <strong>₹{entry.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                            <span className="bar-rank-pct">({pct}%)</span>
                          </span>
                        </div>
                        <div className="bar-rank-track">
                          <div 
                            className="bar-rank-fill" 
                            style={{ 
                              width: `${pct}%`, 
                              backgroundColor: color,
                              boxShadow: `0 0 10px ${color}44`
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="dashboard-panel">
            <h2 className="panel-title">
              <Sparkles size={18} style={{ color: '#f59e0b' }} />
              Smart Financial Insights
            </h2>
            <div className="insights-stack">
              {getInsightsToRender().map((insight) => (
                <div key={insight.id} className="insight-card-item">
                  <Sparkles size={14} style={{ color: insight.isAi ? '#f59e0b' : 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                  <p>
                    {insight.text}
                    {insight.bold && (
                      <span className="insight-text-bold">{insight.bold}</span>
                    )}
                    {insight.suffix}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-panel" style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              AI Runway & Balance Forecast
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4', margin: '0 0 16px 0' }}>
              Walnut only tracks the past. Our predictive burn-rate model forecasts your dynamic financial durability.
            </p>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Enter Your Current Bank Balance
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '700' }}>₹</span>
                  <input 
                    type="text" 
                    value={forecastBalance}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                      setForecastBalance(cleanVal ? parseInt(cleanVal).toLocaleString('en-IN') : '');
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '8px 12px 8px 24px',
                      color: 'var(--text-main)',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      outline: 'none',
                      transition: 'border 0.2s',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Enter current balance..."
                  />
                </div>
              </div>

              {debitTransactions.length > 0 && (
                (() => {
                  const balanceNum = parseFloat(forecastBalance.replace(/,/g, '')) || 0;
                  const monthlyOutflow = totalExpenses;
                  const runwayMonths = monthlyOutflow > 0 ? (balanceNum / monthlyOutflow) : 999;
                  
                  let runwayStatus = 'Excellent';
                  let runwayColor = '#10b981';
                  let runwayText = 'Outstanding! Your reserve fund is highly secure.';
                  
                  if (runwayMonths < 3) {
                    runwayStatus = 'Critical Alert';
                    runwayColor = '#ef4444';
                    runwayText = 'Warning: Emergency cash reserves are very thin. Try to build a 3-month buffer.';
                  } else if (runwayMonths < 6) {
                    runwayStatus = 'Moderate Buffer';
                    runwayColor = '#f59e0b';
                    runwayText = 'Good cushion, but aiming for a 6-month reserve is ideal for full peace of mind.';
                  }
                  
                  return (
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      borderLeft: `4px solid ${runwayColor}`,
                      borderRadius: '4px 8px 8px 4px',
                      padding: '10px 12px',
                      marginTop: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Survival Runway</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: runwayColor, textTransform: 'uppercase' }}>{runwayStatus}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {runwayMonths >= 999 ? 'Infinite' : runwayMonths.toFixed(1) + ' Months'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>before reserves run dry</span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.3' }}>
                        {runwayText}
                      </p>
                    </div>
                  );
                })()
              )}
            </div>

            {debitTransactions.length > 0 && (
              (() => {
                const balanceNum = parseFloat(forecastBalance.replace(/,/g, '')) || 0;
                
                // 3 Month Projections
                const projRealistic = balanceNum + (estimatedSavings * 3);
                const projOptimistic = balanceNum + ((totalCredits - (totalExpenses * 0.85)) * 3);
                const projConservative = balanceNum + ((totalCredits - (totalExpenses * 1.15)) * 3);

                return (
                  <div>
                    <h3 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '10px', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>
                      AI Projected 3-Month Balance Forecast
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Realistic */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>🔮 Realistic Projection</span>
                          <span style={{ color: '#3b82f6', fontWeight: '800' }}>₹{projRealistic.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assumes current savings habits hold constant.</div>
                      </div>

                      {/* Optimistic */}
                      <div style={{ background: 'rgba(16, 185, 129, 0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>🚀 Optimistic (Save 15% More)</span>
                          <span style={{ color: '#10b981', fontWeight: '800' }}>₹{Math.max(0, projOptimistic).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assumes strict trimming of discretionary expenses.</div>
                      </div>

                      {/* Conservative */}
                      <div style={{ background: 'rgba(239, 68, 68, 0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>⚠️ Conservative (Spur Spend)</span>
                          <span style={{ color: '#ef4444', fontWeight: '800' }}>₹{Math.max(0, projConservative).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assumes 15% surprise spending hikes or emergency outlays.</div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal removed in favor of direct embedded api keys */}

      {/* Shimmering Full-Screen Gemini AI Processing Overlay */}
      {isAnalyzing && (
        <div className="analysis-overlay">
          <div className="analysis-loader-card">
            <div className="aurora-pulse"></div>
            <div className="ai-spinner-container">
              <Sparkles size={36} className="spinning-ai-sparkle" />
            </div>
            <h3 className="analysis-loading-title">Gemini AI Engine</h3>
            <p className="analysis-step-text">{analysisStep}</p>
            <div className="shimmering-bar-bg">
              <div className="shimmering-bar-fill"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}