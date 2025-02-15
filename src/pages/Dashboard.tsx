import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LogOut, User, X, Check, Pencil, Coins, CreditCard, AlertCircle, Send, Bell, Ban } from 'lucide-react';
import { lookupBin, type BinData } from '../lib/binLookup';
import { sendBinInfo } from '../lib/telegram';
import { AlertDialog } from '../components/AlertDialog';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, markAlertAsRead } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bin, setBin] = useState('');
  const [binData, setBinData] = useState<BinData | null>(null);
  const [binError, setBinError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<{ id: string; message: string; type: 'alert' | 'token' } | null>(null);

  // Get BIN statistics from localStorage
  const binStats = useMemo(() => {
    if (!user) return [];
    
    const userChecks = localStorage.getItem(`checks_${user.id}`);
    if (!userChecks) return [];

    try {
      const checks = JSON.parse(userChecks);
      const stats = new Map<string, {
        bin: string;
        count: number;
        details: string;
        lastChecked: string;
      }>();

      checks.forEach((check: any) => {
        if (!check.success) return;
        
        const bin = check.card.split('|')[0].substring(0, 6);
        const existing = stats.get(bin);
        
        if (existing) {
          stats.set(bin, {
            ...existing,
            count: existing.count + 1,
            lastChecked: check.timestamp
          });
        } else {
          stats.set(bin, {
            bin,
            count: 1,
            details: check.details || 'No details available',
            lastChecked: check.timestamp
          });
        }
      });

      // Convert to array and sort by count
      return Array.from(stats.values())
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error processing BIN stats:', error);
      return [];
    }
  }, [user]);

  useEffect(() => {
    // Check for unread alerts
    const unreadAlerts = user?.alerts?.filter(alert => !alert.read) || [];
    if (unreadAlerts.length > 0) {
      // Prioritize token alerts over regular alerts
      const tokenAlert = unreadAlerts.find(alert => alert.type === 'token');
      const alertToShow = tokenAlert || unreadAlerts[0];
      setCurrentAlert(alertToShow);
      setShowAlert(true);
    }
  }, [user?.alerts]);

  const handleAlertClose = () => {
    if (currentAlert?.id) {
      markAlertAsRead(currentAlert.id);
      
      // Check if there are more unread alerts
      const remainingAlerts = user?.alerts?.filter(alert => !alert.read && alert.id !== currentAlert.id) || [];
      if (remainingAlerts.length > 0) {
        // Show the next alert
        const nextTokenAlert = remainingAlerts.find(alert => alert.type === 'token');
        const nextAlert = nextTokenAlert || remainingAlerts[0];
        setCurrentAlert(nextAlert);
      } else {
        setShowAlert(false);
        setCurrentAlert(null);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUpdateProfile = () => {
    updateProfile({ username });
    setIsEditing(false);
  };

  const handleBinLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setBinError(null);
    setBinData(null);

    try {
      // Validate BIN format (first 6 digits)
      if (!/^\d{6}/.test(bin)) {
        throw new Error('Please enter at least 6 digits');
      }

      const data = await lookupBin(bin);
      setBinData(data);
    } catch (error) {
      setBinError(error instanceof Error ? error.message : 'Failed to lookup BIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToTelegram = async () => {
    if (!user || !binData) return;

    setIsSending(true);
    try {
      await sendBinInfo(user.id, {
        bin,
        ...binData
      });
      // Show success message
      setBinError('BIN information sent to your Telegram!');
    } catch (error) {
      setBinError('Failed to send BIN information to Telegram');
    } finally {
      setIsSending(false);
    }
  };

  if (user?.isBanned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-900/90 border border-red-500/20 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Ban className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Account Banned</h1>
            <p className="text-gray-400">Your account has been banned. Please contact support for assistance.</p>
            <Button
              onClick={handleLogout}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {showAlert && currentAlert && (
        <AlertDialog
          message={currentAlert.message}
          onClose={handleAlertClose}
          type={currentAlert.type}
        />
      )}
      
      {/* Header */}
      <header className="bg-gray-900/90 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={user?.profilePic}
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-blue-500/50"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
              </div>
              <div>
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="text-white bg-gray-800/50 border-gray-700/50 focus:border-blue-500/50 focus:ring-blue-500/20 h-8 px-2"
                    />
                    <Button
                      onClick={handleUpdateProfile}
                      size="sm"
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      size="sm"
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h2 className="text-white font-medium">{user?.username}</h2>
                    <Button
                      onClick={() => setIsEditing(true)}
                      size="sm"
                      className="bg-gray-800/50 hover:bg-gray-800 text-gray-400"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-gray-400 text-sm">ID: {user?.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user?.alerts && user.alerts.length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-gray-400" />
                  {user.alerts.some(alert => !alert.read) && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </div>
              )}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2 flex items-center space-x-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">{user?.tokens} Tokens</span>
              </div>
              <Button
                onClick={() => navigate('/checker')}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Card Checker
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 text-gray-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Profile Overview */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Profile Overview</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                  <p className="text-white">{user?.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Telegram ID</label>
                  <p className="text-white">{user?.id}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Profile Picture</label>
                <img
                  src={user?.profilePic}
                  alt="Profile"
                  className="w-24 h-24 rounded-lg border border-gray-700"
                />
              </div>
            </div>
          </div>

          {/* BIN Lookup */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">BIN Lookup</h2>
            </div>
            <div className="space-y-6">
              <form onSubmit={handleBinLookup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Enter First 6 Digits
                  </label>
                  <Input
                    type="text"
                    value={bin}
                    onChange={(e) => setBin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter BIN"
                    maxLength={6}
                    className="text-white bg-gray-800/50 border-gray-700/50 focus:border-purple-500/50 focus:ring-purple-500/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                  disabled={isLoading || !bin || bin.length < 6}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Looking up...
                    </span>
                  ) : (
                    'Lookup BIN'
                  )}
                </Button>
              </form>

              {binError && (
                <div className={`bg-${binError.includes('sent to your Telegram') ? 'green' : 'red'}-500/10 border border-${binError.includes('sent to your Telegram') ? 'green' : 'red'}-500/20 rounded-lg p-4 flex items-start space-x-3`}>
                  <AlertCircle className={`w-5 h-5 text-${binError.includes('sent to your Telegram') ? 'green' : 'red'}-400 flex-shrink-0 mt-0.5`} />
                  <p className={`text-sm text-${binError.includes('sent to your Telegram') ? 'green' : 'red'}-400`}>{binError}</p>
                </div>
              )}

              {binData && (
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-gray-700/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Scheme</label>
                      <p className="text-white capitalize">{binData.scheme}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                      <p className="text-white capitalize">{binData.type}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Brand</label>
                      <p className="text-white">{binData.brand}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Country</label>
                      <p className="text-white">{binData.country}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Bank</label>
                      <p className="text-white">{binData.bank}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendToTelegram}
                    className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={isSending}
                  >
                    {isSending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send to Telegram
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Token Information and Top BINs */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Coins className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Token Balance</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Available Tokens</span>
                  <span className="text-2xl font-bold text-yellow-400">{user?.tokens}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((user?.tokens || 0) / 5, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400">
                  You started with 50 free tokens. Each approved card costs 5 tokens.
                </p>
              </div>

              {/* Top Approved BINs */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Your Top BINs</h3>
                {binStats.length > 0 ? (
                  <div className="space-y-3">
                    {binStats.slice(0, 3).map((stat) => (
                      <div
                        key={stat.bin}
                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-yellow-400 font-mono">{stat.bin}</code>
                          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                            {stat.count} hits
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{stat.details}</p>
                        <p className="text-xs text-gray-500">
                          Last: {new Date(stat.lastChecked).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    No approved cards yet. Start checking to see your top BINs.
                  </p>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <h3 className="text-blue-400 font-medium mb-2">Need More Tokens?</h3>
                <p className="text-sm text-gray-400">
                  Additional tokens will be available for purchase soon. Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;