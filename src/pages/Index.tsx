import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { ServiceCard } from "@/components/ServiceCard";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

// Define ServiceType locally
interface ServiceType {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  business?: string | null;
  price?: string | null;
  features?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const featuredServices: ServiceType[] = [
  {
    id: "1",
    user_id: "123",
    title: "Professional Photography",
    description: "Capture your special moments with our professional photography services.",
    category: "Photography",
    image: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=800",
    business: "Frame Perfect Studios",
    features: ["Event coverage", "Portrait sessions", "Photo editing"]
  },
  {
    id: "2",
    user_id: "456",
    title: "Home Cleaning Services",
    description: "Keep your home clean and tidy with our reliable cleaning services.",
    category: "Cleaning",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800",
    business: "Sparkling Homes Inc.",
    features: ["Deep cleaning", "Regular maintenance", "Eco-friendly products"]
  },
  {
    id: "3",
    user_id: "789",
    title: "Web Design & Development",
    description: "Get a stunning website that drives results with our expert web design services.",
    category: "Web Development",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800",
    business: "Digital Edge Solutions",
    features: ["Responsive design", "E-commerce solutions", "SEO optimization"]
  },
];

export default function Index() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      }
    });
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    
    // Here you would typically integrate with your email service
    toast({
      title: "Success!",
      description: "Thank you for subscribing to our newsletter!",
    });
    setEmail("");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <section className="py-12 md:py-24 bg-gray-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1200"
              alt="Background"
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          <div className="container mx-auto px-4 md:px-8 text-center relative z-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Find Local Services with Ease
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              Discover and connect with trusted service providers in your community.
            </p>
            <Link to="/auth">
              <Button variant="secondary" size="lg" className="font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-8 md:py-16 mt-8 md:mt-0">
          <div className="container mx-auto px-4 md:px-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Featured Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredServices.map((service, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="aspect-video relative">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <div className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm text-gray-500">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 md:py-16 bg-gray-700">
          <div className="container mx-auto px-4 md:px-8">
            <h2 className="text-3xl font-bold mb-12 text-center">Why Choose Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full h-60 mb-6 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800"
                    alt="Services"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-3">Wide Range of Services</h3>
                <p className="text-gray-600">
                  From home repair to personal care, find everything you need in one place.
                </p>
              </div>
              <div className="text-center p-8 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full h-60 mb-6 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=800"
                    alt="Trust"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-3">Trusted Providers</h3>
                <p className="text-gray-600">
                  We carefully vet our service providers to ensure quality and reliability.
                </p>
              </div>
              <div className="text-center p-8 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full h-60 mb-6 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1586880244406-556ebe35f282?q=80&w=800"
                    alt="Booking"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-3">Easy Booking</h3>
                <p className="text-gray-600">
                  Our platform makes it simple to book services and manage your appointments.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-900 text-white">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
              <p className="text-gray-300 mb-6">
                Subscribe to our newsletter for the latest services and exclusive offers.
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-[300px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
                <Button type="submit" variant="secondary" className="hover:bg-secondary/90">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
