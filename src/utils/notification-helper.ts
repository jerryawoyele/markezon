import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'follow' 
  | 'like' 
  | 'comment' 
  | 'message' 
  | 'service' 
  | 'review'
  | 'mention'
  | 'booking'
  | 'general';

interface CreateNotificationParams {
  userId: string;  // User who will receive the notification
  actorId?: string; // User who performed the action (optional)
  actorName?: string; // Username of the actor
  type: NotificationType;
  entityId?: string; // ID of related post, comment, service, etc.
  message?: string; // Custom message override
}

/**
 * Creates a notification for a user
 */
export async function createNotification({
  userId,
  actorId,
  actorName = 'Someone',
  type,
  entityId,
  message
}: CreateNotificationParams) {
  try {
    // Don't notify users about their own actions
    if (actorId === userId) {
      return;
    }

    // Generate default message based on type
    let defaultMessage = '';

    switch (type) {
      case 'follow':
        defaultMessage = `${actorName} started following you`;
        break;
      case 'like':
        defaultMessage = `${actorName} liked your post`;
        break;
      case 'comment':
        defaultMessage = `${actorName} commented on your post`;
        break;
      case 'message':
        defaultMessage = `You received a message from ${actorName}`;
        break;
      case 'service':
        defaultMessage = `Your service has a new interaction`;
        break;
      case 'booking':
        defaultMessage = `You have a new booking notification`;
        break;
      case 'review':
        defaultMessage = `${actorName} left a review on your service`;
        break;
      case 'mention':
        defaultMessage = `${actorName} mentioned you in a post`;
        break;
      default:
        defaultMessage = 'You have a new notification';
    }

    // Insert notification into database
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: actorId || null,
        actor_name: actorName,
        message: message || defaultMessage,
        type,
        entity_id: entityId || null,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating notification:', error);
    }

    return !error;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    return !error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    if (!userId) return 0;
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error('Error counting unread notifications:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
}

/**
 * Get count of unread messages for a user
 */
export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    if (!userId) return 0;
    
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);
    
    if (error) {
      console.error('Error counting unread messages:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error getting unread messages count:', error);
    return 0;
  }
} 