import { useState, useEffect } from 'react';
import { ArrowLeftRight, RefreshCw, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import './CurrencyConverter.css';

export default function CurrencyConverter({ defaultToCurrency = 'INR' }) {
  const [rates, setRates] = useState({});
  const [currencies, setCurrencies] = useState([]);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState(defaultToCurrency);
  const [amount, setAmount] = useState('1');
  const [convertedAmount, setConvertedAmount] = useState('0.00');
  const [lastUpdated, setLastUpdated] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Map currency codes to symbols where possible for premium look
  const currencySymbols = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', 
    AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥', HKD: 'HK$', 
    NZD: 'NZ$', SGD: 'S$', KRW: '₩', MXN: '$', BRL: 'R$', 
    RUB: '₽', ZAR: 'R', TRY: '₺', AED: 'د.إ', SAR: 'ر.س'
  };

  const getSymbol = (code) => currencySymbols[code] || '';

  const fetchRates = async (showRefreshAnim = false) => {
    if (showRefreshAnim) setIsRefreshing(true);
    setError('');
    try {
      // Fetch latest USD rates - since USD is our anchor, we can calculate any pair:
      // (amount / rates[FROM]) * rates[TO]
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data.result === 'success') {
        setRates(data.rates);
        const sortedCurrencies = Object.keys(data.rates).sort();
        setCurrencies(sortedCurrencies);
        
        // Format last updated time
        if (data.time_last_update_utc) {
          const date = new Date(data.time_last_update_utc);
          setLastUpdated(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        } else {
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      console.error('Error fetching currency rates:', err);
      setError('Could not fetch latest rates. Please check your network connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Update converted amount whenever input parameters or rates change
  useEffect(() => {
    if (rates[fromCurrency] && rates[toCurrency] && amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum)) {
        setConvertedAmount('0.00');
        return;
      }
      
      // Calculate conversion: base is USD
      // rateFrom is USD per FROM
      // rateTo is USD per TO
      // For instance, if from = EUR (rate = 0.92) and to = INR (rate = 83)
      // 1 EUR = 1 / 0.92 USD = 1.087 USD
      // 1.087 USD = 1.087 * 83 INR = 90.22 INR
      const inUSD = amountNum / rates[fromCurrency];
      const result = inUSD * rates[toCurrency];
      
      setConvertedAmount(result.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 4 
      }));
    } else {
      setConvertedAmount('0.00');
    }
  }, [amount, fromCurrency, toCurrency, rates]);

  // Handle value swaps
  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  return (
    <div className="dashboard-panel currency-converter-panel" style={{ marginTop: '24px', animation: 'fadeIn 0.4s ease' }}>
      <div className="converter-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={20} className="glow-icon" style={{ color: 'var(--primary)' }} />
          <h2 className="panel-title" style={{ margin: 0 }}>Global Currency Exchange</h2>
        </div>
        <div className="converter-meta">
          {lastUpdated && !error && (
            <span className="rate-time-indicator">
              Rates updated: <strong>{lastUpdated}</strong>
            </span>
          )}
          <button 
            className={`refresh-rates-btn ${isRefreshing ? 'spinning' : ''}`} 
            onClick={() => fetchRates(true)}
            disabled={isRefreshing || isLoading}
            title="Refresh latest exchange rates"
          >
            <RefreshCw size={13} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <p className="converter-subtitle">
        Real-time financial calculator supporting ~160 global currencies with live bank-grade exchange rates.
      </p>

      {error ? (
        <div className="converter-error-box">
          <p>{error}</p>
          <button onClick={() => fetchRates()} className="retry-btn">
            Retry Connection
          </button>
        </div>
      ) : isLoading ? (
        <div className="converter-loading-box">
          <RefreshCw size={24} className="spinning" style={{ color: 'var(--primary)' }} />
          <p>Connecting to secure exchange server and loading current rates...</p>
        </div>
      ) : (
        <div className="converter-grid-layout">
          {/* Amount input panel */}
          <div className="converter-card">
            <span className="converter-field-label">Enter Amount</span>
            <div className="converter-input-wrapper">
              <span className="currency-symbol-tag">{getSymbol(fromCurrency)}</span>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="converter-field-input"
                placeholder="0.00"
                min="0"
              />
              <select 
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="currency-select-box"
              >
                {currencies.map(code => (
                  <option key={`from-${code}`} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap icon container */}
          <div className="converter-swap-container">
            <button className="swap-action-button" onClick={handleSwap} title="Swap currencies">
              <ArrowLeftRight size={18} />
            </button>
          </div>

          {/* Result converted display card */}
          <div className="converter-card highlight">
            <span className="converter-field-label">Converted Amount</span>
            <div className="converter-input-wrapper">
              <span className="currency-symbol-tag">{getSymbol(toCurrency)}</span>
              <input 
                type="text"
                value={convertedAmount}
                readOnly
                className="converter-field-input readonly"
                placeholder="0.00"
              />
              <select 
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="currency-select-box"
              >
                {currencies.map(code => (
                  <option key={`to-${code}`} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Visual Live Conversion summary quote */}
      {!isLoading && !error && rates[fromCurrency] && rates[toCurrency] && (
        <div className="conversion-display-formula">
          <TrendingUp size={14} style={{ color: '#10b981', marginRight: '6px' }} />
          <span>
            Live rate: <strong>1 {fromCurrency}</strong> = <strong>{((1 / rates[fromCurrency]) * rates[toCurrency]).toFixed(4)} {toCurrency}</strong>
          </span>
          <span className="exchange-disclaimer">
            • Data source: Open Exchange Server (Daily updates)
          </span>
        </div>
      )}
    </div>
  );
}
