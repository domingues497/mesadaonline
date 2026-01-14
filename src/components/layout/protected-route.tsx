import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireProfile?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireProfile = true 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const [waitingForProfile, setWaitingForProfile] = useState(false);

  // Wait a bit for profile to load before redirecting
  useEffect(() => {
    if (user && requireProfile && !profile && !loading) {
      setWaitingForProfile(true);
      const timer = setTimeout(() => {
        setWaitingForProfile(false);
      }, 3000); // Wait 3 seconds for profile to load

      return () => clearTimeout(timer);
    } else {
      setWaitingForProfile(false);
    }
  }, [user, profile, loading, requireProfile]);

  console.log('ProtectedRoute - State:', { 
    user: !!user, 
    profile: !!profile, 
    loading, 
    requireProfile, 
    allowedRoles,
    userRole: profile?.role,
    waitingForProfile
  });

  if (loading || waitingForProfile) {
    console.log('ProtectedRoute - Still loading or waiting for profile');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // Profile required but not loaded yet - redirect to setup page
  if (requireProfile && !profile) {
    console.log('ProtectedRoute - No profile, redirecting to /setup');
    return <Navigate to="/setup" replace />;
  }

  // Check role permissions
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    console.log('ProtectedRoute - Role not allowed, redirecting to /unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('ProtectedRoute - Access granted');
  return <>{children}</>;
}