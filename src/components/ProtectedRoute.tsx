import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 包住业务路由：
 *   - 初始拉 /auth/me 期间显示占位，避免闪一下登录页
 *   - 未登录跳 /login，并把 from 带过去以便登录后回跳
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
        正在验证登录…
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
