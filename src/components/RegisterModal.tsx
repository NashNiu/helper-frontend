import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { authApi } from '../api/auth';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ open, onClose, onSwitchToLogin }: Props) {
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
      setError('请先输入有效邮箱');
      return;
    }
    setError('');
    setCodeMsg('');
    setCodeSending(true);
    try {
      await authApi.sendVerificationCode(em);
      setCodeMsg('验证码已发送，请查收（也检查垃圾箱）。5 分钟内有效。');
      setCooldown(60);
    } catch (err) {
      setError(getErrorMessage(err, '发送失败'));
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
        setError('请填写所有字段');
        return;
      }
      if (!/^\d{6}$/.test(c)) {
        setError('验证码须为 6 位数字');
        return;
      }
      if (password.length < 6) {
        setError('密码至少 6 位');
        return;
      }
      if (password !== confirm) {
        setError('两次密码不一致');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        await register({ username: u, email: em, password, code: c });
        onClose();
        navigate('/app');
      } catch (err) {
        setError(getErrorMessage(err, '注册失败'));
      } finally {
        setSubmitting(false);
      }
    },
    [username, email, code, password, confirm, submitting, register, navigate, onClose],
  );

  const sendBtnLabel = codeSending
    ? '发送中…'
    : cooldown > 0
      ? `${cooldown}s`
      : '发送验证码';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建账号</DialogTitle>
          <DialogDescription>注册后开始追踪你的每一天</DialogDescription>
        </DialogHeader>

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
            <label className="text-xs text-muted-foreground">验证码（6 位）</label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              autoComplete="one-time-code"
              disabled={submitting}
            />
            {codeMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{codeMsg}</p>
            )}
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
            <label className="text-xs text-muted-foreground">确认密码</label>
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
            {submitting ? '注册中…' : '注册'}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          已有账号？
          <button
            type="button"
            className="ml-1 hover:text-foreground underline transition-colors"
            onClick={() => { onClose(); onSwitchToLogin(); }}
          >
            去登录
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
