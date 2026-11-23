import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, Info, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { Logo } from '../components/Logo';

/**
 * /login and /register share one card. Both forms stay on the page and a purple panel
 * slides from one side to the other when you switch (see the .auth-* rules in polish.css).
 * "?next=/cars/4" sends the user back to where they were after signing in.
 */
export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Only allow paths inside this site (starting with a single "/"), never an outside URL.
  const rawNext = params.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(fullName, email, '', password);
      toast(mode === 'login' ? 'Welcome back!' : 'Account created. Welcome to DriveMate!');
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const nextQuery = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
  /** The sign-up version has an (i) tooltip with the password rule; the log-in version doesn't need it. */
  const passwordField = (forSignUp: boolean) => {
    const field = (
      <div className="auth-field">
        <Lock className="ico" aria-hidden="true" />
        <input type={showPassword ? 'text' : 'password'} required placeholder="Password" aria-label="Password"
          minLength={forSignUp ? 8 : undefined} aria-describedby={forSignUp ? 'password-tip' : undefined}
          autoComplete={forSignUp ? 'new-password' : 'current-password'}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}>
          {showPassword ? <Eye className="ico" aria-hidden="true" /> : <EyeOff className="ico" aria-hidden="true" />}
        </button>
      </div>
    );
    if (!forSignUp) return field;
    // Sign up: the (i) tooltip sits outside the field, to its right.
    return (
      <div className="auth-row">
        {field}
        <span className="auth-tip">
          <button type="button" className="auth-info" aria-label="Password rules"><Info className="ico" aria-hidden="true" /></button>
          <span id="password-tip" role="tooltip">Use at least 8 characters.</span>
        </span>
      </div>
    );
  };
  const emailField = (
    <div className="auth-field">
      <Mail className="ico" aria-hidden="true" />
      <input type="email" required placeholder="Email" aria-label="Email" autoComplete="email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
    </div>
  );
  const hint = next !== '/' && <p className="hint">{mode === 'login' ? 'Log in' : 'Sign up'} to continue. Your booking details are kept.</p>;

  return (
    <main className="auth-page">
      <div className={`auth-shell ${mode}`}>
        <form className="auth-pane pane-login" onSubmit={submit} inert={mode !== 'login'}>
          <Logo size={44} />
          <h1>Log in</h1>
          {hint}
          {emailField}
          {passwordField(false)}
          {mode === 'login' && error && <p className="error" role="alert">{error}</p>}
          <button className="primary" disabled={saving}>{saving ? 'Please wait…' : 'Log in'}</button>
          <p className="hint">Demo: customer@drivemate.local (password in README)</p>
        </form>

        <form className="auth-pane pane-register" onSubmit={submit} inert={mode !== 'register'}>
          <Logo size={44} />
          <h1>Sign up</h1>
          {hint}
          <div className="auth-field">
            <User className="ico" aria-hidden="true" />
            <input required maxLength={100} placeholder="Full name" aria-label="Full name" autoComplete="name"
              value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {emailField}
          {passwordField(true)}
          {mode === 'register' && error && <p className="error" role="alert">{error}</p>}
          <button className="primary" disabled={saving}>{saving ? 'Please wait…' : 'Sign up'}</button>
        </form>

        <aside className="auth-panel">
          {/* Steering wheel: turns when the panel slides between log in and sign up (see .panel-wheel in polish.css) */}
          <svg className="panel-wheel" viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="30" cy="30" r="24" fill="none" stroke="#fff" strokeWidth="5" />
            <path d="M30 30 11 19M30 30 49 19M30 30V52" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="30" cy="30" r="5.5" fill="#fff" />
            <rect x="27" y="3.5" width="6" height="10" rx="3" fill="#DB2777" />
          </svg>
          <div className="panel-text for-login">
            <h2>Hello, Welcome!</h2>
            <p>Don't have an account?</p>
            <Link className="panel-btn" to={`/register${nextQuery}`} replace tabIndex={mode === 'login' ? 0 : -1}>Sign up</Link>
          </div>
          <div className="panel-text for-register">
            <h2>Welcome back!</h2>
            <p>Already have an account?</p>
            <Link className="panel-btn" to={`/login${nextQuery}`} replace tabIndex={mode === 'register' ? 0 : -1}>Log in</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
