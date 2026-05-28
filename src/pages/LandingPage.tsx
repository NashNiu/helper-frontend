import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Button } from '@/components/ui/button';
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';

interface LocationState {
  openLogin?: boolean;
}

export default function LandingPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as LocationState | null;
  const [loginOpen, setLoginOpen] = useState(() => !!locationState?.openLogin);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Redirect already-authenticated users straight to the app
  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/app', { replace: true });
    }
  }, [status, navigate]);

  // Show nothing while auth status is resolving to avoid flash
  if (status === 'initializing') return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-base">助手</span>
          <div className="flex items-center gap-4">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              功能
            </a>
            <a
              href="#about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              关于
            </a>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <Button variant="outline" size="sm" onClick={() => setLoginOpen(true)}>
              登录
            </Button>
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              注册
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            ✦ AI 驱动的个人效率工具
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            一句话，管好你的每一天
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            输入自然语言，AI 自动识别并分类到提醒、计时、待办或记账 — 无需手动填表。
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button className="px-6 py-2.5" onClick={() => setRegisterOpen(true)}>
              免费开始使用
            </Button>
            <Button
              variant="outline"
              className="px-6 py-2.5"
              onClick={() =>
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              了解功能 ↓
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 px-4 bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">四大核心功能</h2>
            <p className="text-muted-foreground text-sm">每项功能都支持自然语言输入，AI 帮你解析</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                emoji: '📅',
                title: '智能提醒',
                desc: '"30 分钟后提醒我喝水" — 自动解析时间，到点推送通知',
              },
              {
                emoji: '⏱️',
                title: '番茄计时',
                desc: '内置番茄钟与自定义计时，底部悬浮控件随时可见',
              },
              {
                emoji: '✅',
                title: '待办清单',
                desc: '快速记录任务，支持图片附件，完成一键勾选',
              },
              {
                emoji: '💰',
                title: '收支记录',
                desc: 'AI 自动分类，图表统计收支，层级分类随意管理',
              },
            ].map((f) => (
              <div key={f.title} className="border border-border rounded-xl p-5">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <div className="font-semibold mb-1">{f.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Highlight ── */}
      <section id="about" className="py-16 px-4 bg-muted/40">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-8 items-center">
          <div className="flex-1">
            <span className="inline-block bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              ✦ AI 核心能力
            </span>
            <h3 className="text-xl font-bold mb-3 leading-snug">一句话，同时搞定多件事</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              "午饭花了 15 元，下午 3 点提醒我开会，再帮我加个番茄钟"
              <br />— AI 识别出记账 + 提醒 + 计时，一次全部处理。
            </p>
            <Button onClick={() => setRegisterOpen(true)}>立即体验</Button>
          </div>
          <div className="flex-shrink-0 w-full sm:w-52 bg-background border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">输入示例</div>
            <div className="bg-muted rounded-lg px-3 py-2 text-sm leading-relaxed mb-3">
              "午饭花了 15 元，30 分钟后提醒我喝水"
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded px-2 py-1 text-xs">
                ✓ 记账：餐饮 ¥15
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded px-2 py-1 text-xs">
                ✓ 提醒：喝水 30min
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2025 助手 · 一句话管好你的每一天
      </footer>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
      />
      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />
    </div>
  );
}
