import { Card } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { SearchUsers } from "./SearchUsers";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface TrendingService {
  id: string;
  title: string;
  category: string;
  description: string;
  engagement_score: number;
  user_id?: string;
  owner_id?: string;
  profile?: {
    username: string;
    avatar_url: string;
  };
}

export function TrendingServices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [trendingServices, setTrendingServices] = useState<TrendingService[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrendingServices();
  }, []);

  // Handle clicks outside to close search results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If click was not on search bar or results, close results
      if (!target.closest('.search-container') && showResults) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults]);

  const fetchTrendingServices = async () => {
    setLoading(true);
    try {
      // Get trending services directly without trying to join with profiles
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (servicesError) throw servicesError;
      
      if (!servicesData || servicesData.length === 0) {
        // No services at all in the database
        setTrendingServices([]);
        setLoading(false);
        return;
      }
      
      // Extract user IDs from services, handling both column names
      const userIds: string[] = [];
      servicesData.forEach(service => {
        // Try to get the owner ID from either column
        const ownerId = 'owner_id' in service 
          ? (service as any).owner_id 
          : (service as any).user_id;
          
        if (ownerId) {
          userIds.push(ownerId);
        }
      });
      
      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];
      
      let profilesMap: Record<string, any> = {};
      
      if (uniqueUserIds.length > 0) {
        try {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', uniqueUserIds);
            
          if (profilesData) {
            // Create a map of user IDs to profile data
            profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, any>);
          }
        } catch (profileError) {
          console.log('Error fetching profiles:', profileError);
        }
      }
      
      // Apply a default engagement score based on recency and add profile data
      const servicesWithEngagement = servicesData.map((service, index) => {
        // Get the owner ID from either column
        const ownerId = 'owner_id' in service 
          ? (service as any).owner_id 
          : (service as any).user_id;
          
        // Get the profile for this owner
        const profile = ownerId && profilesMap[ownerId] 
          ? {
              username: profilesMap[ownerId].username || 'Business',
              avatar_url: profilesMap[ownerId].avatar_url || ''
            }
          : {
              username: 'Business',
              avatar_url: ''
            };
            
        return {
          ...service,
          engagement_score: 100 - index, // Just for display purposes
          profile,
          // Ensure we have both IDs for compatibility
          owner_id: ownerId,
          user_id: ownerId
        };
      });
      
      setTrendingServices(servicesWithEngagement as TrendingService[]);
    } catch (error) {
      console.error('Error fetching trending services:', error);
      setTrendingServices([]); // Set empty array in case of error
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(!!value);
  };

  const handleServiceClick = (serviceId: string, userId: string, username?: string) => {
    // Navigate to the user profile page and directly to the services tab
    navigate(`/user/${userId}?tab=services`);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative search-container">
        <div className="glass rounded-lg p-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search for services..."
              className="w-full bg-white/5 border-0 rounded-lg py-2 pl-10 pr-10 text-white placeholder:text-white/40 focus:ring-0 focus:outline-none focus:bg-white/10 transition-colors"
              value={searchQuery}
              onChange={handleChange}
              onFocus={() => setShowResults(true)}
            />
            {searchQuery && (
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="absolute w-full z-50">
          <SearchUsers 
            searchQuery={searchQuery} 
            show={showResults} 
            onClose={() => setShowResults(false)} 
          />
        </div>
      </div>

      <Card className="p-6 bg-black/20 border-white/5">
        <h2 className="text-lg font-semibold mb-4">Trending Services</h2>
        <div className="space-y-4">
          {loading ? (
            // Loading skeleton
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 animate-pulse">
                <div className="flex gap-3">
                  <span className="text-white/60 w-4">{index + 1}.</span>
                  <div>
                    <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-white/5 rounded"></div>
                  </div>
                </div>
                <div className="h-3 w-16 bg-white/5 rounded"></div>
              </div>
            ))
          ) : trendingServices.length > 0 ? (
            trendingServices.map((service, index) => (
              <div 
                key={service.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleServiceClick(service.id, service.owner_id, service.profile?.username)}
              >
                <div className="flex gap-3">
                  <span className="text-white/60">{index + 1}.</span>
                  <div>
                    <h3 className="font-medium">{service.title}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white/60">{service.category || 'Service'}</p>
                      <p className="text-sm text-white/60">by {service.profile?.username || 'Business'}</p>
                    </div>
                  </div>
                </div>
                <span className="text-sm text-white/60">
                  {service.engagement_score > 1000 
                    ? `${(service.engagement_score / 1000).toFixed(1)}k` 
                    : service.engagement_score} 
                  {' '}views
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-white/60 py-4">
              No service is currently trending
            </div>
          )}
        </div>
      </Card>

      <div className="text-center text-sm text-white/60 p-4 mt-0">
        <p>&copy; {new Date().getFullYear()} Markezon</p>
        <p className="mt-1">All rights reserved.</p>
      </div>
    </div>
  );
}
