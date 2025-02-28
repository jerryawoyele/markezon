
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("Notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72">
        <MobileHeader />
        
        <div className="max-w-3xl mx-auto py-8 px-4 pb-24 xl:pb-8">
          <h1 className="text-2xl font-bold mb-6">Notifications</h1>

          <div className="space-y-4">
            {loading ? (
              <Card className="p-4 animate-pulse bg-white/5">
                Loading notifications...
              </Card>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    notification.read ? 'bg-black/20' : 'bg-black/40'
                  }`}
                >
                  <div className="flex gap-4">
                    <Avatar>
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        {notification.title[0]}
                      </div>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium">{notification.title}</h3>
                      <p className="text-sm text-white/60">{notification.message}</p>
                      <span className="text-xs text-white/40">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-4 text-center text-white/60">
                No notifications yet
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
