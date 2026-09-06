import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Shield,
  Lock,
  Building2,
  Mail,
  ArrowRight,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose }) => {
  const { login, registerAdmin, loginWithGoogle, completeOnboarding } = useAuth();
  const [step, setStep] = useState<'auth' | 'onboarding'>('auth');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [university, setUniversity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google Onboarding specific state
  const [authenticatedUserName, setAuthenticatedUserName] = useState('');
  const [authenticatedUserEmail, setAuthenticatedUserEmail] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Reset state on modal open/close
  useEffect(() => {
    if (isOpen) {
      setStep('auth');
      setError(null);
      setLoading(false);
      setFullName('');
      setEmailOrUsername('');
      setPassword('');
      setCollegeName('');
      setUniversity('');
      setShowPassword(false);
      setAuthenticatedUserName('');
      setAuthenticatedUserEmail('');
    }
  }, [isOpen]);

  // Initialize and render Google Identity Services button
  useEffect(() => {
    if (!isOpen || step !== 'auth') return;

    const initGsi = () => {
      if (googleClientId && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              try {
                setLoading(true);
                setError(null);
                const authRes = await loginWithGoogle({ credential: response.credential });
                if (authRes.needsOnboarding) {
                  setAuthenticatedUserName(authRes.name || authRes.username);
                  setAuthenticatedUserEmail(authRes.email || '');
                  setStep('onboarding');
                } else {
                  onClose();
                }
              } catch (err: any) {
                setError(err.response?.data?.error || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            }
          });

          if (googleButtonRef.current) {
            (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
              theme: 'outline',
              size: 'large',
              width: 382,
              text: 'continue_with',
              shape: 'pill'
            });
          }
        } catch (e) {
          console.warn('GSI render error:', e);
        }
      }
    };

    const timer = setTimeout(initGsi, 150);
    return () => clearTimeout(timer);
  }, [isOpen, step, googleClientId]);

  if (!isOpen) return null;

  // Manual fallback trigger for Google OAuth
  const handleManualGoogleClick = () => {
    if (googleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
      } catch {
        setError('Please click the Google button directly to complete verification.');
      }
    } else {
      setError('Google Sign-In client is configuring. You may continue with institutional email below.');
    }
  };

  // Handle direct sign-in or registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (mode === 'signin') {
        if (!emailOrUsername.trim() || !password) {
          setError('Please enter your email/username and password.');
          setLoading(false);
          return;
        }
        const authRes = await login(emailOrUsername.trim(), password);
        if (authRes.needsOnboarding) {
          setAuthenticatedUserName(authRes.name || authRes.username);
          setAuthenticatedUserEmail(authRes.email || '');
          setStep('onboarding');
        } else {
          onClose();
        }
      } else {
        // Sign up with general registration: requires Name, Email, College, University, and Password
        if (!fullName.trim() || !emailOrUsername.trim() || !password) {
          setError('Please fill in your name, work email, and password.');
          setLoading(false);
          return;
        }
        if (!collegeName.trim() || collegeName.trim().length < 2) {
          setError('Please enter your college or institution name.');
          setLoading(false);
          return;
        }
        if (!university.trim() || university.trim().length < 2) {
          setError('Please enter your affiliated university name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const authRes = await registerAdmin({
          name: fullName.trim(),
          email: emailOrUsername.trim(),
          password,
          collegeName: collegeName.trim(),
          university: university.trim()
        });

        if (authRes.needsOnboarding) {
          setAuthenticatedUserName(authRes.name || authRes.username);
          setAuthenticatedUserEmail(authRes.email || '');
          setStep('onboarding');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || (mode === 'signin' ? 'Invalid credentials.' : 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle post-Google-verification institution onboarding
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim() || collegeName.trim().length < 2) {
      setError('Please enter your college or institution name.');
      return;
    }
    if (!university.trim() || university.trim().length < 2) {
      setError('Please enter your university name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await completeOnboarding(collegeName.trim(), university.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save institution details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0c1220] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Subtle ambient lighting */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================= */}
        {/* STEP 1: AUTHENTICATION (SIGN IN / CREATE ACCOUNT)         */}
        {/* ========================================================= */}
        {step === 'auth' && (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Organizer Portal</h2>
                <p className="text-xs text-slate-400">Host, proctor, and manage college tournaments</p>
              </div>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google OAuth GSI Button Container */}
            <div className="w-full flex justify-center mb-1">
              <div ref={googleButtonRef} className="w-full flex justify-center" />
            </div>

            {/* Custom Fallback Button if GSI renders slow */}
            <button
              type="button"
              disabled={loading}
              onClick={handleManualGoogleClick}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                />
              </svg>
              <span>{loading ? 'Verifying with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative px-3 bg-[#0c1220] text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                {mode === 'signup' ? 'or register with academic credentials' : 'or continue with email'}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Prof. Alex Morgan or Sarah Chen"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">
                      College / Institution Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g. College of Engineering Guindy"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">
                      University Name
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        placeholder="e.g. Anna University or Cambridge University"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Your college workspace and unique codes will be automatically generated.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  {mode === 'signup' ? 'Work / Academic Email' : 'Email or Username'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={mode === 'signup' ? 'email' : 'text'}
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder={mode === 'signup' ? 'organizer@university.edu' : 'you@university.edu or username'}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Minimum 6 characters' : '••••••••'}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {loading
                    ? 'Authenticating...'
                    : mode === 'signup'
                    ? 'Create Organizer Workspace'
                    : 'Sign In to Dashboard'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Mode Switcher Footer */}
            <div className="mt-5 text-center text-xs text-slate-400">
              {mode === 'signin' ? (
                <span>
                  New organizer?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Create an account
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Sign in here
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: POST-GOOGLE-VERIFICATION INSTITUTION ONBOARDING   */}
        {/* ========================================================= */}
        {step === 'onboarding' && (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Complete Institution Setup
                </h2>
                <p className="text-xs text-slate-400">Provide your college and university details</p>
              </div>
            </div>

            {/* Verified Google Account Badge */}
            <div className="mb-5 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Google Account Verified</span>
                </div>
                <div className="text-xs text-white font-medium truncate mt-0.5">
                  {authenticatedUserName || 'Verified Organizer'}
                </div>
                {authenticatedUserEmail && (
                  <div className="text-[11px] text-slate-400 truncate">
                    {authenticatedUserEmail}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  College / Institution Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. College of Engineering Guindy or MIT"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  The specific campus, college, or engineering school you represent.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  University Name
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. Anna University or Harvard University"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  The parent university or academic institution governing your department.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Configuring Workspace...' : 'Complete Setup & Launch Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
