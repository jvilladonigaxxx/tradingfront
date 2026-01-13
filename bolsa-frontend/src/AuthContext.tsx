import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { poolData } from './cognitoConfig';

// Create User Pool
const userPool = new CognitoUserPool(poolData);

// Define types
interface AuthContextType {
  user: CognitoUser | null;
  session: CognitoUserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getAuthToken: () => Promise<string | null>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [session, setSession] = useState<CognitoUserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = () => {
    const currentUser = userPool.getCurrentUser();

    if (currentUser) {
      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          console.error('Error getting session:', err);
          setIsLoading(false);
          return;
        }

        if (session && session.isValid()) {
          setUser(currentUser);
          setSession(session);
          setIsAuthenticated(true);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          console.log('Login successful:', session);
          setUser(cognitoUser);
          setSession(session);
          setIsAuthenticated(true);
          resolve();
        },
        onFailure: (err: Error) => {
          console.error('Login failed:', err);
          reject(err);
        },
        newPasswordRequired: (userAttributes: any) => {
          // This is called when admin creates a user and they need to set a new password
          console.log('New password required:', userAttributes);
          reject(new Error('New password required. Please contact administrator.'));
        },
      });
    });
  };

  const logout = () => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
  };

  const getAuthToken = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const currentUser = userPool.getCurrentUser();

      if (!currentUser) {
        resolve(null);
        return;
      }

      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          console.error('Error getting session:', err);
          resolve(null);
          return;
        }

        if (session.isValid()) {
          const token = session.getIdToken().getJwtToken();
          resolve(token);
        } else {
          resolve(null);
        }
      });
    });
  };

  const value = {
    user,
    session,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

