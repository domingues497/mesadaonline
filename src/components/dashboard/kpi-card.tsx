import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/ui/money-display";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isMoney?: boolean;
  className?: string;
}

export function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  trend, 
  isMoney = false,
  className 
}: KpiCardProps) {
  return (
    <Card className={cn("gradient-card shadow-card transition-smooth hover:shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {isMoney && typeof value === 'number' ? (
            <MoneyDisplay amountCents={value} size="lg" />
          ) : (
            value
          )}
        </div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
        
        {trend && (
          <div className={cn(
            "text-xs flex items-center mt-1",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            <span>
              {trend.isPositive ? "+" : ""}{trend.value}% em relação ao mês anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}