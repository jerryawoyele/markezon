import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { ServiceCard } from "@/components/ServiceCard";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const featuredServices = [
  {
    id: "1",
    user_id: "123",
    title: "Professional Photography",
    description: "Capture your special moments with our professional photography services.",
    category: "Photography",
    image: "/placeholder.svg",
    business: "Frame Perfect Studios",
    features: ["Event coverage", "Portrait sessions", "Photo editing"]
  },
  {
    id: "2",
    user_id: "456",
    title: "Home Cleaning Services",
    description: "Keep your home clean and tidy with our reliable cleaning services.",
    category: "Cleaning",
    image: "/placeholder.svg",
    business: "Sparkling Homes Inc.",
    features: ["Deep cleaning", "Regular maintenance", "Eco-friendly products"]
  },
  {
    id: "3",
    user_id: "789",
    title: "Web Design & Development",
    description: "Get a stunning website that drives results with our expert web design services.",
    category: "Web Development",
    image: "/placeholder.svg",
    business: "Digital Edge Solutions",
    features: ["Responsive design", "E-commerce solutions", "SEO optimization"]
  },
];

export default function Index() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      }
    });
  }, []);

  useEffect(() => {
    // Redirect to home if user is authenticated and trying to access auth or root page
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <section className="py-24 bg-gradient-to-br from-primary/80 to-secondary/80 text-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-6">
              Find Local Services with Ease
            </h1>
            <p className="text-lg mb-8">
              Discover and connect with trusted service providers in your community.
            </p>
            <Link to="/auth">
              <Button variant="secondary" size="lg">
                Get Started
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Featured Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredServices.map((service, index) => (
                <ServiceCard key={index} service={service} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Why Choose Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Wide Range of Services</h3>
                <p className="text-gray-500">
                  From home repair to personal care, find everything you need in one place.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Trusted Providers</h3>
                <p className="text-gray-500">
                  We carefully vet our service providers to ensure quality and reliability.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
                <p className="text-gray-500">
                  Our platform makes it simple to book services and manage your appointments.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
