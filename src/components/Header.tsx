
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Redirect to home if user is authenticated and trying to access auth page
    if (user && location.pathname === '/auth') {
      navigate('/home');
    }
  }, [user, location.pathname, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:pl-64">
      <nav className="container flex items-center justify-between h-16 px-4">
        <Link to="/" className="text-xl font-bold md:hidden">
          Markezon
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <Button variant="ghost" onClick={handleLogout}>
              Sign Out
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
