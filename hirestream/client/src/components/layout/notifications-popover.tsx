import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle, Info, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Notification } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export function NotificationsPopover() {
  const queryClient = useQueryClient();

  const { data: notifRes } = useQuery({
    queryKey: ["/api/v1/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 1000 * 60, // Poll every 60s
  });

  const notifications: Notification[] = notifRes?.data || [];
  const unreadCount = notifRes?.unreadCount || 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notifications"] });
    },
  });
  
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/v1/notifications/mark-all-read`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notifications"] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "application_update":
        return <CheckCircle className="w-4 h-4 text-gov-blue" />;
      case "agency_verified":
        return <Star className="w-4 h-4 text-gov-green" />;
      case "system":
        return <Info className="w-4 h-4 text-gov-amber" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="h-5 w-5 text-gray-600 group-hover:text-gov-blue transition-colors" />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md ring-2 ring-white z-10">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
              <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-red-500 opacity-75 animate-ping" aria-hidden="true" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50/50">
          <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 text-gov-blue hover:text-gov-dark-blue"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 hover:bg-gray-50 transition-colors ${!notif.read ? "bg-blue-50/30" : ""}`}
                  onClick={() => {
                    if (!notif.read) markReadMutation.mutate(notif.id);
                  }}
                  role="button"
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${!notif.read ? "text-gray-900" : "text-gray-700"}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-gov-blue"></span>
                        )}
                      </div>
                      <p className={`text-xs ${!notif.read ? "text-gray-700" : "text-gray-500"}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {new Date(notif.createdAt!).toLocaleDateString()} at {new Date(notif.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
