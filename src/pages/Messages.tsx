
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Search, Send } from "lucide-react";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface Chat {
  profile: Profile;
  lastMessage: Message;
}

export default function Messages() {
  const [activeTab, setActiveTab] = useState("Messages");
  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [newMessage, setNewMessage] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
    }
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!receiver_id (
            id,
            username,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by chat participant
      const chatMap = new Map<string, Chat>();
      messages?.forEach(message => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        if (!chatMap.has(otherUserId)) {
          chatMap.set(otherUserId, {
            profile: message.profiles,
            lastMessage: message
          });
        }
      });

      setChats(Array.from(chatMap.values()));
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: "Error",
        description: "Failed to load chats",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          receiver_id: selectedChat
        });

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedChat);
      fetchChats(); // Refresh chat list to update last message
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72 pb-24 xl:pb-0">
        <MobileHeader />
        
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] py-8 px-4">
          <Card className="h-full bg-black/20 border-white/5 grid grid-cols-1 md:grid-cols-[300px,1fr]">
            {/* Chat List */}
            <div className="border-r border-white/10">
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                  <Input
                    placeholder="Search messages..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2 p-2">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5 animate-pulse h-16" />
                  ))
                ) : chats.map((chat) => (
                  <button
                    key={chat.profile.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left
                      ${selectedChat === chat.profile.id ? 'bg-white/10' : ''}`}
                    onClick={() => setSelectedChat(chat.profile.id)}
                  >
                    <Avatar>
                      <img 
                        src={chat.profile.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                        alt={chat.profile.username || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{chat.profile.username || 'Anonymous'}</h3>
                      <p className="text-sm text-white/60 truncate">{chat.lastMessage.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col h-full">
              {selectedChat ? (
                <>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === selectedChat ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[80%] ${message.sender_id === selectedChat ? 'bg-white/5' : 'bg-white/10'} rounded-lg p-3`}>
                          <p>{message.content}</p>
                          <span className="text-xs text-white/40 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-white/10">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button onClick={sendMessage}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/40">
                  Select a chat to start messaging
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
