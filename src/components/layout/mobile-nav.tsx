import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "react-router-dom";
import { 
  Home, 
  CheckSquare, 
  Wallet, 
  BarChart3, 
  User,
  Heart,
  Settings,
  Clock,
  Users,
  Receipt
} from "lucide-react";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const { profile } = useAuth();
  const location = useLocation();
  
  const childTabs = [
    { id: "dashboard", icon: Home, label: "Início", path: "/dashboard" },
    { id: "statement", icon: Receipt, label: "Extrato", path: "/statement" },
    { id: "wallet", icon: Wallet, label: "Carteira", path: "/dashboard" },
    { id: "profile", icon: User, label: "Perfil", path: "/dashboard" }
  ];

  const parentTabs = [
    { id: "dashboard", icon: Home, label: "Família", path: "/dashboard" },
    { id: "tasks", icon: CheckSquare, label: "Tarefas", path: "/tasks" },
    { id: "approvals", icon: Clock, label: "Aprovar", path: "/approvals" },
    { id: "settings", icon: Settings, label: "Config", path: "/settings" },
  ];

  const tabs = profile?.role === "parent" ? parentTabs : childTabs;
  const currentPath = location.pathname;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50",
      "grid grid-cols-4 md:grid-cols-5 safe-area-inset-bottom",
      className
    )}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentPath === tab.path;
        
        return (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = tab.path}
            className={cn(
              "h-16 flex-col gap-1 rounded-none transition-smooth",
              isActive 
                ? "text-primary bg-primary/5" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn(
              "w-5 h-5 transition-smooth",
              isActive && "scale-110"
            )} />
            <span className="text-xs font-medium">{tab.label}</span>
            {isActive && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </Button>
        );
      })}
    </nav>
  );
}