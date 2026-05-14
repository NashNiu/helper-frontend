import { useState, useCallback } from 'react';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../utils/notify';
import type { NotifyPermission } from '../utils/notify';
import { BellIcon } from '@heroicons/react/24/outline';

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
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-sm">
      <BellIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
      <p className="flex-1 text-amber-800">
        开启系统通知后，即使你切到别的标签页或最小化浏览器，也能在到点时收到提醒。
      </p>
      <button
        onClick={handleEnable}
        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg"
      >
        开启
      </button>
      <button
        onClick={handleDismiss}
        className="text-xs text-amber-600 hover:text-amber-800"
      >
        稍后
      </button>
    </div>
  );
}
