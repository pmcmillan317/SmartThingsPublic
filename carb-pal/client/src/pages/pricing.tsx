import { useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  priceId: string;
  features: string[];
  popular?: boolean;
}

export default function Pricing() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch price IDs from server
  const { data: priceIds, isLoading: priceIdsLoading } = useQuery<{monthly: string, yearly: string}>({
    queryKey: ['/api/stripe/price-ids'],
  });

  const plans: PricingPlan[] = [
    {
      name: "Monthly",
      price: "$1.99",
      period: "/month",
      priceId: priceIds?.monthly || "",
      features: [
        "FatSecret restaurant & branded foods database",
        "Actual serving sizes (not per 100g)",
        "Barcode scanning in recipes",
        "Google Drive backup & sync",
        "All free features included"
      ],
    },
    {
      name: "Yearly",
      price: "$19.99",
      period: "/year",
      priceId: priceIds?.yearly || "",
      popular: true,
      features: [
        "Save $4 per year (17% off)",
        "FatSecret restaurant & branded foods database",
        "Actual serving sizes (not per 100g)",
        "Barcode scanning in recipes",
        "Google Drive backup & sync",
        "All free features included"
      ],
    },
  ];

  const handleSubscribe = async (plan: PricingPlan) => {
    // Wait for auth to finish loading
    if (authLoading || priceIdsLoading) {
      return;
    }

    // Ensure we have a valid price ID
    if (!plan.priceId) {
      toast({
        title: "Error",
        description: "Unable to load pricing information. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // If user is already premium, show message
    if (user?.isPremium) {
      toast({
        title: "Already premium",
        description: "You already have an active premium subscription",
      });
      return;
    }

    setLoading(plan.priceId);

    try {
      // Go directly to Stripe checkout (logged in or not)
      // Stripe will collect email, then we'll create account after payment
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        priceId: plan.priceId,
        planType: plan.name.toLowerCase(),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        icon={Crown}
        title="Premium Plans"
        description="Unlock restaurant foods, barcode scanning & more"
      />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground">
            Start with our free tier. Upgrade anytime for premium features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Free Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <div className="mt-4">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <CardDescription className="mt-2">
                Perfect for getting started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">USDA database (800K+ whole foods)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Quick carb calculator</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Reverse calculator</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Custom foods & recipes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Meal history tracking</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                disabled
                data-testid="button-free-plan"
              >
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Plans */}
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? "border-primary shadow-lg relative" : "relative"}
              data-testid={`card-plan-${plan.name.toLowerCase()}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Best Value
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-2">
                  {plan.name === "Monthly" ? "Flexible monthly billing" : "Save 17% with annual billing"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan)}
                  disabled={authLoading || priceIdsLoading || !plan.priceId || loading === plan.priceId || user?.isPremium}
                  data-testid={`button-subscribe-${plan.name.toLowerCase()}`}
                >
                  {authLoading || priceIdsLoading || loading === plan.priceId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : user?.isPremium ? (
                    "Current Plan"
                  ) : (
                    "Subscribe Now"
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time from Settings. You'll keep access until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">What's the difference between free and premium?</h4>
              <p className="text-sm text-muted-foreground">
                Free includes USDA whole foods (per-100g data). Premium adds FatSecret branded/restaurant foods with actual serving sizes, making restaurant carb counting much easier.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Is my data safe?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! All payments are processed securely through Stripe. Your data is backed up with Google Drive integration (premium).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
