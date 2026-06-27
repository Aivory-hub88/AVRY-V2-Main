import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

interface ExchangeRateSource {
  url: string;
  parse: (data: any) => number | undefined;
  parseTime: (data: any) => number | undefined;
}

async function fetchWithFallbacks() {
  const sources: ExchangeRateSource[] = [
    {
      // FxRatesAPI provides hourly updates for free
      url: 'https://api.fxratesapi.com/latest',
      parse: (data) => data.rates?.IDR,
      parseTime: (data) => data.timestamp,
    },
    {
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      parse: (data) => data.rates?.IDR,
      parseTime: (data) => data.time_last_updated,
    },
    {
      url: 'https://open.er-api.com/v6/latest/USD',
      parse: (data) => data.rates?.IDR,
      parseTime: (data) => data.time_last_update_unix,
    }
  ];

  const nowUnix = Math.floor(Date.now() / 1000);
  const MAX_AGE_SECONDS = 4 * 60 * 60; // Strict 4 Hours validation

  for (const source of sources) {
    try {
      const res = await fetch(source.url, { 
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000) 
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      const rate = source.parse(data);
      const lastUpdated = source.parseTime(data);
      
      if (typeof rate === 'number' && rate > 0) {
        if (lastUpdated) {
          const age = nowUnix - lastUpdated;
          if (age > MAX_AGE_SECONDS) {
            console.warn(`[ExchangeRate] Source ${source.url} returned stale data. Skipping.`);
            continue;
          }
        }
        
        return {
          rate,
          lastUpdatedUnix: lastUpdated || nowUnix,
          source: source.url
        };
      }
    } catch (e) {
      console.warn(`[ExchangeRate] Failed to fetch from ${source.url}`, e);
      continue;
    }
  }
  
  throw new Error('All currency exchange API sources failed or returned stale data (older than 4 hours)');
}

export async function GET() {
  try {
    const result = await fetchWithFallbacks();
    
    // Return the RAW rate here. The 5% margin is applied by the frontend LanguageContext.
    return NextResponse.json({ 
      idrRate: result.rate,
      metadata: {
        source: result.source,
        lastUpdatedUnix: result.lastUpdatedUnix,
        systemCheckedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Exchange rate fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exchange rate' }, 
      { status: 500 }
    );
  }
}
