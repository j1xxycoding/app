import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Send, Lock, Loader2, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import { sendOTP } from '../lib/telegram';
import { useAuth } from '../context/AuthContext';

type Status = {
  type: 'success' | 'error' | null;
  message: string | null;
};

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'telegram' | 'otp'>('telegram');
  const [telegramId, setTelegramId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [expectedOtp, setExpectedOtp] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: null, message: null });

  const handleTelegramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: null });
    setLoading(true);
    try {
      const generatedOtp = await sendOTP(telegramId);
      setExpectedOtp(generatedOtp);
      setStep('otp');
      setStatus({ type: 'success', message: 'OTP sent successfully! Check your Telegram.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to send OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (otp === expectedOtp) {
        setStatus({ type: 'success', message: 'Login successful! Redirecting...' });
        // Get user profile from Telegram API (in a real app)
        // For demo, we'll use placeholder data
        await login({
          id: telegramId,
          profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${telegramId}`,
          username: `User${telegramId.slice(-4)}`,
        });
        setTimeout(() => {
          // Redirect admin to admin dashboard, others to regular dashboard
          if (telegramId === '1066887572') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 1000);
      } else {
        setStatus({ type: 'error', message: 'Invalid OTP. Please try again.' });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Login failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('telegram');
    setStatus({ type: null, message: null });
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="relative backdrop-blur-sm bg-gray-900/90 rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-800">
          <div className="absolute inset-0 bg-blue-500/5 rounded-2xl" />
          <div className="relative">
            <div className="text-center space-y-3">
              <div className="bg-gray-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Secure Login</h1>
              <p className="text-gray-400 text-sm">
                {step === 'telegram' 
                  ? 'Enter your Telegram ID to receive an OTP'
                  : 'Enter the OTP sent to your Telegram account'}
              </p>
            </div>

            {status.message && (
              <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
                status.type === 'success' 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm">{status.message}</span>
              </div>
            )}

            {step === 'telegram' ? (
              <form onSubmit={handleTelegramSubmit} className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 text-sm text-gray-300 space-y-3 border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">How to get your Telegram ID:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 pl-1">
                      <li>Open Telegram and search for "@userinfobot"</li>
                      <li>Start a chat with the bot</li>
                      <li>It will reply with your Telegram ID</li>
                    </ol>
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter your Telegram ID"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    required
                    className="text-white bg-gray-800/50 border-gray-700/50 focus:border-blue-500/50 focus:ring-blue-500/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send OTP
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="mt-6 space-y-6">
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="text-white text-center text-2xl tracking-widest bg-gray-800/50 border-gray-700/50 focus:border-blue-500/50 focus:ring-blue-500/20"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-700 hover:bg-gray-800 text-gray-300"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    Back to Telegram ID
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;