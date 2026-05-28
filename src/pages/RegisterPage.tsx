import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [codeSending, setCodeSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [codeMsg, setCodeMsg] = useState('');
  const cooldownTimer = useRef<number | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownTimer.current = window.setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current !== null) {
            clearInterval(cooldownTimer.current);
            cooldownTimer.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (cooldownTimer.current !== null) {
        clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
    };
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    if (codeSending || cooldown > 0) return;
    const em = email.trim();
    if (!EMAIL_RE.test(em)) {
      setError('Please enter a valid email first');
      return;
    }
    setError('');
    setCodeMsg('');
    setCodeSending(true);
    try {
      await authApi.sendVerificationCode(em);
      setCodeMsg('Code sent to your inbox (check spam too). Valid for 5 minutes.');
      setCooldown(60);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send code'));
    } finally {
      setCodeSending(false);
    }
  }, [email, codeSending, cooldown]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      const u = username.trim();
      const em = email.trim();
      const c = code.trim();
      if (!u || !em || !password || !c) {
        setError('Please fill in all fields');
        return;
      }
      if (!/^\d{6}$/.test(c)) {
        setError('Code must be 6 digits');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 chars');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        await register({ username: u, email: em, password, code: c });
        navigate('/', { replace: true });
      } catch (err) {
        setError(getErrorMessage(err, 'Registration failed'));
      } finally {
        setSubmitting(false);
      }
    },
    [username, email, code, password, confirm, submitting, register, navigate]
  );

  const sendBtnLabel = codeSending ? 'Sending...' : cooldown > 0 ? `${cooldown}s` : 'Send code';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">Create account</h1>
            <p className="text-sm text-muted-foreground">Register to start tracking your day</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Email</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={handleSendCode}
                  disabled={codeSending || cooldown > 0 || submitting}
                  className="whitespace-nowrap shrink-0"
                >
                  {sendBtnLabel}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Verification code (6 digits)</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                disabled={submitting}
              />
              {codeMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{codeMsg}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Confirm password</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register'}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center">
            Have an account?
            <Link to="/login" className="ml-1 hover:text-foreground underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
