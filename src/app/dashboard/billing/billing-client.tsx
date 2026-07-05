"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Zap, Crown } from "lucide-react";
import Link from "next/link";

interface Props {
  subscription: string;
  activeCount: number;
  maxFree: number;
}

export function BillingClient({ subscription, activeCount, maxFree }: Props) {
  const isPro = subscription === "pro";
  const usagePercent = isPro ? 100 : Math.min(Math.round((activeCount / maxFree) * 100), 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscription.</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            {isPro ? (
              <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                <Crown className="h-3 w-3 mr-1" /> Pro
              </Badge>
            ) : (
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1" /> Free
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <div>
              <p className="text-emerald-400 font-medium">$5/month — Pro plan</p>
              <p className="text-sm text-muted-foreground mt-1">Unlimited event types, custom themes, team links.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Event types used</span>
                <span>{activeCount}/{maxFree}</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {usagePercent >= 100
                  ? "You've reached the free limit. Upgrade to Pro for unlimited event types."
                  : `${maxFree - activeCount} event type${maxFree - activeCount !== 1 ? "s" : ""} remaining on Free plan.`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upgrade card */}
      {!isPro && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-violet-400" />
              Upgrade to Pro — $5/month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              {[
                "Unlimited event types",
                "Custom booking page themes",
                "Team member links",
                "Priority email support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-emerald-400" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/api/checkout?tier=pro">
              <Button className="w-full">Upgrade to Pro — $5/month</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
