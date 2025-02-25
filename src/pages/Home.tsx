
import { Search, Briefcase, Code, Palette, Camera, Music, Book } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { CategoryButton } from "@/components/CategoryButton";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const FEATURED_SERVICES = [
  {
    title: "Professional Web Development",
    description: "Custom web applications built with modern technologies",
    category: "Technology",
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
    business: "TechCraft Solutions"
  },
  {
    title: "Brand Identity Design",
    description: "Comprehensive branding and visual identity services",
    category: "Design",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80",
    business: "Creative Studio"
  },
  {
    title: "Professional Photography",
    description: "High-quality photography for events and products",
    category: "Photography",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80",
    business: "Capture Moments"
  }
];

const CATEGORIES = [
  { name: "All", icon: <Briefcase size={18} /> },
  { name: "Technology", icon: <Code size={18} /> },
  { name: "Design", icon: <Palette size={18} /> },
  { name: "Photography", icon: <Camera size={18} /> },
  { name: "Music", icon: <Music size={18} /> },
  { name: "Education", icon: <Book size={18} /> },
];

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Header />
      
      <main className="pt-20">
        {/* Welcome Section */}
        <section className="py-8 border-b border-white/10">
          <div className="container px-4 mx-auto">
            <h1 className="text-2xl font-semibold mb-2">Welcome to your Dashboard</h1>
            <p className="text-white/60">Discover and connect with services tailored for you</p>
          </div>
        </section>

        {/* Search and Categories */}
        <section className="py-8">
          <div className="container px-4 mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="glass rounded-2xl p-2 mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search for services..."
                    className="w-full bg-white/5 border-0 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:ring-0 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                {CATEGORIES.map((category) => (
                  <CategoryButton
                    key={category.name}
                    name={category.name}
                    icon={category.icon}
                    isSelected={category.name === "All"}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-8">
          <div className="container px-4 mx-auto">
            <h2 className="text-xl font-semibold mb-6">Recommended Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURED_SERVICES.map((service, index) => (
                <ServiceCard key={index} {...service} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
