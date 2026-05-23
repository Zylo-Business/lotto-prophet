"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 1999,
    period: "month",
    popular: false,
    color: "indigo",
    emoji: "⭐",
    features: [
      "Daily number predictions",
      "Basic statistics",
      "Email notifications",
      "5 saved combinations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 4999,
    period: "month",
    popular: true,
    color: "amber",
    emoji: "🔥",
    features: [
      "All Basic features",
      "AI-powered predictions",
      "Advanced analytics",
      "Unlimited combinations",
      "Priority support",
      "Weekly hot numbers",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 9999,
    period: "month",
    popular: false,
    color: "yellow",
    emoji: "💎",
    features: [
      "All Pro features",
      "VIP predictions",
      "Personal number consultant",
      "Early access to features",
      "Exclusive lottery pools",
      "Money-back guarantee",
      "24/7 priority support",
    ],
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
}

const colorMap: Record<string, string> = {
  indigo: "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 ring-indigo-500",
  amber: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 ring-amber-500",
  yellow: "bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400 ring-yellow-500",
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/signin"); }
  }, [router]);

  function handleSubscribe() {
    if (!selected) return;
    const plan = PLANS.find((p) => p.id === selected)!;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      alert(`Paystack integration coming soon!\n\nPlan: ${plan.name} — ${formatPrice(plan.price)}/month`);
    }, 800);
  }

  const selectedPlan = PLANS.find((p) => p.id === selected);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-100 dark:bg-yellow-950 mb-4">
            <span className="text-3xl">💎</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Unlock Premium</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Get access to AI-powered predictions and increase your chances of winning
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan) => {
            const colors = colorMap[plan.color];
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
                  isSelected
                    ? `border-current ring-2 ${colors.split(" ").find((c) => c.startsWith("ring-")) ?? ""} bg-card`
                    : "border-border bg-card hover:border-muted-foreground/40"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}

                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${colors.split(" ").slice(0, 2).join(" ")}`}>
                  <span className="text-xl">{plan.emoji}</span>
                </div>

                <p className="font-bold text-lg">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1 mb-4">
                  <span className={`text-2xl font-bold ${colors.split(" ").find((c) => c.startsWith("text-")) ?? "text-foreground"}`}>
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-sm text-muted-foreground">/{plan.period}</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className={`mt-4 flex items-center gap-1.5 text-xs font-semibold ${colors.split(" ").find((c) => c.startsWith("text-")) ?? ""}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Benefits row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: "📈", label: "85% accuracy" },
            { icon: "🔒", label: "Secure payment" },
            { icon: "🔄", label: "Cancel anytime" },
            { icon: "🎧", label: "24/7 support" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 bg-card rounded-xl px-4 py-3 shadow-sm text-sm font-medium">
              <span>{b.icon}</span>
              {b.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={handleSubscribe}
          disabled={!selected || processing}
          className="w-full h-14 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : selected ? (
            `Subscribe to ${selectedPlan?.name} — ${formatPrice(selectedPlan?.price ?? 0)}/mo`
          ) : (
            "Select a Plan to Continue"
          )}
        </Button>

        <div className="flex items-center justify-center gap-6 mt-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            🔒 Secured by Paystack
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            💳 Cards & Bank Transfer
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          By subscribing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
