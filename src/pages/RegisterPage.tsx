import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      const u = username.trim();
      const em = email.trim();
      if (!u || !em || !password) {
        setError('请填写完整信息');
        return;
      }
      if (password.length < 6) {
        setError('密码至少 6 位');
        return;
      }
      if (password !== confirm) {
        setError('两次输入的密码不一致');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        await register({ username: u, email: em, password });
        navigate('/', { replace: true });
      } catch (err) {
        setError(getErrorMessage(err, '注册失败'));
      } finally {
        setSubmitting(false);
      }
    },
    [username, email, password, confirm, submitting, register, navigate],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">创建账号</h1>
            <p className="text-sm text-muted-foreground">
              注册后即可开始记录提醒、待办、收支
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">用户名</label>
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
              <label className="text-xs text-muted-foreground">邮箱</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                再次输入密码
              </label>
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
              {submitting ? '注册中…' : '注册并登录'}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center">
            已有账号？
            <Link to="/login" className="ml-1 hover:text-foreground underline">
              登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
