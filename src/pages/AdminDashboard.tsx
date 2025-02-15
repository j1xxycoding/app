import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  LogOut,
  Users,
  Ban,
  Coins,
  Bell,
  Search,
  UserCheck,
  UserX,
  Send,
  AlertTriangle,
  Loader2,
  CreditCard,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface BinStat {
  bin: string;
  users: {
    id: string;
    username: string;
    profilePic: string;
    lastUsed: string;
    successCount: number;
  }[];
  totalSuccess: number;
  details: string;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, getAllUsers, banUser, unbanUser, sendTokens, sendAlert } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [userList, setUserList] = useState(getAllUsers());
  const [showBinStats, setShowBinStats] = useState(true);
  const [loading, setLoading] = useState({
    ban: false,
    unban: false,
    tokens: false,
    alert: false,
  });

  // Get BIN statistics from localStorage
  const binStats = useMemo(() => {
    const stats = new Map<string, BinStat>();
    
    // Get all users and their check results
    getAllUsers().forEach(user => {
      const userChecks = localStorage.getItem(`checks_${user.id}`);
      if (!userChecks) return;

      try {
        const checks = JSON.parse(userChecks);
        checks.forEach((check: any) => {
          if (!check.success) return;
          
          const bin = check.card.split('|')[0].substring(0, 6);
          const existing = stats.get(bin);
          
          if (existing) {
            // Update existing BIN stat
            const userIndex = existing.users.findIndex(u => u.id === user.id);
            if (userIndex >= 0) {
              existing.users[userIndex].successCount++;
              existing.users[userIndex].lastUsed = new Date().toISOString();
            } else {
              existing.users.push({
                id: user.id,
                username: user.username || 'Unknown User',
                profilePic: user.profilePic || '',
                lastUsed: new Date().toISOString(),
                successCount: 1
              });
            }
            existing.totalSuccess++;
            stats.set(bin, existing);
          } else {
            // Create new BIN stat
            stats.set(bin, {
              bin,
              users: [{
                id: user.id,
                username: user.username || 'Unknown User',
                profilePic: user.profilePic || '',
                lastUsed: new Date().toISOString(),
                successCount: 1
              }],
              totalSuccess: 1,
              details: check.details || 'No details available'
            });
          }
        });
      } catch (error) {
        console.error(`Error processing checks for user ${user.id}:`, error);
      }
    });

    // Convert to array and sort by total success count
    return Array.from(stats.values())
      .sort((a, b) => b.totalSuccess - a.totalSuccess);
  }, [getAllUsers]);

  // Redirect if not admin
  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Refresh user list periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setUserList(getAllUsers());
    }, 1000);
    return () => clearInterval(interval);
  }, [getAllUsers]);

  const filteredUsers = userList.filter(u => 
    u.id !== user?.id && // Don't show admin in the list
    (searchTerm === '' || 
     u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.id.includes(searchTerm))
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBanUser = async (userId: string) => {
    setLoading(prev => ({ ...prev, ban: true }));
    try {
      await banUser(userId);
      setUserList(getAllUsers());
    } finally {
      setLoading(prev => ({ ...prev, ban: false }));
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setLoading(prev => ({ ...prev, unban: true }));
    try {
      await unbanUser(userId);
      setUserList(getAllUsers());
    } finally {
      setLoading(prev => ({ ...prev, unban: false }));
    }
  };

  const handleSendTokens = async () => {
    if (selectedUser && tokenAmount) {
      setLoading(prev => ({ ...prev, tokens: true }));
      try {
        await sendTokens(selectedUser, parseInt(tokenAmount));
        setTokenAmount('');
        setSelectedUser(null);
        setUserList(getAllUsers());
      } finally {
        setLoading(prev => ({ ...prev, tokens: false }));
      }
    }
  };

  const handleSendAlert = async () => {
    if (selectedUser && alertMessage) {
      setLoading(prev => ({ ...prev, alert: true }));
      try {
        await sendAlert(selectedUser, alertMessage);
        setAlertMessage('');
        setSelectedUser(null);
        setUserList(getAllUsers());
      } finally {
        setLoading(prev => ({ ...prev, alert: false }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Header */}
      <header className="bg-gray-900/90 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={user?.profilePic}
                  alt="Admin Profile"
                  className="w-12 h-12 rounded-full border-2 border-red-500/50"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 border-2 border-gray-900 rounded-full"></div>
              </div>
              <div>
                <h2 className="text-white font-medium">Administrator</h2>
                <p className="text-gray-400 text-sm">ID: {user?.id}</p>
              </div>
            </div>
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 grid-cols-1">
          {/* BIN Statistics Section */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowBinStats(!showBinStats)}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">BIN Statistics</h2>
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
                  <div className="grid gap-4 grid-cols-1">
                    {binStats.map((stat) => (
                      <div
                        key={stat.bin}
                        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <code className="text-yellow-400 font-mono text-lg">{stat.bin}</code>
                              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                                {stat.totalSuccess} hits
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{stat.details}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-gray-300">Users</h3>
                          <div className="grid gap-2">
                            {stat.users.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2"
                              >
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={user.profilePic}
                                    alt={user.username}
                                    className="w-8 h-8 rounded-full"
                                  />
                                  <div>
                                    <p className="text-white text-sm">{user.username}</p>
                                    <p className="text-gray-500 text-xs">ID: {user.id}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-green-400 text-sm">{user.successCount} hits</p>
                                  <p className="text-gray-500 text-xs">
                                    Last: {new Date(user.lastUsed).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-4">
                    No BIN statistics available yet.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
            {/* User List */}
            <div className="lg:col-span-2 bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">User Management</h2>
              </div>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-white bg-gray-800/50 border-gray-700/50"
                />
              </div>

              {/* User List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className={`p-4 rounded-xl border ${
                      selectedUser === u.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-gray-800/50 border-gray-700/50'
                    } cursor-pointer transition-colors`}
                    onClick={() => setSelectedUser(u.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={u.profilePic}
                          alt={u.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h3 className="text-white font-medium">{u.username}</h3>
                          <p className="text-sm text-gray-400">ID: {u.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400 text-sm">{u.tokens} tokens</span>
                        {u.isBanned ? (
                          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">
                            Banned
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ban/Unban */}
              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Ban className="w-5 h-5 text-red-400" />
                  <h2 className="text-xl font-semibold text-white">Account Status</h2>
                </div>
                {selectedUser ? (
                  <div className="space-y-4">
                    {filteredUsers.find(u => u.id === selectedUser)?.isBanned ? (
                      <Button
                        onClick={() => handleUnbanUser(selectedUser)}
                        className="w-full bg-green-500 hover:bg-green-600"
                        disabled={loading.unban}
                      >
                        {loading.unban ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Unbanning User...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Unban User
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBanUser(selectedUser)}
                        className="w-full bg-red-500 hover:bg-red-600"
                        disabled={loading.ban}
                      >
                        {loading.ban ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Banning User...
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4 mr-2" />
                            Ban User
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Select a user to manage their account status</p>
                )}
              </div>

              {/* Send Tokens */}
              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-semibold text-white">Send Tokens</h2>
                </div>
                {selectedUser ? (
                  <div className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      className="text-white bg-gray-800/50 border-gray-700/50"
                      disabled={loading.tokens}
                    />
                    <Button
                      onClick={handleSendTokens}
                      className="w-full bg-yellow-500 hover:bg-yellow-600"
                      disabled={!tokenAmount || loading.tokens}
                    >
                      {loading.tokens ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending Tokens...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Tokens
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Select a user to send tokens</p>
                )}
              </div>

              {/* Send Alert */}
              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Send Alert</h2>
                </div>
                {selectedUser ? (
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Enter alert message"
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      className="text-white bg-gray-800/50 border-gray-700/50"
                      disabled={loading.alert}
                    />
                    <Button
                      onClick={handleSendAlert}
                      className="w-full bg-purple-500 hover:bg-purple-600"
                      disabled={!alertMessage || loading.alert}
                    >
                      {loading.alert ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending Alert...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Send Alert
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Select a user to send an alert</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;