import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUnreadNotificationsCount, getUnreadMessagesCount } from '@/utils/notification-helper';

interface NotificationContextType {
  unreadNotifications: number;
  unreadMessages: number;
  refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadNotifications: 0,
  unreadMessages: 0,
  refreshCounts: async () => {}
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user ID when the component mounts
  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
      }
    };
    
    fetchUserId();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUserId(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUserId(null);
          // Reset counts on sign out
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch notification and message counts whenever userId changes
  useEffect(() => {
    if (userId) {
      refreshCounts();
      
      // Set up real-time subscription for notifications
      const notificationsSubscription = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          () => {
            refreshCounts();
          }
        )
        .subscribe();
        
      // Set up real-time subscription for messages
      const messagesSubscription = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${userId}`
          },
          () => {
            refreshCounts();
          }
        )
        .subscribe();
        
      return () => {
        notificationsSubscription.unsubscribe();
        messagesSubscription.unsubscribe();
      };
    }
  }, [userId]);

  const refreshCounts = async () => {
    if (!userId) return;
    
    try {
      const [notificationCount, messageCount] = await Promise.all([
        getUnreadNotificationsCount(userId),
        getUnreadMessagesCount(userId)
      ]);
      
      setUnreadNotifications(notificationCount);
      setUnreadMessages(messageCount);
    } catch (error) {
      console.error('Error refreshing notification counts:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadNotifications,
        unreadMessages,
        refreshCounts
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}; 