import { useState } from 'react';
import { useAuth } from './AuthContext';
import './Login.css';

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password. Please try again.',
  USER_NOT_FOUND: 'User not found. Please check your username.',
  PASSWORD_RESET_REQUIRED: 'Your account requires a password reset. Please contact the administrator.',
  LOGIN_FAILED: 'Login failed. Please try again.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
  RESET_CODE_FAILED: 'Failed to send reset code. Please try again.',
  INVALID_VERIFICATION_CODE: 'Invalid verification code. Please check and try again.',
  PASSWORD_POLICY_VIOLATION: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
  PASSWORD_RESET_FAILED: 'Failed to reset password. Please try again.',
};

const SUCCESS_MESSAGES = {
  RESET_CODE_SENT: 'Password reset code sent to your email!',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully! You can now login with your new password.',
};

const RESET_STEP = {
  EMAIL: 'email' as const,
  CODE: 'code' as const,
};

const AUTO_REDIRECT_DELAY = 2000;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code'>(RESET_STEP.EMAIL);
  const [successMessage, setSuccessMessage] = useState('');
  const { login } = useAuth();

  const handleLoginError = (err: unknown): void => {
    setIsLoading(false);
    if (err instanceof Error) {
      if (err.message.includes('Incorrect username or password')) {
        setError(ERROR_MESSAGES.INVALID_CREDENTIALS);
      } else if (err.message.includes('User does not exist')) {
        setError(ERROR_MESSAGES.USER_NOT_FOUND);
      } else if (err.message.includes('New password required')) {
        setError(ERROR_MESSAGES.PASSWORD_RESET_REQUIRED);
      } else {
        setError(err.message || ERROR_MESSAGES.LOGIN_FAILED);
      }
    } else {
      setError(ERROR_MESSAGES.UNEXPECTED_ERROR);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      handleLoginError(err);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const { CognitoUser, CognitoUserPool } = await import('amazon-cognito-identity-js');
      const { poolData } = await import('./cognitoConfig');

      const userPool = new CognitoUserPool(poolData);
      const cognitoUser = new CognitoUser({
        Username: resetEmail,
        Pool: userPool,
      });

      await new Promise<void>((resolve, reject) => {
        cognitoUser.forgotPassword({
          onSuccess: () => resolve(),
          onFailure: (err) => reject(err),
        });
      });

      setSuccessMessage(SUCCESS_MESSAGES.RESET_CODE_SENT);
      setResetStep(RESET_STEP.CODE);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.RESET_CODE_FAILED;
      setError(errorMessage || ERROR_MESSAGES.RESET_CODE_FAILED);
    }
  };

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const { CognitoUser, CognitoUserPool } = await import('amazon-cognito-identity-js');
      const { poolData } = await import('./cognitoConfig');

      const userPool = new CognitoUserPool(poolData);
      const cognitoUser = new CognitoUser({
        Username: resetEmail,
        Pool: userPool,
      });

      await new Promise<void>((resolve, reject) => {
        cognitoUser.confirmPassword(resetCode, newPassword, {
          onSuccess: () => resolve(),
          onFailure: (err) => reject(err),
        });
      });

      setSuccessMessage(SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS);
      setIsLoading(false);

      setTimeout(() => {
        resetPasswordForm();
      }, AUTO_REDIRECT_DELAY);
    } catch (err) {
      setIsLoading(false);
      handlePasswordResetError(err);
    }
  };

  const resetPasswordForm = (): void => {
    setShowResetPassword(false);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setResetStep(RESET_STEP.EMAIL);
    setSuccessMessage('');
  };

  const handlePasswordResetError = (err: unknown): void => {
    if (err instanceof Error) {
      if (err.message.includes('Invalid verification code')) {
        setError(ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
      } else if (err.message.includes('Password does not conform')) {
        setError(ERROR_MESSAGES.PASSWORD_POLICY_VIOLATION);
      } else {
        setError(err.message || ERROR_MESSAGES.PASSWORD_RESET_FAILED);
      }
    } else {
      setError(ERROR_MESSAGES.PASSWORD_RESET_FAILED);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Trading Dashboard</h1>
          <p>{showResetPassword ? 'Reset Your Password' : 'Please sign in to continue'}</p>
        </div>

        {!showResetPassword ? (
          // Login Form
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="forgot-password-link"
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        ) : resetStep === 'email' ? (
          // Request Reset Code Form
          <form onSubmit={handleForgotPassword} className="login-form">
            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="success-banner">
                {successMessage}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="resetEmail">Email Address</label>
              <input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setError('');
                  setSuccessMessage('');
                  setResetEmail('');
                }}
                className="forgot-password-link"
                disabled={isLoading}
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          // Enter Code and New Password Form
          <form onSubmit={handleResetPassword} className="login-form">
            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="success-banner">
                {successMessage}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="resetCode">Verification Code</label>
              <input
                id="resetCode"
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="Enter code from email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                Min 8 characters, uppercase, lowercase, number, special character
              </small>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button
                type="button"
                onClick={() => {
                  setResetStep(RESET_STEP.EMAIL);
                  setError('');
                  setSuccessMessage('');
                  setResetCode('');
                  setNewPassword('');
                }}
                className="forgot-password-link"
                disabled={isLoading}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p>Secure authentication powered by AWS Cognito</p>
        </div>
      </div>
    </div>
  );
}

