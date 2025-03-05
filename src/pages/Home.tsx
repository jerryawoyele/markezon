import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Post } from "@/components/home/Post";
import { MobileHeader } from "@/components/home/MobileHeader";
import { CreatePost } from "@/components/home/CreatePost";
import { Sidebar } from "@/components/home/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import type { Profile as ProfileType } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Home");
  const [posts, setPosts] = useState([]);
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
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error("Error fetching posts:", postsError);
        return;
      }

      if (postsData) {
        setPosts(postsData);
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

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 container mx-auto pt-18 max-lg:pt-18 pb-20 lg:pl-64">
        <div className="flex flex-col gap-6">
          <MobileHeader />
          <CreatePost />
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
      </div>
    </div>
  );
}
