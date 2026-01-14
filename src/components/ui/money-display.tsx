import { formatBRL } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  amountCents: number;
  className?: string;
  showSign?: boolean;
  size?: "sm" | "default" | "lg";
}

export function MoneyDisplay({ 
  amountCents, 
  className, 
  showSign = false,
  size = "default" 
}: MoneyDisplayProps) {
  const isPositive = amountCents >= 0;
  const displayAmount = Math.abs(amountCents);
  
  const sizeClasses = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg font-semibold"
  };
  
  const colorClass = showSign 
    ? (isPositive ? "money-positive" : "money-negative")
    : "";
  
  const sign = showSign && amountCents !== 0 
    ? (isPositive ? "+" : "-") 
    : "";
  
  return (
    <span className={cn(sizeClasses[size], colorClass, className)}>
      {sign}{formatBRL(displayAmount)}
    </span>
  );
}