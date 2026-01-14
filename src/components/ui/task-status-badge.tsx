import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@/types";
import { Clock, CheckCircle, XCircle, AlertCircle, Upload } from "lucide-react";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const statusConfig = {
    pending: {
      variant: "secondary" as const,
      icon: Clock,
      text: "Pendente"
    },
    submitted: {
      variant: "outline" as const,
      icon: Upload,
      text: "Enviada"
    },
    approved: {
      variant: "default" as const,
      icon: CheckCircle,
      text: "Aprovada"
    },
    rejected: {
      variant: "destructive" as const,
      icon: XCircle,
      text: "Rejeitada"
    },
    overdue: {
      variant: "destructive" as const,
      icon: AlertCircle,
      text: "Vencida"
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </Badge>
  );
}