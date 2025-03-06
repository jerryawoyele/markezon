
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

interface SearchResult {
  id: string;
  type: "post" | "user";
  title: string;
  subtitle?: string;
  image_url?: string;
  username?: string;
}

interface SearchDropdownProps {
  searchQuery: string;
  show: boolean;
  onClose: () => void;
}

export function SearchDropdown({ searchQuery, show, onClose }: SearchDropdownProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchQuery && show) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, show]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Search for posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          image_url,
          profiles:user_id (username)
        `)
        .ilike('caption', `%${searchQuery}%`)
        .limit(3);

      if (postsError) throw postsError;

      // Search for users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url
        `)
        .ilike('username', `%${searchQuery}%`)
        .limit(3);

      if (usersError) throw usersError;

      // Combine results
      const postResults: SearchResult[] = posts?.map(post => ({
        id: post.id,
        type: "post",
        title: post.caption || "Untitled Post",
        subtitle: `By ${post.profiles?.username || "Anonymous"}`,
        image_url: post.image_url
      })) || [];

      const userResults: SearchResult[] = users?.map(user => ({
        id: user.id,
        type: "user",
        title: user.username || "Anonymous",
        image_url: user.avatar_url || undefined,
        username: user.username || undefined
      })) || [];

      setResults([...userResults, ...postResults]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onClose();
    if (result.type === "post") {
      // Navigate to post detail
      // For now just show notification since we don't have a post detail page yet
      alert(`Viewing post: ${result.title}`);
    } else {
      // Navigate to user profile - use new @username format if username is available
      if (result.username) {
        navigate(`/@${result.username}`);
      } else {
        navigate(`/user/${result.id}`);
      }
    }
  };

  if (!show) return null;

  return (
    <Card 
      ref={dropdownRef} 
      className="absolute top-full mt-1 w-full bg-black/90 border-white/10 z-50 max-h-80 overflow-y-auto"
    >
      {loading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin text-white/60" />
          <span className="ml-2">Searching...</span>
        </div>
      ) : results.length > 0 ? (
        <div className="py-2">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 transition-colors"
              onClick={() => handleResultClick(result)}
            >
              {result.type === "user" ? (
                <Avatar>
                  <img 
                    src={result.image_url || "https://source.unsplash.com/100x100/?portrait"} 
                    alt={result.title} 
                    className="w-full h-full object-cover"
                  />
                </Avatar>
              ) : (
                <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
                  {result.image_url && (
                    <img 
                      src={result.image_url} 
                      alt={result.title} 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
              <div>
                <div className="font-medium">{result.title}</div>
                {result.subtitle && (
                  <div className="text-xs text-white/60">{result.subtitle}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-4 text-center text-white/60">
          No results found for "{searchQuery}"
        </div>
      )}
    </Card>
  );
}
