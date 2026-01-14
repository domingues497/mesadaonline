import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Setup() {
  const { user, profile, loading } = useAuth();
  const [setupStatus, setSetupStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (profile) {
        setSetupStatus('success');
        // Redirect after showing success
        setTimeout(() => {
          setShouldRedirect(true);
        }, 1500);
      } else if (user) {
        // Still waiting for profile creation
        const timeout = setTimeout(() => {
          setSetupStatus('error');
          setErrorMessage('Não foi possível configurar sua conta. Tente fazer login novamente.');
        }, 10000); // 10 seconds timeout

        return () => clearTimeout(timeout);
      }
    }
  }, [user, profile, loading]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (shouldRedirect && profile) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      <Card className="w-full max-w-md gradient-card">
        <CardHeader className="text-center">
          {setupStatus === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4">
                <LoadingSpinner size="lg" />
              </div>
              <CardTitle>Configurando sua conta...</CardTitle>
              <CardDescription>
                Estamos preparando tudo para você. Isso pode levar alguns segundos.
              </CardDescription>
            </>
          )}
          
          {setupStatus === 'success' && (
            <>
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle>Conta configurada!</CardTitle>
              <CardDescription>
                Redirecionando para o painel...
              </CardDescription>
            </>
          )}
          
          {setupStatus === 'error' && (
            <>
              <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle>Erro na configuração</CardTitle>
              <CardDescription className="text-destructive">
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        {setupStatus === 'error' && (
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/auth'} 
              className="w-full"
              variant="outline"
            >
              Voltar para o login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
