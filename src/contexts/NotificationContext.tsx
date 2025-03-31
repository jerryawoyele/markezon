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
      // Initial fetch
      refreshCounts();
      
      // Set up real-time subscription for notifications
      const notificationsChannel = supabase.channel('notifications-changes');
      
      // Subscribe to INSERT events
      notificationsChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('New notification received');
          refreshCounts();
        }
      );
      
      // Subscribe to UPDATE events
      notificationsChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('Notification updated');
          refreshCounts();
        }
      );
      
      // Set up real-time subscription for messages
      const messagesChannel = supabase.channel('messages-changes');
      
      // Subscribe to INSERT events
      messagesChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        () => {
          console.log('New message received');
          refreshCounts();
        }
      );
      
      // Subscribe to UPDATE events
      messagesChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        () => {
          console.log('Message updated');
          refreshCounts();
        }
      );
      
      // Subscribe to both channels
      notificationsChannel.subscribe();
      messagesChannel.subscribe();
      
      // Set a 30-second polling interval as fallback
      const pollingInterval = setInterval(() => {
        refreshCounts();
      }, 30000);
        
      return () => {
        notificationsChannel.unsubscribe();
        messagesChannel.unsubscribe();
        clearInterval(pollingInterval);
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