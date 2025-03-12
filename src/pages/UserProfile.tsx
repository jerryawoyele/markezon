import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Post } from "@/components/home/Post";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { ServiceModal } from "@/components/services/ServiceModal";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "@/components/services/ServiceCard";
import { useToast } from "@/components/ui/use-toast";
import { Star, Users, FileImage, MessageSquare, Share2, ShoppingCart } from "lucide-react";
import type { Profile as ProfileType, Post as PostType } from "@/types";
import { AuthRequiredModal } from "@/components/auth/AuthRequiredModal";
import { FollowersModal } from "@/components/profile/FollowersModal";
import { FollowingModal } from "@/components/profile/FollowingModal";
import { ReviewsModal } from "@/components/profile/ReviewsModal";
import { MainLayout } from "@/layouts/MainLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createNotification } from '@/utils/notification-helper';
import { Badge } from "@/components/ui/badge";

// Define ServiceType locally since it's not exported from @/types
interface ServiceType {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url?: string;
  owner_id: string;
  created_at: string;
}

export function UserProfile() {
  const { username, userId, postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Discover");
  const [activeProfileTab, setActiveProfileTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingFollowStatus, setLoadingFollowStatus] = useState(false);
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Use effect to check for tab parameter in URL and set the active tab
  useEffect(() => {
    // Get the 'tab' query parameter from the URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    
    // If tab parameter exists and is valid, set it as the active tab
    if (tabParam === 'services' || tabParam === 'posts') {
      setActiveProfileTab(tabParam);
    }
  }, [location.search]);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsAuthenticated(true);
          setCurrentUser(session.user.id);
          
          // Fetch current user role from profiles table
          const { data: currentUserData, error: roleError } = await supabase
            .from('profiles')
            .select('*')  // Select all columns to avoid specific column errors
            .eq('id', session.user.id)
            .single();
            
          if (!roleError && currentUserData) {
            try {
              // Check if user_role exists in the data
              if ('user_role' in currentUserData) {
                // Safely cast the type
                const role = currentUserData.user_role as string;
                setCurrentUserRole(role);
              } else {
                // Default to customer if no role specified
                setCurrentUserRole("customer");
                console.warn("user_role field not found in profiles table");
              }
            } catch (err) {
              console.error("Error parsing user role:", err);
              setCurrentUserRole("customer"); // Default fallback
            }
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };
    
    checkAuth();
  }, []);
  
  // Check if the current user is following this profile
  const checkFollowStatus = async () => {
    if (!profile || !currentUser) return;
    
    try {
      setLoadingFollowStatus(true);
      
      try {
        // Use the Supabase URL and key directly from the client file
        const supabaseUrl = "https://zrjgcanxtojemyknzfgl.supabase.co";
        const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyamdjYW54dG9qZW15a256ZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNTY1NjMsImV4cCI6MjA1NTkzMjU2M30.fUzRKtbcoYU6SXhB3FM2gXtn2NhI9427-U6eAF5yDdE";
        
        // Get auth session for authorization header
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        // Add authorization header if we have a session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        console.log(`Checking follow status: ${currentUser} following ${profile.id}`);
        
        const response = await fetch(
          `${supabaseUrl}/rest/v1/follows?follower_id=eq.${currentUser}&following_id=eq.${profile.id}&select=id`,
          { headers }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const followData = await response.json();
        console.log("Follow status check result:", followData);
        setIsFollowing(followData && followData.length > 0);
      } catch (error) {
        console.error("Error checking follow status:", error);
        setIsFollowing(false);
      }
      
      setLoadingFollowStatus(false);
    } catch (error) {
      console.error("Error in checkFollowStatus:", error);
      setLoadingFollowStatus(false);
    }
  };

  // Load user's posts and services
  const loadContent = async () => {
    try {
      // Set loading state for posts
      setLoadingPosts(true);
      
      // Fetch the posts for this profile
      const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
          profiles (*)
          `)
        .eq('user_id', profile?.id)
          .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setUserPosts(data as unknown as PostType[]);
      }
      
      // Fetch services if business user
      if (profile?.user_role === "business") {
        setLoadingServices(true);
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('owner_id', profile?.id)
          .order('created_at', { ascending: false });
          
        if (servicesError) {
          console.error("Error fetching services:", servicesError);
        } else {
          setServices(servicesData as any[]);
        }
        setLoadingServices(false);
      }
      
      // If we need to scroll to a specific post
      if (postId) {
        setTimeout(() => {
          const postElement = postRefs.current[postId];
          if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postElement.classList.add('highlight-post');
            
            // Remove highlight after animation
            setTimeout(() => {
              postElement.classList.remove('highlight-post');
            }, 2000);
          }
        }, 500);
      }
      
      // Loading complete
      setLoadingPosts(false);
      setLoading(false);
    } catch (err) {
      console.error("Error loading content:", err);
      setLoadingPosts(false);
      setLoading(false);
    }
  };

  // Fetch profile
  const getProfile = async () => {
    try {
      setLoadingProfile(true);
      
      let idOrUsername = userId;
      
      // If we don't have a userId but we have a postId, we need to fetch the post first
      if (!userId && postId) {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();
          
        if (postError || !postData) {
          console.error("Error fetching post:", postError);
          navigate('/404');
          return;
        }
        
        idOrUsername = postData.user_id;
      }
      
      // First try to fetch via profileId or username
        const { data, error } = await supabase
        .from('profiles')
          .select('*')
        .or(`id.eq.${idOrUsername},username.eq.${idOrUsername}`)
        .single();
        
      if (error || !data) {
        console.error("Error fetching profile:", error);
        
        // Supabase query might fail for security reasons, try a direct fetch
        const fetchProfileDirectly = async (idOrUsername, isUsername = false) => {
          try {
            const field = isUsername ? 'username' : 'id';
            // Use a different approach to avoid direct access to protected properties
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?${field}=eq.${encodeURIComponent(idOrUsername)}&select=*`, {
              headers: {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            
            console.log(`Fetching profile directly with ${field}:`, idOrUsername);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const profiles = await response.json();
            
            if (profiles && profiles.length > 0) {
              setProfile(profiles[0] as ProfileType);
              return profiles[0];
            } else {
              console.error("No profile found with direct fetch");
              navigate('/404');
              return null;
            }
          } catch (fetchError) {
            console.error("Error with direct fetch:", fetchError);
            navigate('/404');
            return null;
          }
        };
        
        // Try first as ID, then as username
        let profile = await fetchProfileDirectly(idOrUsername, false);
        
        if (!profile) {
          profile = await fetchProfileDirectly(idOrUsername, true);
        }
        
        if (!profile) {
          return; // We've already navigated to 404
        }
      } else {
        setProfile(data as ProfileType);
      }
      
      setLoadingProfile(false);
    } catch (error) {
      console.error("Error in getProfile:", error);
      navigate('/404');
    }
  };
  
  // Effect to load profile data
  useEffect(() => {
    getProfile();
  }, [username, userId]);
  
  // Effect to check follow status when profile or current user changes
  useEffect(() => {
    if (profile && currentUser && !isOwnProfile) {
      console.log("Checking follow status for profile", profile.id, "and currentUser", currentUser);
    checkFollowStatus();
    }
  }, [profile, currentUser, isOwnProfile]);
  
  // Effect to load posts and services after profile is loaded
  useEffect(() => {
    if (profile) {
      loadContent();
    }
  }, [profile, postId]);
  
  // Add this function to fetch bookings for the customer
  const fetchBookings = async () => {
    if (!profile?.id || profile?.user_role !== "customer") return;

    try {
      setLoadingBookings(true);
      
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      // Only fetch bookings if viewing our own profile and we're a customer
      if (session.user.id !== profile.id) {
        setLoadingBookings(false);
        return;
      }
      
      try {
        // Use the supabase client instead of direct fetch
        const { data: bookingsData, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (bookingsData && bookingsData.length > 0) {
          // Extract service IDs and provider IDs
          const serviceIds = bookingsData.map(booking => booking.service_id).filter(Boolean);
          const providerIds = bookingsData.map(booking => booking.provider_id).filter(Boolean);
          
          // Fetch services data
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('id, title, price, category, image')
            .in('id', serviceIds);
            
          if (servicesError) console.error("Error fetching services:", servicesError);
          
          // Fetch providers data
          const { data: providersData, error: providersError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', providerIds);
            
          if (providersError) console.error("Error fetching providers:", providersError);
          
          // Create lookup tables
          const servicesMap = (servicesData || []).reduce((acc, service) => {
            acc[service.id] = service;
            return acc;
          }, {});
          
          const providersMap = (providersData || []).reduce((acc, provider) => {
            acc[provider.id] = provider;
            return acc;
          }, {});
          
          // Join the data
          const bookingsWithRelations = bookingsData.map(booking => ({
            ...booking,
            services: servicesMap[booking.service_id] || { title: 'Unknown Service', price: 'N/A', category: 'Unknown' },
            providers: providersMap[booking.provider_id] || { username: 'Unknown Provider', avatar_url: null }
          }));
          
          setBookings(bookingsWithRelations);
        } else {
          setBookings([]);
        }
      } catch (fetchError) {
        console.error("API fetch error:", fetchError);
        toast({
          variant: "destructive",
          title: "Error loading bookings",
          description: "Could not load your bookings. Please try again later.",
        });
        setBookings([]);
      }
      
      setLoadingBookings(false);
    } catch (error) {
      console.error("Error in fetchBookings:", error);
      setLoadingBookings(false);
    }
  };

  // Update the existing useEffect to call fetchBookings when appropriate
  useEffect(() => {
    if (profile) {
      loadContent();
      
      // If viewing own profile and user is a customer, fetch bookings
      if (currentUser === profile.id && profile.user_role === "customer") {
        fetchBookings();
      }
    }
  }, [profile, postId, currentUser]);
  
  const requireAuth = (callback: Function) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    callback();
  };
  
  const handleServiceClick = (service: ServiceType) => {
    requireAuth(() => {
      setSelectedService(service);
      setShowServiceModal(true);
    });
  };
  
  const handleShareProfile = () => {
    const currentUrl = window.location.href;
    
    // If we're on /profile, generate the /user/{userId} URL instead
    const shareUrl = window.location.pathname === "/profile" 
      ? `${window.location.origin}/user/${profile?.id}`
      : currentUrl;
    
    if (navigator.share) {
      navigator.share({
        title: `${profile?.username || 'User'}'s Profile`,
        url: shareUrl
      }).catch(error => console.log('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          toast({
            title: "Link Copied!",
            description: "Profile link copied to clipboard",
          });
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          toast({
            title: "Error",
            description: "Failed to copy link",
            variant: "destructive",
          });
        });
    }
  };
  
  const handleMessage = () => {
    requireAuth(() => {
      navigate(`/messages?user=${profile?.id}`);
    });
  };
  
  // Add function to handle booking cancellation
  const handleCancelBooking = async (bookingId: string) => {
    try {
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          variant: "destructive",
          title: "Not logged in",
          description: "You need to be logged in to cancel bookings.",
        });
        return;
      }
      
      // Use Supabase client instead of direct fetch
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );
      
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        variant: "destructive",
        title: "Cancellation failed",
        description: "There was an error cancelling your booking. Please try again.",
      });
    }
  };
  
  // Handle follow/unfollow button click
  const handleFollow = () => {
    requireAuth(async () => {
      try {
        // Set loading state first
        setLoadingFollowStatus(true);
        
        // Use the Supabase URL and key directly from the client file
        const supabaseUrl = "https://zrjgcanxtojemyknzfgl.supabase.co";
        const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyamdjYW54dG9qZW15a256ZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNTY1NjMsImV4cCI6MjA1NTkzMjU2M30.fUzRKtbcoYU6SXhB3FM2gXtn2NhI9427-U6eAF5yDdE";
        
        // Get auth session for authorization header
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=minimal'
        };
        
        // Add authorization header if we have a session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
          toast({
            title: "Error",
            description: "You must be logged in to follow users",
            variant: "destructive"
          });
          setLoadingFollowStatus(false);
          return;
        }
        
        if (isFollowing) {
          // Unfollow logic - use REST API directly
          console.log(`Unfollowing: ${currentUser} unfollows ${profile?.id}`);
          const response = await fetch(
            `${supabaseUrl}/rest/v1/follows?follower_id=eq.${currentUser}&following_id=eq.${profile?.id}`,
            {
              method: 'DELETE',
              headers
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
          // Follow logic - use REST API directly
          console.log(`Following: ${currentUser} follows ${profile?.id}`);
          const response = await fetch(
            `${supabaseUrl}/rest/v1/follows`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                follower_id: currentUser,
                following_id: profile?.id
              })
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // Create a notification for the user being followed
          if (profile?.id && currentUser) {
            // Get current user's profile info to use in notification
            const { data: currentUserProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', currentUser)
              .single();
            
            const username = currentUserProfile?.username || 'Someone';
            
            // Create the follow notification
            await createNotification({
              userId: profile.id,
              actorId: currentUser,
              actorName: username,
              type: 'follow',
              message: `${username} started following you`
            });
          }
        }
        
        // Toggle follow status immediately for better UX
        const newFollowStatus = !isFollowing;
        setIsFollowing(newFollowStatus);
        
        // Update followers count in the UI
        if (profile) {
          const updatedProfile = {
            ...profile,
            followers_count: newFollowStatus
              ? (profile.followers_count || 0) + 1
              : Math.max((profile.followers_count || 0) - 1, 0) // Prevent negative counts
          };
          setProfile(updatedProfile as ProfileType);
        }
        
        // Finish loading
        setLoadingFollowStatus(false);
        
        // Show success message
        toast({
          title: newFollowStatus ? "Followed" : "Unfollowed",
          description: newFollowStatus 
            ? `You are now following ${profile?.username}` 
            : `You have unfollowed ${profile?.username}`,
        });
      } catch (error) {
        console.error("Error updating follow status:", error);
        setLoadingFollowStatus(false);
        toast({
          title: "Error",
          description: "Failed to update follow status",
          variant: "destructive"
        });
      }
    });
  };
  
  if (loading && !profile) {
    return (
      <MainLayout 
        activeTab="" 
        setActiveTab={() => {}} 
        userRole={currentUserRole as any} 
        isAuthenticated={isAuthenticated}
      >
        <div className="flex-1 min-h-screen flex flex-col justify-center items-center">
          <div className="w-16 h-16 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }
  
  if (!profile && !loadingProfile) {
    return (
      <MainLayout 
        activeTab="" 
        setActiveTab={() => {}} 
        userRole={currentUserRole as any} 
        isAuthenticated={isAuthenticated}
      >
        <div className="flex-1 min-h-screen flex justify-center items-center">
          <div className="text-center max-w-md mx-auto p-8 bg-black/20 rounded-lg border border-white/10">
            <h2 className="text-xl font-semibold mb-4">User not found</h2>
            <p className="text-white/60 mb-6">The user you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/discover')}>
              Discover Users
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  console.log("Rendering profile with isOwnProfile:", isOwnProfile, "Current user:", currentUser);
  
  return (
    <MainLayout 
      activeTab="" 
      setActiveTab={() => {}} 
      userRole={currentUserRole as any} 
      isAuthenticated={isAuthenticated}
    >
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl py-8 px-4">
          {/* Profile header with skeleton loader */}
          <Card className="rounded-lg overflow-hidden mb-8">
            {loadingProfile ? (
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-4">
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-24 w-24 border-2 border-white/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>{profile?.username?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                    <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                      <div>
                        <h1 className="text-2xl font-bold mb-1">
                          {profile?.username}
                        </h1>
                        <p className="text-white/60 mb-3">{profile?.bio}</p>
                      </div>
                      
                  <div className="flex gap-2">
                        {currentUser !== profile?.id && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleMessage}
                              className="flex items-center gap-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Message
                            </Button>
                            
                        <Button 
                          onClick={handleFollow}
                              size="sm"
                              disabled={loadingFollowStatus}
                              className={cn(
                                "relative",
                                isFollowing ? "bg-white/10 hover:bg-white/20 text-white" : ""
                              )}
                            >
                              {loadingFollowStatus ? (
                                <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" />
                              ) : (
                                isFollowing ? "Following" : "Follow"
                              )}
                        </Button>
                          </>
                        )}
                        
                        <Button 
                          onClick={handleShareProfile} 
                          size="sm" 
                          variant="ghost"
                          className="text-primary/70 hover:text-primary hover:bg-primary/10"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                  </div>
                </div>
                
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FileImage className="h-4 w-4 text-white/60" />
                          <span className="font-semibold">{userPosts.length}</span>
                        </div>
                        <p className="text-xs text-white/60">Posts</p>
                  </div>
                      
                      <div 
                        className="bg-black/20 rounded-lg p-3 cursor-pointer hover:bg-black/30 transition"
                        onClick={() => setShowFollowersModal(true)}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Users className="h-4 w-4 text-white/60" />
                          <span className="font-semibold">{profile?.followers_count || 0}</span>
                  </div>
                        <p className="text-xs text-white/60">Followers</p>
                  </div>
                      
                      <div 
                        className="bg-black/20 rounded-lg p-3 cursor-pointer hover:bg-black/30 transition"
                        onClick={() => setShowFollowingModal(true)}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Users className="h-4 w-4 text-white/60" />
                          <span className="font-semibold">{profile?.following_count || 0}</span>
                  </div>
                        <p className="text-xs text-white/60">Following</p>
                </div>
                
                      {profile?.user_role === "business" && (
                        <div className="bg-black/20 rounded-lg p-3">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="h-4 w-4 text-white/60" />
                            <span className="font-semibold">{profile?.reviews_rating?.toFixed(1) || '0.0'}</span>
                          </div>
                          <p className="text-xs text-white/60">Rating ({profile?.reviews_count || 0})</p>
              </div>
                      )}
            </div>
            
            {profile?.user_role === "business" && profile?.about_business && (
                      <div className="mt-4 p-4 bg-black/10 rounded-lg">
                        <h3 className="font-medium mb-2">About Business</h3>
                <p className="text-sm text-white/80">{profile.about_business}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
          
          {/* Tabs for Posts and Services */}
          <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              {profile?.user_role === "business" ? (
                <TabsTrigger value="services">Services</TabsTrigger>
              ) : (
                profile?.id === currentUser && (
                  <TabsTrigger value="bookings">Bookings</TabsTrigger>
                )
              )}
            </TabsList>
            
            <TabsContent value="posts" className="mt-0">
              <div className="grid gap-4 md:gap-6 max-w-4xl mx-auto">
                {loadingPosts ? (
                  // Post skeletons
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="w-full rounded-lg overflow-hidden">
                      <div className="p-4 bg-black/20 flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-64 w-full" />
                      <div className="p-4 bg-black/20 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <div 
                      key={post.id} 
                      ref={el => postRefs.current[post.id] = el}
                      className={`transition-all duration-300 ${
                        postId === post.id ? '' : ''
                      }`}
                    >
                      <Post
                        {...post}
                        profiles={post.profiles} 
                        currentUserId={async () => currentUser}
                        isAuthenticated={isAuthenticated}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                  <Card className="p-8 text-center">
                      <p className="mb-4">No posts yet</p>
                  </Card>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="services" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingServices ? (
                  // Service skeletons
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="rounded-lg overflow-hidden">
                      <Skeleton className="aspect-video w-full" />
                      <div className="p-4 bg-black/20 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  ))
                ) : services.length > 0 ? (
                  services.map((service) => (
                      <ServiceCard 
                        key={service.id} 
                        service={service} 
                        onClick={() => handleServiceClick(service)}
                      />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                  <Card className="p-8 text-center">
                      <p className="mb-4">No services listed yet</p>
                  </Card>
                  </div>
                )}
              </div>
              </TabsContent>
            
            <TabsContent value="bookings" className="mt-0">
              <Card>
                <CardContent className="p-6">
                  {loadingBookings ? (
                    // Bookings skeleton
                    <div className="space-y-4">
                      {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg animate-pulse">
                          <div className="flex justify-between">
                            <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                            <div className="h-5 bg-gray-300 rounded w-1/4"></div>
                          </div>
                          <div className="h-4 bg-gray-300 rounded w-1/2 mt-2"></div>
                          <div className="h-10 bg-gray-300 rounded w-full mt-4"></div>
                        </div>
                      ))}
                    </div>
                  ) : bookings.length > 0 ? (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden">
                          <CardHeader className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <ShoppingCart className="h-4 w-4" />
                                  <h3 className="font-medium">{booking.services.title}</h3>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  <p>Provider: {booking.providers.username}</p>
                                  <p>Price: ${booking.services.price}</p>
                                  <p>Booked on: {new Date(booking.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <Badge variant={
                                booking.status === 'completed' ? 'default' :
                                booking.status === 'pending' ? 'secondary' :
                                booking.status === 'cancelled' ? 'destructive' :
                                booking.status === 'confirmed' ? 'outline' : 'default'
                              }>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardFooter className="p-4 bg-muted/20 flex justify-end gap-2">
                            {["pending", "confirmed"].includes(booking.status) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                Cancel Booking
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/messages?user=${booking.provider_id}`)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message Provider
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p>You don't have any service bookings yet.</p>
                      <Button 
                        onClick={() => navigate('/discover')} 
                        className="mt-4"
                      >
                        Discover Services
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Modals */}
          <AuthRequiredModal 
            isOpen={showAuthModal} 
            setIsOpen={setShowAuthModal}
            message="You need to sign in to interact with this profile."
          />
          
          {profile && (
            <>
              <FollowersModal 
                userId={profile.id}
                isOpen={showFollowersModal}
                onClose={() => setShowFollowersModal(false)}
                currentUserId={currentUser}
              />
              
              <FollowingModal
                userId={profile.id}
                isOpen={showFollowingModal}
                onClose={() => setShowFollowingModal(false)}
                currentUserId={currentUser}
              />
            </>
          )}
        </div>
      </div>
      
      {selectedService && (
        <ServiceModal
          service={selectedService}
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
        />
      )}
      
      {profile && (
        <>
          <ReviewsModal 
            isOpen={showReviewsModal}
            onClose={() => setShowReviewsModal(false)}
            userId={profile.id}
            currentUserId={currentUser}
          />
        </>
      )}
    </MainLayout>
  );
}
