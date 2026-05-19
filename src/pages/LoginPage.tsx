import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface LocationState {
  from?: { pathname: string };
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as LocationState | null)?.from?.pathname ?? '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      const id = identifier.trim();
      if (!id || !password) {
        setError('请输入用户名/邮箱和密码');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        await login(id, password);
        navigate(from, { replace: true });
      } catch (err) {
        setError(getErrorMessage(err, '登录失败'));
      } finally {
        setSubmitting(false);
      }
    },
    [identifier, password, submitting, login, navigate, from],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">登录助手</h1>
            <p className="text-sm text-muted-foreground">
              输入账号继续记录你的每一天
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                用户名或邮箱
              </label>
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '登录中…' : '登录'}
            </Button>
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/register" className="hover:text-foreground">
              没有账号？注册
            </Link>
            <Link to="/forgot-password" className="hover:text-foreground">
              忘记密码
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
