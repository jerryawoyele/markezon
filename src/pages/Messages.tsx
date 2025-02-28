
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
  read: boolean;
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export default function Messages() {
  const [activeTab, setActiveTab] = useState("Messages");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        fetchContacts();
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedChat && currentUser) {
      fetchMessages(selectedChat);
    }
  }, [selectedChat, currentUser]);

  const fetchContacts = async () => {
    try {
      // First, check if any profiles exist
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser || '')
        .limit(10);

      if (error) throw error;
      setContacts(profiles || []);
      
      // Select the first contact by default if available
      if (profiles && profiles.length > 0 && !selectedChat) {
        setSelectedChat(profiles[0].id);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentUser})`)
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
    if (!newMessage.trim() || !selectedChat || !currentUser) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: currentUser,
          receiver_id: selectedChat
        });

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedChat);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.username || 'Anonymous';
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
                ) : contacts.length > 0 ? (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left
                        ${selectedChat === contact.id ? 'bg-white/10' : ''}`}
                      onClick={() => setSelectedChat(contact.id)}
                    >
                      <Avatar>
                        <img 
                          src={contact.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                          alt={contact.username || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{contact.username || 'Anonymous'}</h3>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-white/60 text-center">No contacts found</div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col h-full">
              {selectedChat ? (
                <>
                  <div className="p-3 border-b border-white/10">
                    <h2 className="font-medium">{getContactName(selectedChat)}</h2>
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.length > 0 ? (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id !== currentUser ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[80%] ${message.sender_id !== currentUser ? 'bg-white/5' : 'bg-white/10'} rounded-lg p-3`}>
                            <p>{message.content}</p>
                            <span className="text-xs text-white/40 mt-1">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-white/40 py-4">
                        No messages yet. Send a message to start a conversation.
                      </div>
                    )}
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
