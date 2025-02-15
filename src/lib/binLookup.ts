export interface BinData {
  scheme: string;
  type: string;
  brand: string;
  country: string;
  bank: string;
}

export async function lookupBin(bin: string): Promise<BinData> {
  // Take first 6 digits only
  const binPrefix = bin.slice(0, 6);
  
  try {
    // Using a CORS proxy to avoid CORS issues
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://lookup.binlist.net/${binPrefix}`)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few minutes.');
      }
      if (response.status === 404) {
        throw new Error('BIN not found. Please check the number and try again.');
      }
      throw new Error('Failed to lookup BIN. Please try again.');
    }

    const data = await response.json();
    
    if (!data || (!data.scheme && !data.type && !data.brand && !data.country)) {
      throw new Error('Invalid BIN or no data available.');
    }

    return {
      scheme: data.scheme || 'Unknown',
      type: data.type || 'Unknown',
      brand: data.brand || data.scheme || 'Unknown',
      country: data.country?.name || 'Unknown',
      bank: data.bank?.name || 'Unknown'
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to lookup BIN. Please try again.');
  }
}