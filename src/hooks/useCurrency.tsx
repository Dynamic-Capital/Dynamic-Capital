import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState(() => {
    // Initialize from URL params, then localStorage, then default
    const urlParams = new URLSearchParams(window.location.search);
    const urlCurrency = urlParams.get('cur');
    if (urlCurrency && ['USD', 'MVR'].includes(urlCurrency)) {
      return urlCurrency;
    }
    
    const stored = localStorage.getItem('preferred_currency');
    return stored && ['USD', 'MVR'].includes(stored) ? stored : 'USD';
  });
  
  const [exchangeRate, setExchangeRate] = useState(() => {
    const cached = localStorage.getItem('usd_mvr_rate');
    const cacheTime = localStorage.getItem('usd_mvr_rate_time');
    
    // Use cached rate if less than 1 hour old
    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000) {
      return parseFloat(cached);
    }
    return 17.5; // Default fallback
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Fetch exchange rate on mount if not cached or expired
  useEffect(() => {
    const cached = localStorage.getItem('usd_mvr_rate');
    const cacheTime = localStorage.getItem('usd_mvr_rate_time');
    
    if (!cached || !cacheTime || (Date.now() - parseInt(cacheTime)) >= 3600000) {
      setIsLoading(true);
      import('@/config/supabase').then(({ callEdgeFunction }) =>
        callEdgeFunction('CONTENT_BATCH', {
          method: 'POST',
          body: { keys: ['usd_mvr_rate'] },
        }).then(res => res.json())
      .then(data => {
        const rateContent = data.contents?.find((c: any) => c.content_key === 'usd_mvr_rate');
        if (rateContent) {
          const rate = parseFloat(rateContent.content_value) || 17.5;
          setExchangeRate(rate);
          localStorage.setItem('usd_mvr_rate', rate.toString());
          localStorage.setItem('usd_mvr_rate_time', Date.now().toString());
        }
      })
      .catch(() => {
        // Keep default rate on error
      })
      .finally(() => setIsLoading(false)));
    }
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);
    
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('cur', newCurrency);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      exchangeRate,
      setExchangeRate,
      isLoading
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}
