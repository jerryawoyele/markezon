import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { Briefcase, User, ArrowRight, Image, Check, CheckCircle } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";

export function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Form fields
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userRole, setUserRole] = useState<"business" | "customer">("customer");
  const [aboutBusiness, setAboutBusiness] = useState("");
  
  // Validation
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameTimeout, setUsernameTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      setUserId(session.user.id);
      
      // Check if onboarding is already completed
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed, username')
        .eq('id', session.user.id)
        .single();
      
      if (data && data.onboarding_completed) {
        navigate('/home');
        return;
      }
      
      // Pre-fill username if it exists
      if (data && data.username) {
        setUsername(data.username);
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  // Username validation and availability check
  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (!username || username.length < 3) return;
      
      setIsCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', userId || '')
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setUsernameError("This username is already taken");
        } else {
          setUsernameError("");
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setIsCheckingUsername(false);
      }
    };
    
    if (usernameTimeout) clearTimeout(usernameTimeout);
    
    if (username.length >= 3) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability();
      }, 500);
      
      setUsernameTimeout(timeout);
    }
    
    return () => {
      if (usernameTimeout) clearTimeout(usernameTimeout);
    };
  }, [username, userId]);
  
  const validateUsername = (value: string) => {
    if (!value.trim()) {
      setUsernameError("Username is required");
      return false;
    }
    
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    
    return true;
  };
  
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };
  
  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
  };
  
  const handleStepComplete = async () => {
    if (currentStep === 1) {
      if (!validateUsername(username) || usernameError) {
        return;
      }
    }
    
    if (currentStep === 3 && userRole === "business") {
      // Update profile with all collected information
      setIsLoading(true);
      try {
        console.log("Updating business profile with:", {
          username,
          bio,
          avatar_url: avatarUrl,
          user_role: userRole,
          about_business: aboutBusiness,
          onboarding_completed: true
        });
        
        const { error } = await supabase
          .from('profiles')
          .update({
            username,
            bio,
            avatar_url: avatarUrl,
            user_role: userRole,
            about_business: aboutBusiness,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId || '');
          
        if (error) {
          console.error("Supabase error details:", error);
          throw error;
        }
        
        toast({
          title: "Profile set up complete!",
          description: "Your profile has been created successfully.",
        });
        
        // Redirect to home page
        navigate('/home');
      } catch (error: any) {
        console.error("Error updating profile:", error);
        console.error("Error details:", error.message, error.details, error.hint);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save your profile. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 2 && userRole === "customer") {
      // For customers, we complete onboarding after step 2
      setIsLoading(true);
      try {
        console.log("Updating customer profile with:", {
          username,
          bio,
          avatar_url: avatarUrl,
          user_role: userRole,
          onboarding_completed: true
        });
        
        const { error } = await supabase
          .from('profiles')
          .update({
            username,
            bio,
            avatar_url: avatarUrl,
            user_role: userRole,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId || '');
          
        if (error) {
          console.error("Supabase error details:", error);
          throw error;
        }
        
        toast({
          title: "Profile set up complete!",
          description: "Your profile has been created successfully.",
        });
        
        // Redirect to home page
        navigate('/home');
      } catch (error: any) {
        console.error("Error updating profile:", error);
        console.error("Error details:", error.message, error.details, error.hint);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save your profile. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Move to next step
      setCurrentStep(prev => prev + 1);
    }
  };
  
  // Save intermediate progress (so users don't lose their work if they refresh)
  const saveProgress = async () => {
    if (!userId) return;
    
    try {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      if (username) updates.username = username;
      if (bio !== undefined) updates.bio = bio;
      if (avatarUrl) updates.avatar_url = avatarUrl;
      if (userRole) updates.user_role = userRole;
      if (aboutBusiness !== undefined) updates.about_business = aboutBusiness;
      
      console.log("Saving progress with updates:", updates);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
        
      if (error) {
        console.error("Error saving progress:", error);
        console.error("Error details:", error.message, error.details, error.hint);
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };
  
  // Save progress when navigating between steps
  useEffect(() => {
    saveProgress();
  }, [currentStep]);
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      {/* Dark background overlay with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black opacity-90 z-0"></div>
      
      <div className="w-full max-w-2xl relative z-10">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm">Step {currentStep} of {userRole === "business" ? 3 : 2}</div>
            <div className="text-sm font-medium">
              {currentStep === 1 
                ? "Basic Info" 
                : currentStep === 2 
                  ? "Choose Your Role" 
                  : "Business Profile"}
            </div>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ 
                width: `${(currentStep / (userRole === "business" ? 3 : 2)) * 100}%` 
              }}
            ></div>
          </div>
        </div>
        
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-8 shadow-xl">
          {/* Step 1: Username, Bio, and Profile Picture */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">Welcome to Markezon!</h1>
                <p className="text-white/60">Let's set up your profile</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={handleUsernameChange}
                      className={usernameError ? "border-red-500" : ""}
                    />
                    {isCheckingUsername && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
                      </div>
                    )}
                    {!isCheckingUsername && username.length >= 3 && !usernameError && (
                      <div className="absolute right-3 top-2.5 text-green-500">
                        <CheckCircle size={20} />
                      </div>
                    )}
                  </div>
                  {usernameError && (
                    <p className="text-red-500 text-sm">{usernameError}</p>
                  )}
                  <p className="text-xs text-white/60">
                    This will be your public identifier. You can change it later.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profile-picture">Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-white/10 overflow-hidden">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="Profile preview" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/40">
                          <Image size={24} />
                        </div>
                      )}
                    </div>
                    <FileUpload
                      endpoint="avatarUploader"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <p className="text-xs text-white/60">
                    Add a photo to personalize your profile
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us a bit about yourself"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-24"
                  />
                  <p className="text-xs text-white/60">
                    {bio.length}/160 characters
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Choose Role */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">How will you use Markezon?</h1>
                <p className="text-white/60">Choose the option that best describes you</p>
              </div>
              
              <RadioGroup value={userRole} onValueChange={(value) => setUserRole(value as "business" | "customer")} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className={`border rounded-lg p-6 cursor-pointer transition-all ${userRole === "customer" ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/30"}`}
                  onClick={() => setUserRole("customer")}>
                  <RadioGroupItem value="customer" id="customer" className="sr-only" />
                  <Label htmlFor="customer" className="flex flex-col items-center gap-4 cursor-pointer">
                    <User size={48} className={userRole === "customer" ? "text-primary" : ""} />
                    <div className="text-center">
                      <div className="font-medium text-xl mb-2">Customer</div>
                      <p className="text-white/60">
                        I want to discover and purchase services from businesses
                      </p>
                    </div>
                    {userRole === "customer" && (
                      <div className="mt-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Check size={16} /> Selected
                      </div>
                    )}
                  </Label>
                </div>
                
                <div className={`border rounded-lg p-6 cursor-pointer transition-all ${userRole === "business" ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/30"}`}
                  onClick={() => setUserRole("business")}>
                  <RadioGroupItem value="business" id="business" className="sr-only" />
                  <Label htmlFor="business" className="flex flex-col items-center gap-4 cursor-pointer">
                    <Briefcase size={48} className={userRole === "business" ? "text-primary" : ""} />
                    <div className="text-center">
                      <div className="font-medium text-xl mb-2">Business</div>
                      <p className="text-white/60">
                        I want to offer services and reach potential customers
                      </p>
                    </div>
                    {userRole === "business" && (
                      <div className="mt-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Check size={16} /> Selected
                      </div>
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Step 3: Business Details (only for business role) */}
          {currentStep === 3 && userRole === "business" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">Tell us about your business</h1>
                <p className="text-white/60">Help customers understand what you offer</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="about-business">About Your Business</Label>
                  <Textarea
                    id="about-business"
                    placeholder="Describe your business, services, expertise, etc."
                    value={aboutBusiness}
                    onChange={(e) => setAboutBusiness(e.target.value)}
                    className="min-h-32"
                  />
                  <p className="text-xs text-white/60">
                    This will be displayed on your profile to help customers learn about your services
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-between">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            {currentStep === 1 && (
              <div></div> // Empty div for flex alignment
            )}
            
            <Button 
              onClick={handleStepComplete}
              disabled={
                isLoading || 
                (currentStep === 1 && (!username || !!usernameError)) ||
                (currentStep === 3 && userRole === "business" && !aboutBusiness.trim())
              }
              className="ml-auto"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>
                    {(currentStep === 3 && userRole === "business") || 
                     (currentStep === 2 && userRole === "customer") 
                      ? "Finish" : "Continue"}
                  </span>
                  <ArrowRight size={16} />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 