import { useEffect, useState } from 'react';
import { User, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  about_business: string | null;
  user_role: string | null;
}

interface SearchUsersProps {
  searchQuery: string;
  show: boolean;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
}

export function SearchUsers({ searchQuery, show, onClose, onUserClick }: SearchUsersProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // First search for profiles with matching username, bio, or about_business
        const { data: profileResults, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%,about_business.ilike.%${searchQuery}%`)
          .limit(5);

        if (profileError) throw profileError;

        // Then search for services that match the query
        const { data: serviceResults, error: serviceError } = await supabase
          .from('services')
          .select('owner_id, title, description')
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(10);

        if (serviceError) throw serviceError;

        // Get unique user IDs from service results
        const serviceUserIds = [...new Set(serviceResults.map(service => service.owner_id))];

        // If we have service results, fetch those users' profiles
        let serviceUserProfiles: SearchResult[] = [];
        if (serviceUserIds.length > 0) {
          const { data: serviceProfiles, error: spError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', serviceUserIds)
            .limit(5);

          if (spError) throw spError;
          serviceUserProfiles = serviceProfiles || [];
        }

        // Combine results, removing duplicates
        const allProfileIds = new Set<string>();
        const combinedResults: SearchResult[] = [];

        // Add profile results first
        profileResults?.forEach(profile => {
          if (!allProfileIds.has(profile.id)) {
            allProfileIds.add(profile.id);
            combinedResults.push(profile);
          }
        });

        // Then add service-based results if not already included
        serviceUserProfiles?.forEach(profile => {
          if (!allProfileIds.has(profile.id)) {
            allProfileIds.add(profile.id);
            combinedResults.push(profile);
          }
        });

        setResults(combinedResults);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (show && searchQuery.length >= 1) {
      searchUsers();
    }
  }, [searchQuery, show]);

  const handleUserClick = (userId: string, username: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close the dropdown first
    onClose();
    
    // Then navigate after a slight delay to ensure clean UI transition
    setTimeout(() => {
      // Navigate to user profile using the @username format
      navigate(`/@${username}`);
      
      // Also call the onUserClick callback if provided
      if (onUserClick) {
        onUserClick(userId);
      }
    }, 50);
  };

  if (!show || searchQuery.length < 1) return null;

  return (
    <Card className="absolute z-50 top-full left-0 right-0 mt-1 bg-black/95 backdrop-blur-md border-white/10 max-h-[300px] overflow-y-auto shadow-lg">
      {loading ? (
        <div className="p-4 text-center text-white/60">
          <div className="animate-spin inline-block w-5 h-5 border-t-2 border-primary border-r-2 rounded-full mr-2"></div>
          Searching...
        </div>
      ) : results.length > 0 ? (
        results.map(user => (
          <div 
            key={user.id}
            className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-all duration-150 active:bg-white/20"
            onClick={(e) => handleUserClick(user.id, user.username, e)}
          >
            <Avatar className="w-10 h-10 border border-white/10">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback>
                {user.username ? user.username[0].toUpperCase() : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {user.username || 'Anonymous'}
                {user.user_role === 'business' && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Business
                  </span>
                )}
              </div>
              <div className="text-sm text-white/60 truncate">
                {user.bio || user.about_business || 'No bio available'}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-white/60">
          No users found matching "{searchQuery}"
        </div>
      )}
    </Card>
  );
} 