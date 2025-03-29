import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PromotionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Start a countdown to auto-redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/home");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <MainLayout
      activeTab="Home"
      setActiveTab={() => {}}
    >
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Card className="p-8 flex flex-col items-center text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Your post promotion has been successfully activated.
            You'll see your promoted post in the feed shortly.
          </p>
          
          <div className="bg-muted/30 p-4 rounded-lg mb-6 w-full max-w-md">
            <h2 className="font-semibold mb-2">Transaction Details</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Session ID: {sessionId ? sessionId.substring(0, 16) + '...' : 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground">
              You will receive an email confirmation shortly.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button onClick={() => navigate("/home")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Button>
            <p className="text-sm text-muted-foreground">
              Auto-redirecting in {countdown} seconds...
            </p>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
} 