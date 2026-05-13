import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useReminders } from '../hooks/useReminders';
import type { Reminder } from '../api/reminder';
import NotificationToast from '../components/NotificationToast';
import { showSystemNotification } from '../utils/notify';
import { RemindersContext } from './RemindersContext';

export default function RemindersProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Reminder | null>(null);

  const handleTrigger = useCallback((r: Reminder) => {
    setToast(r);
    showSystemNotification({
      title: '⏰ 提醒',
      body: r.message,
      tag: `reminder-${r.id}`,
    });
  }, []);

  const { scheduleOne } = useReminders(handleTrigger);
  const handleToastClose = useCallback(() => setToast(null), []);

  return (
    <RemindersContext.Provider value={{ scheduleOne }}>
      {toast && <NotificationToast message={`⏰ ${toast.message}`} onClose={handleToastClose} />}
      {children}
    </RemindersContext.Provider>
  );
}
