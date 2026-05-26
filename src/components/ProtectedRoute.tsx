import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

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

  if (status === "initializing") {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4">
        {/* 旋转光环 */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
            style={{ animation: "spin 0.9s linear infinite" }}
          />
        </div>

        {/* 文字 + 跳动小点 */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>正在验证登录</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-1 h-1 rounded-full bg-muted-foreground"
              style={{
                animation: "bounce 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40%            { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

