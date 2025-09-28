import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

export function NotificationBadge() {
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) {
        return { count: 0 };
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  if (unreadCount === 0) {
    return null;
  }

  return (
    <Badge className="bg-red-100 text-red-800 text-xs px-2 py-1">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}