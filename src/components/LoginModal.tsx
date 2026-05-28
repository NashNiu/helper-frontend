import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { getErrorMessage } from '../api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ open, onClose, onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const navigate = useNavigate();

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
        onClose();
        navigate('/app');
      } catch (err) {
        setError(getErrorMessage(err, '登录失败'));
      } finally {
        setSubmitting(false);
      }
    },
    [identifier, password, submitting, login, navigate, onClose]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>登录助手</DialogTitle>
          <DialogDescription>输入账号继续记录你的每一天</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">用户名或邮箱</label>
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

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground transition-colors"
            onClick={() => {
              onClose();
              onSwitchToRegister();
            }}
          >
            没有账号？注册
          </button>
          <button
            type="button"
            className="hover:text-foreground transition-colors"
            onClick={() => {
              onClose();
              navigate('/forgot-password');
            }}
          >
            忘记密码
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
