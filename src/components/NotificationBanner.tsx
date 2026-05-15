import { useState, useCallback } from 'react';
import { getNotificationPermission, requestNotificationPermission } from '../utils/notify';
import type { NotifyPermission } from '../utils/notify';
import { BellIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'notify-banner-dismissed';

export default function NotificationBanner() {
  const [permission, setPermission] = useState<NotifyPermission>(() => getNotificationPermission());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  const handleEnable = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result !== 'default') {
      try { localStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }, []);

  if (permission !== 'default' || dismissed) return null;

  return (
    <div className="mb-4 rounded-xl border bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 p-3 flex items-center gap-3 text-sm">
      <BellIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
      <p className="flex-1 text-amber-800 dark:text-amber-200">
        开启系统通知后，即使你切到别的标签页或最小化浏览器，也能在到点时收到提醒。
      </p>
      <Button size="sm" onClick={handleEnable} className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white border-0">
        开启
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200">
        稍后
      </Button>
    </div>
  );
}
