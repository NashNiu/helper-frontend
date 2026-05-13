// Web Notifications API 封装：当浏览器不在前台或当前标签页不在焦点时，
// 通过系统通知告知用户，权限拒绝或不支持时静默失败。

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function getNotificationPermission(): NotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

let pendingRequest: Promise<NotifyPermission> | null = null;

export function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('unsupported');
  }
  if (Notification.permission !== 'default') {
    return Promise.resolve(Notification.permission);
  }
  if (pendingRequest) return pendingRequest;
  pendingRequest = Notification.requestPermission()
    .then(p => p as NotifyPermission)
    .finally(() => { pendingRequest = null; });
  return pendingRequest;
}

interface ShowOptions {
  title: string;
  body?: string;
  /** 触发后点击通知会聚焦回该浏览器标签 */
  focusOnClick?: boolean;
  /** 系统通知的唯一 tag，重复时会替换上一条 */
  tag?: string;
  /** 是否播放系统提示音（默认让操作系统决定） */
  silent?: boolean;
}

/**
 * 显示系统通知（无论页面是否在前台都会出现，前提是用户已授权）。
 * 在标签页本身就处于焦点时，浏览器仍然会显示通知，但用户也能直接看到应用内 toast，
 * 两者并行不互斥。
 */
export function showSystemNotification(options: ShowOptions): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;
  try {
    const n = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      silent: options.silent,
      icon: '/favicon.svg',
    });
    if (options.focusOnClick !== false) {
      n.onclick = () => {
        try { window.focus(); } catch { /* ignore */ }
        n.close();
      };
    }
    return n;
  } catch {
    return null;
  }
}
