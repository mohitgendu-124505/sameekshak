import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Policy } from "@shared/schema";

interface PolicyCardProps {
  policy: Policy;
  showActions?: boolean;
  className?: string;
  onClick?: () => void;
}

export function PolicyCard({ policy, showActions = false, className = "", onClick }: PolicyCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary text-primary-foreground";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card 
      className={`policy-card cursor-pointer transition-all hover:shadow-lg ${className}`}
      onClick={onClick}
      data-testid={`policy-card-${policy.id}`}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-foreground text-lg leading-tight" data-testid={`policy-title-${policy.id}`}>
            {policy.title}
          </h3>
          <Badge 
            className={getStatusColor(policy.status)}
            data-testid={`policy-status-${policy.id}`}
          >
            {formatStatus(policy.status)}
          </Badge>
        </div>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3" data-testid={`policy-description-${policy.id}`}>
          {policy.description}
        </p>
        
        {showActions && (
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              data-testid={`button-edit-${policy.id}`}
            >
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              data-testid={`button-details-${policy.id}`}
            >
              Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
