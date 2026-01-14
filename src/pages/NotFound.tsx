import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Card className="w-full max-w-md gradient-card shadow-card">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-4">Página não encontrada</h2>
          
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Ops! A página que você está procurando não existe ou foi movida. 
            Que tal voltar para o início?
          </p>
          
          <Button 
            onClick={() => window.location.href = "/"} 
            className="gradient-primary text-white border-0 shadow-primary w-full"
            size="lg"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
