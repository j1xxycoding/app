import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  profilePic?: string;
  username?: string;
  tokens: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  alerts?: Alert[];
}

interface Alert {
  id: string;
  message: string;
  read: boolean;
  timestamp: number;
  type: 'alert' | 'token';
}

interface AuthContextType {
  user: User | null;
  login: (userData: Omit<User, 'tokens'>) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  updateTokens: (newAmount: number) => void;
  markAlertAsRead: (alertId: string) => void;
  getAllUsers: () => User[];
  banUser: (userId: string) => void;
  unbanUser: (userId: string) => void;
  sendTokens: (userId: string, amount: number) => void;
  sendAlert: (userId: string, message: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const getAllUsers = () => {
    const users: User[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('user_')) {
        const userData = localStorage.getItem(key);
        if (userData) {
          users.push(JSON.parse(userData));
        }
      }
    }
    return users;
  };

  const login = async (userData: Omit<User, 'tokens'>) => {
    // Check if user exists
    const existingUserData = localStorage.getItem(`user_${userData.id}`);
    let userToSet: User;

    if (existingUserData) {
      const existingUser = JSON.parse(existingUserData);
      if (existingUser.isBanned) {
        throw new Error('Your account has been banned.');
      }
      userToSet = existingUser;
    } else {
      // New user
      userToSet = {
        ...userData,
        tokens: 50,
        isAdmin: userData.id === '1066887572', // Admin ID check
        isBanned: false,
        alerts: []
      };
      localStorage.setItem(`user_${userData.id}`, JSON.stringify(userToSet));
    }

    setUser(userToSet);
  };

  const logout = () => {
    if (user) {
      localStorage.setItem(`user_${user.id}`, JSON.stringify(user));
    }
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem(`user_${prev.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateTokens = (newAmount: number) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, tokens: newAmount };
      localStorage.setItem(`user_${prev.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const banUser = (userId: string) => {
    const userData = localStorage.getItem(`user_${userId}`);
    if (userData) {
      const user = JSON.parse(userData);
      user.isBanned = true;
      localStorage.setItem(`user_${userId}`, JSON.stringify(user));
    }
  };

  const unbanUser = (userId: string) => {
    const userData = localStorage.getItem(`user_${userId}`);
    if (userData) {
      const user = JSON.parse(userData);
      user.isBanned = false;
      localStorage.setItem(`user_${userId}`, JSON.stringify(user));
    }
  };

  const sendTokens = (userId: string, amount: number) => {
    const userData = localStorage.getItem(`user_${userId}`);
    if (userData) {
      const user = JSON.parse(userData);
      user.tokens += amount;
      // Add a token alert
      const alert = {
        id: Math.random().toString(36).substr(2, 9),
        message: `You have received ${amount} tokens!`,
        read: false,
        timestamp: Date.now(),
        type: 'token'
      };
      user.alerts = [...(user.alerts || []), alert];
      localStorage.setItem(`user_${userId}`, JSON.stringify(user));
    }
  };

  const sendAlert = (userId: string, message: string) => {
    const userData = localStorage.getItem(`user_${userId}`);
    if (userData) {
      const user = JSON.parse(userData);
      const alert = {
        id: Math.random().toString(36).substr(2, 9),
        message,
        read: false,
        timestamp: Date.now(),
        type: 'alert'
      };
      user.alerts = [...(user.alerts || []), alert];
      localStorage.setItem(`user_${userId}`, JSON.stringify(user));
    }
  };

  const markAlertAsRead = (alertId: string) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        alerts: prev.alerts?.map(alert =>
          alert.id === alertId ? { ...alert, read: true } : alert
        )
      };
      localStorage.setItem(`user_${prev.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      updateProfile,
      updateTokens,
      markAlertAsRead,
      getAllUsers,
      banUser,
      unbanUser,
      sendTokens,
      sendAlert
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}