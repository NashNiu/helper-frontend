import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; text: string }>({
    kind: 'idle',
    text: '',
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      const v = email.trim();
      if (!v) {
        setStatus({ kind: 'err', text: '请输入邮箱' });
        return;
      }
      setSubmitting(true);
      setStatus({ kind: 'idle', text: '' });
      try {
        await authApi.forgotPassword(v);
        // 后端无论邮箱是否存在都返回成功，避免泄露注册信息
        setStatus({
          kind: 'ok',
          text: '如果该邮箱已注册，重置链接已发送，请查收（含垃圾邮件文件夹）。链接 30 分钟内有效。',
        });
      } catch (err) {
        setStatus({ kind: 'err', text: getErrorMessage(err, '提交失败') });
      } finally {
        setSubmitting(false);
      }
    },
    [email, submitting],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">找回密码</h1>
            <p className="text-sm text-muted-foreground">
              输入注册时使用的邮箱，我们会发送重置链接
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">邮箱</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
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
              {submitting ? '提交中…' : '发送重置链接'}
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
