import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PromotionCancel() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

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
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
          <p className="text-muted-foreground mb-6">
            Your post promotion has been cancelled.
            No payment has been processed.
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => navigate("/home")} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Home
              </Button>
              <Button onClick={() => navigate(-1)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Auto-redirecting to home in {countdown} seconds...
            </p>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
} 