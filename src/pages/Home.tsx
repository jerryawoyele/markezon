
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Post } from "@/components/home/Post";
import { MobileHeader } from "@/components/home/MobileHeader";
import { CreatePost } from "@/components/home/CreatePost";
import { Sidebar } from "@/components/home/Sidebar";
import { TrendingServices } from "@/components/home/TrendingServices";
import { supabase } from "@/integrations/supabase/client";
import type { Profile as ProfileType, Post as PostType } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Home");
  const [posts, setPosts] = useState<PostType[]>([]);
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            bio,
            updated_at,
            about_business,
            followers_count,
            following_count,
            reviews_count,
            reviews_rating
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error("Error fetching posts:", postsError);
        return;
      }

      if (postsData) {
        // Need to cast the data to resolve the type error
        setPosts(postsData as unknown as PostType[]);
      }
    };

    const fetchProfiles = async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
      }

      if (profilesData) {
        setProfiles(profilesData);
      }
    };

    fetchPosts();
    fetchProfiles();
  }, []);

  // Make this function return a Promise to match the expected type
  const handlePostSubmit = async (data: { text: string; image_url: string | string[]; isTextPost: boolean }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      // Create the new post in the database
      const { data: newPostData, error } = await supabase
        .from('posts')
        .insert({
          caption: data.text,
          image_url: Array.isArray(data.image_url) ? JSON.stringify(data.image_url) : data.image_url,
          user_id: userId
        })
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            bio,
            updated_at,
            about_business,
            followers_count,
            following_count,
            reviews_count,
            reviews_rating
          )
        `)
        .single();

      if (error) {
        console.error("Error creating post:", error);
        return;
      }

      if (newPostData) {
        // Cast to resolve the type error
        setPosts(prevPosts => [(newPostData as unknown as PostType), ...prevPosts]);
      }
    } catch (error) {
      console.error("Error in handlePostSubmit:", error);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 container mx-auto pt-4 max-lg:pt-18 pb-20 lg:pl-64">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6">
            <MobileHeader />
            <CreatePost onSubmit={handlePostSubmit} className="mx-4 lg:mx-6" />
            {posts.map((post) => (
              <Post
                key={post.id}
                {...post}
                profiles={post.profiles}
                currentUserId={async () => {
                  const { data } = await supabase.auth.getUser();
                  return data.user?.id || null;
                }}
              />
            ))}
          </div>
          
          <div className="hidden lg:block w-80 mr-4">
            <TrendingServices />
          </div>
        </div>
      </div>
    </div>
  );
}
