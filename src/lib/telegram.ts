const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendOTP(telegramId: string) {
  try {
    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Send message via Telegram bot
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: `Your OTP is: ${otp}\n\nPlease enter this code in the login page to continue.`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send OTP');
    }

    return otp;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
}

export async function sendBinInfo(telegramId: string, binInfo: {
  bin: string;
  scheme: string;
  type: string;
  brand: string;
  country: string;
  bank: string;
}) {
  try {
    const message = `🔍 BIN Lookup Result\n\n` +
      `BIN: ${binInfo.bin}\n` +
      `Scheme: ${binInfo.scheme}\n` +
      `Type: ${binInfo.type}\n` +
      `Brand: ${binInfo.brand}\n` +
      `Country: ${binInfo.country}\n` +
      `Bank: ${binInfo.bank}`;

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send BIN information');
    }

    return true;
  } catch (error) {
    console.error('Error sending BIN information:', error);
    throw error;
  }
}