import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Settings 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notification } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 60000, // Refetch every minute
  });

  const unreadCount = unreadData?.count || 0;

  // Mark all as read when opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      const markAllAsRead = async () => {
        try {
          await apiRequest("PUT", "/api/notifications/mark-all-read");
          // Invalidate queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
        } catch (error) {
          console.error("Failed to mark notifications as read", error);
        }
      };
      markAllAsRead();
    }
  }, [isOpen, unreadCount]);

  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/notifications/${id}`);
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Notification deleted",
        description: "The notification has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete notification", error);
      toast({
        title: "Error",
        description: "Failed to delete notification.",
        variant: "destructive",
      });
    }
  };

  // Function to format notification date
  const formatNotificationDate = (dateString: string | Date | null) => {
    try {
      if (!dateString) return "Unknown date";
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "Unknown date";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-pulse text-amber-400' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border border-amber-500/30 shadow-lg" align="end">
        <div className="bg-[#132642] text-white px-4 py-3 font-semibold flex justify-between items-center border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">Notifications</span>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="link"
              className="text-xs text-blue-300 p-0 h-auto hover:text-amber-400 transition-colors"
              onClick={() => {
                apiRequest("POST", "/api/notifications/mark-all-read");
                queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
              }}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors hover:bg-muted/50 border-l-4 ${
                    !notification.isRead 
                      ? "bg-blue-50 dark:bg-blue-900/20 border-amber-400" 
                      : "border-transparent"
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      {notification.type === 'warning' && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      {notification.type === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {notification.type === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {notification.type === 'info' && (
                        <Info className="h-4 w-4 text-blue-500" />
                      )}
                      {notification.type === 'system' && (
                        <Settings className="h-4 w-4 text-gray-500" />
                      )}
                      <h4 className="text-sm font-medium leading-none">
                        {notification.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.content}
                  </p>
                  {notification.message && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      {notification.message}
                    </p>
                  )}
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationDate(notification.createdAt)}
                    </span>
                    {notification.linkUrl && (
                      <Button
                        variant="link"
                        className="text-xs p-0 h-auto text-blue-500 hover:text-amber-500 transition-colors flex items-center gap-1"
                        onClick={() => {
                          setIsOpen(false);
                          
                          // Handle navigation safely
                          try {
                            // Check if the URL is valid and accessible in our app
                            const validRoutes = [
                              "/admin", 
                              "/dashboard", 
                              "/gallery", 
                              "/finance", 
                              "/analytics",
                              "/social-media"
                            ];
                            
                            // Get notification link URL (TypeScript safety)
                            const linkUrl = String(notification.linkUrl || '');
                            
                            // Check if the URL starts with any of our valid routes
                            const isValidRoute = validRoutes.some(route => 
                              linkUrl.startsWith(route)
                            );
                            
                            if (isValidRoute) {
                              navigate(linkUrl);
                            } else {
                              // Fallback to homepage if route is invalid
                              navigate("/dashboard");
                              toast({
                                title: "Navigation",
                                description: "Redirected to dashboard - original path not found",
                                variant: "default",
                              });
                            }
                          } catch (error) {
                            console.error("Navigation error:", error);
                            navigate("/dashboard");
                          }
                        }}
                      >
                        View details <span className="inline-block ml-1">→</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}