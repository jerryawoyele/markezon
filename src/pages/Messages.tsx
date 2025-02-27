
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Search, Send } from "lucide-react";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isMe: boolean;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

const CHATS: Chat[] = [
  {
    id: "1",
    name: "John Doe",
    avatar: "https://source.unsplash.com/100x100/?portrait",
    lastMessage: "Hey, are you available for a project?",
    timestamp: "2m ago",
    unread: 2,
  },
  {
    id: "2",
    name: "Jane Smith",
    avatar: "https://source.unsplash.com/100x100/?woman",
    lastMessage: "The design looks great!",
    timestamp: "1h ago",
    unread: 0,
  },
];

const MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hey, are you available for a project?",
    sender: "John Doe",
    timestamp: "2:30 PM",
    isMe: false,
  },
  {
    id: "2",
    text: "Yes, I am! What kind of project do you have in mind?",
    sender: "Me",
    timestamp: "2:31 PM",
    isMe: true,
  },
];

export default function Messages() {
  const [activeTab, setActiveTab] = useState("Messages");
  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [newMessage, setNewMessage] = useState("");

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
                {CHATS.map((chat) => (
                  <button
                    key={chat.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left
                      ${selectedChat === chat.id ? 'bg-white/10' : ''}`}
                    onClick={() => setSelectedChat(chat.id)}
                  >
                    <Avatar>
                      <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{chat.name}</h3>
                        <span className="text-xs text-white/60">{chat.timestamp}</span>
                      </div>
                      <p className="text-sm text-white/60 truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <span className="bg-white text-background text-xs px-2 py-1 rounded-full">
                        {chat.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col h-full">
              {selectedChat ? (
                <>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {MESSAGES.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${message.isMe ? 'bg-white/10' : 'bg-white/5'} rounded-lg p-3`}>
                          <p>{message.text}</p>
                          <span className="text-xs text-white/40 mt-1">{message.timestamp}</span>
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
                      />
                      <Button>
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
