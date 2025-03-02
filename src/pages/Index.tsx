import { Search, Briefcase, Code, Palette, Camera, Music, Book, Send } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { CategoryButton } from "@/components/CategoryButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
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

const Index = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate('/home');
      }
    });
  }, [navigate]);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Thank you for subscribing!",
      description: "You'll receive our latest updates in your inbox.",
    });
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1664575602276-acd073f104c1?auto=format&fit=crop&q=80"
            alt="Business marketplace"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        </div>

        <div className="container px-4 mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-down">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Discover & Connect with Local Business Services
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/60">
              Your gateway to a network of professional services. Find, connect, and collaborate with businesses in your area.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-white text-background hover:bg-white/90">
                  Get Started
                </Button>
              </Link>
              <Button size="lg" variant="ghost" className="text-white border border-white/10 hover:bg-white/5">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Categories */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-2 mb-8 animate-fade-up">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search for services..."
                  className="w-full bg-white/5 border-0 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 animate-fade-up" style={{ scrollbarWidth: 'none' }}>
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

      {/* Featured Services */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <h2 className="text-2xl font-semibold mb-8 text-center animate-fade-up">Featured Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
            {FEATURED_SERVICES.map((service, index) => (
              <ServiceCard key={index} {...service} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <h2 className="text-3xl font-bold mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="glass rounded-xl p-6">
                <div className="text-xl mb-4">1.</div>
                <h3 className="text-lg font-semibold mb-2">Create Profile</h3>
                <p className="text-sm text-white/60">Sign up and showcase your business services</p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-xl mb-4">2.</div>
                <h3 className="text-lg font-semibold mb-2">Connect</h3>
                <p className="text-sm text-white/60">Find and connect with other businesses</p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-xl mb-4">3.</div>
                <h3 className="text-lg font-semibold mb-2">Grow</h3>
                <p className="text-sm text-white/60">Expand your network and grow your business</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container px-4 mx-auto">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-white/60 mb-8">
              Subscribe to our newsletter for the latest business opportunities and marketplace updates.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <Button type="submit" size="lg" className="bg-white text-background hover:bg-white/90">
                <Send className="w-4 h-4 mr-2" />
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
