import { Navigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Users, 
  Wallet, 
  CheckSquare, 
  Star, 
  TrendingUp, 
  Heart,
  Smartphone,
  Shield,
  Award
} from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Tarefas & Mesada</h1>
                <p className="text-sm text-muted-foreground">Gestão familiar inteligente</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/auth'}
              >
                Entrar
              </Button>
              <Button 
                size="sm" 
                className="gradient-primary text-white border-0"
                onClick={() => window.location.href = '/auth'}
              >
                Começar Grátis
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container max-w-7xl mx-auto text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20" variant="outline">
            <Heart className="w-4 h-4 mr-2" />
            Para famílias brasileiras
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
            Ensine{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              responsabilidade
            </span>
            <br />
            de forma divertida
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Organize tarefas domésticas, gerencie mesadas e ensine educação financeira. 
            Tudo em um app seguro e fácil de usar.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              className="gradient-primary text-white border-0 shadow-primary px-8 py-6 text-lg"
              onClick={() => window.location.href = '/auth'}
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Baixar App Grátis
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
              Ver Demonstração
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Users, number: "1.2K+", label: "Famílias" },
              { icon: CheckSquare, number: "15K+", label: "Tarefas" },
              { icon: TrendingUp, number: "89%", label: "Aprovação" },
              { icon: Award, number: "4.8★", label: "Avaliação" }
            ].map((stat, i) => (
              <div key={i} className="text-center p-4">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <div className="text-2xl font-bold text-foreground">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Tudo que sua família precisa
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades pensadas para facilitar a vida dos pais e ensinar as crianças
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: CheckSquare,
                title: "Tarefas Inteligentes",
                description: "Crie tarefas recorrentes, defina valores e acompanhe o progresso em tempo real.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: Wallet,
                title: "Mesada Digital",
                description: "Controle mesadas, recompensas e extrato financeiro de cada filha automaticamente.",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: Star,
                title: "Sistema de Recompensas",
                description: "Incentive com prêmios por tarefas concluídas e metas alcançadas.",
                gradient: "from-yellow-500 to-orange-500"
              },
              {
                icon: Shield,
                title: "Segurança Total",
                description: "Dados protegidos, acesso controlado por família e privacidade garantida.",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: Smartphone,
                title: "App Mobile",
                description: "Interface otimizada para celular, funciona offline e pode ser instalado.",
                gradient: "from-indigo-500 to-blue-500"
              },
              {
                icon: TrendingUp,
                title: "Relatórios",
                description: "Acompanhe evolução, estatísticas e relatórios detalhados da família.",
                gradient: "from-teal-500 to-green-500"
              }
            ].map((feature, i) => (
              <Card key={i} className="card-interactive border-0 shadow-card gradient-card">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="gradient-card rounded-3xl p-12 shadow-lg border">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Pronto para começar?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se às famílias que já estão ensinando responsabilidade financeira de forma moderna
            </p>
            <Button 
              size="lg" 
              className="gradient-primary text-white border-0 shadow-primary px-8 py-6 text-lg"
              onClick={() => window.location.href = '/auth'}
            >
              <Users className="w-5 h-5 mr-2" />
              Criar Conta Familiar
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Grátis para sempre • Sem cartão de crédito • Configure em 2 minutos
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-foreground">Tarefas & Mesada</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>Feito com ❤️ para famílias brasileiras</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}