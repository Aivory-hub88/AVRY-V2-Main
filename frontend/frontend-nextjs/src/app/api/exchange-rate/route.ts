import { NextResponse } from 'next/server';

export const revalidate = 7200; // Cache for 2 hours

export async function GET() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 7200 },
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch exchange rates: ${res.status}`);
    }

    const data = await res.json();
    const idrRate = data.rates?.IDR || 16000; // Fallback to 16000 if not found

    return NextResponse.json({ idrRate });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    return NextResponse.json({ idrRate: 16000 }, { status: 500 }); // Graceful fallback
  }
}
