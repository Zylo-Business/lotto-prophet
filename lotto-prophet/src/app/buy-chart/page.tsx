"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BuyChartPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
      return;
    }
    setIsLoggedIn(true);
  }, [router]);

  if (!isLoggedIn) return null;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Buy My Chart
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Get my professionally crafted Excel prediction chart — packed with
          winning patterns, statistical analysis, and trend data to boost your
          game.
        </p>
      </div>

      {/* Chart Preview Card */}
      <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-1">Lotto Prophet Excel Chart</h2>
          <p className="text-white/80 text-sm">Updated with latest draw data & predictions</p>
        </div>

        <div className="p-6 space-y-6">
          {/* What's included */}
          <div>
            <h3 className="font-semibold text-lg mb-3">What&apos;s Included</h3>
            <ul className="space-y-2">
              {[
                "Full historical draw data with trend analysis",
                "Machine-specific pattern breakdowns",
                "Hot & cold number tables",
                "Frequency distribution charts",
                "AI-assisted prediction highlights",
                "Regular updates with new draw results",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="border rounded-xl p-5 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">One-time purchase</p>
                <p className="text-3xl font-bold">R150</p>
              </div>
              <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">
                Best Value
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pay once, receive the chart via email. Includes future updates
              for 3 months.
            </p>
          </div>

          {/* Payment methods */}
          <div>
            <h3 className="font-semibold text-lg mb-3">How to Pay</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* EFT */}
              <div className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <h4 className="font-medium text-sm">EFT / Bank Transfer</h4>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Bank:</span> FNB</p>
                  <p><span className="font-medium text-foreground">Account:</span> 123 456 7890</p>
                  <p><span className="font-medium text-foreground">Branch:</span> 250655</p>
                  <p><span className="font-medium text-foreground">Reference:</span> Your email address</p>
                </div>
              </div>

              {/* Mobile / E-wallet */}
              <div className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-medium text-sm">E-Wallet / Send Money</h4>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Number:</span> 071 234 5678</p>
                  <p><span className="font-medium text-foreground">Name:</span> Lotto Prophet</p>
                  <p><span className="font-medium text-foreground">Reference:</span> Your email address</p>
                </div>
              </div>
            </div>
          </div>

          {/* After payment */}
          <div className="border rounded-xl p-5 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              After Payment
            </h3>
            <p className="text-xs text-muted-foreground">
              Once payment is confirmed, the Excel chart will be sent to your
              registered email within 24 hours. WhatsApp us your proof of payment
              at <span className="font-medium text-foreground">071 234 5678</span> for
              faster delivery.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center pt-2">
            <a
              href="https://wa.me/27712345678?text=Hi%2C%20I%20want%20to%20buy%20the%20Lotto%20Prophet%20chart"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Order via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
