import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth';
import { useToast } from '../toast';

/** /login and /register. "?next=/cars/4" sends the user back to where they were after signing in. */
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
  const [phone, setPhone] = useState('');
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
      else await register(fullName, email, phone, password);
      toast(mode === 'login' ? 'Welcome back!' : 'Account created. Welcome to DriveMate!');
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const other = mode === 'login' ? '/register' : '/login';
  const nextQuery = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <main className="page narrow">
      <form className="card auth-form" onSubmit={submit}>
        <h1 className="page-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        {next !== '/' && <p className="hint">{mode === 'login' ? 'Log in' : 'Sign up'} to continue. Your booking details are kept.</p>}
        {mode === 'register' && (
          <>
            <label>Full name<input required maxLength={100} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Mobile number (optional)<input type="tel" autoComplete="tel" placeholder="+63 9xx xxx xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          </>
        )}
        <label>Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password
          <span className="password-field">
            <input type={showPassword ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="link small-text" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        {mode === 'register' && <p className="hint">At least 8 characters.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={saving}>{saving ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <p className="muted center">
          {mode === 'login' ? 'New to DriveMate? ' : 'Already have an account? '}
          <Link to={`${other}${nextQuery}`} replace>{mode === 'login' ? 'Sign up' : 'Log in'}</Link>
        </p>
        {mode === 'login' && <p className="hint center">Demo: customer@drivemate.local (password in README)</p>}
      </form>
    </main>
  );
}
