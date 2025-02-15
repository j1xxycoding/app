import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CreditCard, ArrowLeft, Loader2, CheckCircle2, XCircle, Code, AlertTriangle, CreditCard as BinIcon, ChevronUp, ChevronDown, Coins, CreditCard as StripeIcon, GoalIcon as PaypalIcon } from 'lucide-react';

interface CheckResponse {
  success: boolean;
  message: string;
  details?: string | null;
  rawResponse?: string;
}

interface BinStats {
  bin: string;
  count: number;
  details: string;
  lastChecked: string;
}

type Gateway = 'stripe' | 'paypal';

function Checker() {
  const navigate = useNavigate();
  const { user, updateTokens } = useAuth();
  const [cards, setCards] = useState('');
  const [results, setResults] = useState<Array<{ card: string; result: CheckResponse }>>([]);
  const [checking, setChecking] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showBinStats, setShowBinStats] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<Gateway>('stripe');
  const [proxyToken, setProxyToken] = useState('');

  // Calculate BIN statistics from approved cards
  const binStats = useMemo(() => {
    const stats = new Map<string, BinStats>();
    
    results
      .filter(result => result.result.success)
      .forEach(({ card, result }) => {
        const bin = card.split('|')[0].substring(0, 6);
        const existing = stats.get(bin);
        
        if (existing) {
          stats.set(bin, {
            ...existing,
            count: existing.count + 1,
            lastChecked: new Date().toISOString()
          });
        } else {
          stats.set(bin, {
            bin,
            count: 1,
            details: result.details || 'No details available',
            lastChecked: new Date().toISOString()
          });
        }
      });

    return Array.from(stats.values())
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const handleCheck = async () => {
    if (!user) return;
    
    const cardList = cards.split('\n').filter(card => card.trim());
    
    // Check if user has enough tokens for at least one check
    if (user.tokens < 5) {
      setResults([{
        card: 'Insufficient Tokens',
        result: {
          success: false,
          message: 'You need at least 5 tokens to check cards',
          details: `Current balance: ${user.tokens} tokens`
        }
      }]);
      return;
    }

    // Calculate how many cards we can check with current tokens
    const maxCardsToCheck = Math.floor(user.tokens / 5);
    const cardsToProcess = cardList.slice(0, maxCardsToCheck);
    
    if (cardsToProcess.length < cardList.length) {
      setResults([{
        card: 'Token Limit',
        result: {
          success: false,
          message: `Can only check ${maxCardsToCheck} cards with current token balance`,
          details: `Current balance: ${user.tokens} tokens (5 tokens per approved card)`
        }
      }]);
    }
    
    setChecking(true);
    setProgress({ current: 0, total: cardsToProcess.length });
    const newResults: Array<{ card: string; result: CheckResponse }> = [];
    let remainingTokens = user.tokens;
    
    // Process cards in batches of 3
    const batchSize = 3;
    for (let i = 0; i < cardsToProcess.length; i += batchSize) {
      // Check if we still have enough tokens
      if (remainingTokens < 5) {
        break;
      }

      const batch = cardsToProcess.slice(i, i + batchSize);
      const batchPromises = batch.map(async (card) => {
        try {
          const [cc, month, year, cvv] = card.split('|');
          if (!cc || !month || !year || !cvv) {
            throw new Error('Invalid card format');
          }

          const response = await fetch('/api/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              card,
              telegramId: user.id,
              gateway: selectedGateway,
              proxyToken: proxyToken || undefined
            })
          });
          
          if (!response.ok) {
            throw new Error('Check failed');
          }

          const result = await response.json();
          
          // If check was successful, save to localStorage and deduct tokens
          if (result.success) {
            // Check if we have enough tokens
            if (remainingTokens >= 5) {
              // Save to localStorage
              const existingChecks = JSON.parse(localStorage.getItem(`checks_${user.id}`) || '[]');
              existingChecks.push({
                timestamp: new Date().toISOString(),
                card,
                success: true,
                details: result.details,
                gateway: selectedGateway
              });
              localStorage.setItem(`checks_${user.id}`, JSON.stringify(existingChecks));

              // Deduct 5 tokens and update remaining tokens
              remainingTokens -= 5;
              updateTokens(remainingTokens);
            } else {
              // Not enough tokens for this approved card
              return {
                card,
                result: {
                  success: false,
                  message: 'Insufficient tokens',
                  details: 'Not enough tokens to process approved card'
                }
              };
            }
          }
          
          return { card, result };
        } catch (error) {
          return {
            card,
            result: {
              success: false,
              message: error instanceof Error ? error.message : 'Check failed'
            }
          };
        }
      });

      // Process batch
      const batchResults = await Promise.all(batchPromises);
      newResults.push(...batchResults);
      setResults([...newResults]);
      setProgress(prev => ({ ...prev, current: i + batch.length }));

      // Add delay between batches
      if (i + batchSize < cardsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Clear the cards input after checking is complete
    setCards('');
    setChecking(false);
  };

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  // Separate approved and declined cards
  const approvedCards = results.filter(result => result.result.success);
  const declinedCards = results.filter(result => !result.result.success);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Header */}
      <header className="bg-gray-900/90 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h2 className="text-white font-medium">Card Checker</h2>
                <p className="text-gray-400 text-sm">Check your cards</p>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">{user?.tokens} Tokens</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 grid-cols-1">
          {/* BIN Stats Section */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowBinStats(!showBinStats)}
            >
              <div className="flex items-center space-x-3">
                <BinIcon className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Top Approved BINs</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                {showBinStats ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {showBinStats && (
              <div className="mt-6 space-y-4">
                {binStats.length > 0 ? (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {binStats.map((stat) => (
                      <div
                        key={stat.bin}
                        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-yellow-400 font-mono text-lg">{stat.bin}</code>
                          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                            {stat.count} hits
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{stat.details}</p>
                        <p className="text-xs text-gray-500">
                          Last checked: {new Date(stat.lastChecked).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-4">
                    No approved cards yet. Start checking to see BIN statistics.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Check Cards</h2>
            </div>
            <div className="space-y-4">
              {/* Gateway Selection */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => setSelectedGateway('stripe')}
                  className={`flex items-center justify-center space-x-2 ${
                    selectedGateway === 'stripe'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <StripeIcon className="w-4 h-4" />
                  <span>Stripe</span>
                </Button>
                <Button
                  onClick={() => setSelectedGateway('paypal')}
                  className={`flex items-center justify-center space-x-2 ${
                    selectedGateway === 'paypal'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <PaypalIcon className="w-4 h-4" />
                  <span>PayPal</span>
                </Button>
              </div>

              {/* Proxy Token Input */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Webshare Proxy Token (Optional)
                </label>
                <Input
                  type="text"
                  value={proxyToken}
                  onChange={(e) => setProxyToken(e.target.value)}
                  placeholder="Enter your Webshare proxy token"
                  className="text-white bg-gray-800/50 border-gray-700/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Enter Cards (Format: CC|MM|YY|CVV)
                </label>
                <textarea
                  value={cards}
                  onChange={(e) => setCards(e.target.value)}
                  placeholder="4242424242424242|01|25|123"
                  className="w-full h-48 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={checking || (user?.tokens || 0) < 5}
                />
              </div>
              {checking && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-blue-400">{progressPercentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-sm">
                    Checking {progress.current} of {progress.total} cards
                  </p>
                </div>
              )}
              <Button
                onClick={handleCheck}
                className="w-full bg-blue-500 hover:bg-blue-600"
                disabled={checking || !cards.trim() || (user?.tokens || 0) < 5}
              >
                {checking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Cards...
                  </>
                ) : (
                  <>
                    Check Cards
                    <span className="text-xs ml-2">(5 tokens per approved card)</span>
                  </>
                )}
              </Button>
              {(user?.tokens || 0) < 5 && (
                <div className="flex items-start space-x-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Insufficient tokens. You need at least 5 tokens to check cards.
                    Current balance: {user?.tokens} tokens
                  </p>
                </div>
              )}
              {cards.split('\n').filter(c => c.trim()).length > Math.floor((user?.tokens || 0) / 5) && (
                <div className="flex items-start space-x-2 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Not enough tokens to check all cards. Only the first {Math.floor((user?.tokens || 0) / 5)} cards will be checked.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Approved Cards */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h2 className="text-xl font-semibold text-white">Approved ({approvedCards.length})</h2>
                </div>
                {approvedCards.length > 0 && (
                  <Button
                    onClick={() => setShowRaw(!showRaw)}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 hover:bg-gray-800 text-gray-300"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    {showRaw ? 'Hide Raw' : 'Show Raw'}
                  </Button>
                )}
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {approvedCards.map((result, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border bg-green-500/10 border-green-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 w-full">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <code className="text-white">{result.card}</code>
                        </div>
                        <p className="text-sm text-green-400">
                          {result.result.message}
                          {result.result.details && (
                            <span className="text-gray-400"> - {result.result.details}</span>
                          )}
                        </p>
                        {showRaw && result.result.rawResponse && (
                          <div className="mt-2 p-2 bg-black/50 rounded-lg">
                            <pre className="text-xs text-gray-400 overflow-x-auto">
                              {result.result.rawResponse}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {approvedCards.length === 0 && (
                  <p className="text-gray-400 text-center py-8">
                    No approved cards yet.
                  </p>
                )}
              </div>
            </div>

            {/* Declined Cards */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <h2 className="text-xl font-semibold text-white">Declined ({declinedCards.length})</h2>
                </div>
                {declinedCards.length > 0 && (
                  <Button
                    onClick={() => setShowRaw(!showRaw)}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 hover:bg-gray-800 text-gray-300"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    {showRaw ? 'Hide Raw' : 'Show Raw'}
                  </Button>
                )}
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {declinedCards.map((result, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border bg-red-500/10 border-red-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 w-full">
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <code className="text-white">{result.card}</code>
                        </div>
                        <p className="text-sm text-red-400">
                          {result.result.message}
                          {result.result.details && (
                            <span className="text-gray-400"> - {result.result.details}</span>
                          )}
                        </p>
                        {showRaw && result.result.rawResponse && (
                          <div className="mt-2 p-2 bg-black/50 rounded-lg">
                            <pre className="text-xs text-gray-400 overflow-x-auto">
                              {result.result.rawResponse}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {declinedCards.length === 0 && (
                  <p className="text-gray-400 text-center py-8">
                    No declined cards yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Checker;