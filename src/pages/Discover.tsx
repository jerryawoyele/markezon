import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Post } from "@/components/home/Post";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MainLayout } from "@/layouts/MainLayout";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AuthRequiredModal } from "@/components/auth/AuthRequiredModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchUsers } from "@/components/home/SearchUsers";
import { TrendingServices } from "@/components/home/TrendingServices";
import { Skeleton } from "@/components/ui/skeleton";

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function Discover() {
  const [activeTab, setActiveTab] = useState("Discover");
  const [posts, setPosts] = useState<Post[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<"business" | "customer" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetchUserRole();
  }, []);

  const checkAuthAndFetchUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')  // Select all columns to avoid specific column errors
          .eq('id', session.user.id)
          .single();
          
        if (!error && data) {
          // Check if user_role exists in the data
          if ('user_role' in data) {
            setUserRole(data.user_role as "business" | "customer");
          } else {
            // Default to customer if no role specified
            setUserRole("customer");
            console.warn("user_role field not found in profiles table");
          }
        }
      } else {
        setIsAuthenticated(false);
      }
      
      setInitialLoading(false);
      fetchPosts();
    } catch (error) {
      console.error("Error checking auth:", error);
      setInitialLoading(false);
      fetchPosts();
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(24);
        
      if (error) throw error;
      
      if (data) {
        // Add a small delay to make loading more obvious for better UX
        setTimeout(() => {
          setPosts(data);
          setLoadingPosts(false);
        }, 300);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setLoadingPosts(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCardClick = (post: Post, index: number) => {
    setSelectedPostIndex(index);
    setShowPostModal(true);
  };

  const handleUserClick = (userId: string) => {
    window.location.href = `/user/${userId}`;
  };

  const getPostPreviewContent = (post: Post) => {
    try {
      const { image_url, caption } = post;
      
      // Check if the image_url is a stringified array
      if (image_url && image_url.startsWith('[') && image_url.endsWith(']')) {
        try {
          const images = JSON.parse(image_url);
          if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
            return { type: 'image', url: images[0] };
          }
        } catch (e) {
          console.log('Error parsing JSON image array:', e);
        }
      }
      
      // Check if it's a direct image URL (starts with http and common image extensions)
      if (image_url && (
          image_url.startsWith('http') && (
            image_url.toLowerCase().endsWith('.jpg') ||
            image_url.toLowerCase().endsWith('.jpeg') ||
            image_url.toLowerCase().endsWith('.png') ||
            image_url.toLowerCase().endsWith('.gif') ||
            image_url.toLowerCase().endsWith('.webp') ||
            image_url.includes('images.unsplash.com') ||
            image_url.includes('cloudinary.com') ||
            image_url.includes('storage.googleapis.com')
          )
      )) {
        return { type: 'image', url: image_url };
      }
      
      // Check if it's a data URL
      if (image_url && image_url.startsWith('data:image/')) {
        return { type: 'image', url: image_url };
      }
      
      // Default to text post
      return { type: 'text', content: caption || 'No caption' };
    } catch (e) {
      // If any error occurs, default to text post
      console.error('Error processing post preview:', e);
      return { type: 'text', content: post.caption || 'No caption' };
    }
  };

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    // Actual like logic would go here
  };

  const handleComment = async (postId: string, comment: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    // Actual comment logic would go here
  };

  const handleShare = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    // Actual share logic would go here
  };

  const isTextPost = (post: Post) => {
    const preview = getPostPreviewContent(post);
    return preview.type === 'text';
  };

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} isAuthenticated={isAuthenticated}>
      {initialLoading ? (
        // Page-specific loading screen
        <div className="flex-1 min-h-screen flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 pt-4 pb-20 px-4">
            <div className="flex flex-col gap-6">
              <div className="flex-1 flex flex-col gap-6">
                {/* Search skeleton */}
                <div className="w-full h-16 bg-black/20 rounded-lg animate-pulse" />
                
                {/* Grid skeletons */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array(12).fill(0).map((_, i) => (
                    <div key={i} className="aspect-square bg-black/20 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <MobileHeader />
          
          <div className="flex flex-col gap-8">
            <div className="flex-1">
              <div className="relative mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                  <Input
                    placeholder="Search posts and users..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="pl-10 bg-black/20 w-full"
                  />
                </div>
                <SearchUsers searchQuery={searchQuery} isAuthenticated={isAuthenticated} />
              </div>
              
              {/* Grid of posts */}
              {loadingPosts ? (
                // Grid loading skeleton
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array(12).fill(0).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {posts.map((post, index) => {
                    const preview = getPostPreviewContent(post);
                    
                    if (preview.type === 'image') {
                      // Image post preview
                      return (
                        <div 
                          key={post.id}
                          className="aspect-square bg-black/20 overflow-hidden relative rounded-lg cursor-pointer group"
                          onClick={() => handleCardClick(post, index)}
                        >
                          <img
                            src={preview.url}
                            alt={post.caption || "Post"}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Error';
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 border border-white/20">
                                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                                <AvatarFallback>{post.profiles?.username?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate">{post.profiles?.username || 'User'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Text post preview
                      return (
                        <div 
                          key={post.id}
                          className="aspect-square bg-gradient-to-br from-gray-900 to-black overflow-hidden flex items-center justify-center p-4 rounded-lg cursor-pointer transform transition hover:scale-105"
                          onClick={() => handleCardClick(post, index)}
                        >
                          <p className="text-lg font-medium line-clamp-6 text-center">
                            {preview.content}
                          </p>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 border border-white/20">
                                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                                <AvatarFallback>{post.profiles?.username?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate">{post.profiles?.username || 'User'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Post Modal */}
          {showPostModal && (
            <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
              <DialogContent className="sm:max-w-[650px] bg-black/90 border-white/10 h-[90vh] max-h-[90vh] p-0">
                <ScrollArea className="h-full max-h-[90vh] px-4 py-2">
                  {posts.slice(selectedPostIndex).map((post) => (
                    <div key={post.id} className="mb-6">
                      <Post 
                        {...post} 
                        profiles={post.profiles} 
                        currentUserId={async () => {
                          const { data } = await supabase.auth.getUser();
                          return data.user?.id || null;
                        }}
                        isAuthenticated={isAuthenticated}
                        onLike={handleLike}
                        onComment={handleComment}
                        onShare={handleShare}
                      />
                    </div>
                  ))}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Auth Modal */}
          <AuthRequiredModal 
            isOpen={showAuthModal} 
            setIsOpen={setShowAuthModal}
            message="You need to sign in to interact with posts."
          />
        </div>
      )}
    </MainLayout>
  );
}
