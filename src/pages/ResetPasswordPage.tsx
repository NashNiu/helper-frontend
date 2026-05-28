import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') ?? '', [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; text: string }>({
    kind: 'idle',
    text: '',
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      if (!token) {
        setStatus({ kind: 'err', text: '重置链接缺少 token' });
        return;
      }
      if (password.length < 6) {
        setStatus({ kind: 'err', text: '密码至少 6 位' });
        return;
      }
      if (password !== confirm) {
        setStatus({ kind: 'err', text: '两次输入的密码不一致' });
        return;
      }
      setSubmitting(true);
      setStatus({ kind: 'idle', text: '' });
      try {
        await authApi.resetPassword(token, password);
        setStatus({ kind: 'ok', text: '密码已重置，2 秒后跳转登录…' });
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      } catch (err) {
        setStatus({ kind: 'err', text: getErrorMessage(err, '重置失败') });
      } finally {
        setSubmitting(false);
      }
    },
    [token, password, confirm, submitting, navigate]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">重置密码</h1>
            <p className="text-sm text-muted-foreground">设置一个新的登录密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">新密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">再次输入新密码</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>

            {status.text && (
              <p
                className={
                  status.kind === 'err'
                    ? 'text-xs text-destructive'
                    : 'text-xs text-emerald-600 dark:text-emerald-400'
                }
              >
                {status.text}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '提交中…' : '重置密码'}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center">
            <Link to="/login" className="hover:text-foreground underline">
              返回登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
