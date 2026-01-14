import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { ChildDashboard } from '@/components/dashboard/child-dashboard';
import { ParentDashboard } from '@/components/dashboard/parent-dashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {profile.role === 'child' ? <ChildDashboard /> : <ParentDashboard />}
    </div>
  );
}