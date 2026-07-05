import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  DollarSign,
  MessageCircle,
  Video,
  Bell,
  BarChart3,
  Shield,
  Check,
  ChevronRight,
  Clock,
  Share2,
  CreditCard,
  Star,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: DollarSign,
    title: "Built-in Payments",
    description: "Collect payments automatically when clients book — powered by Stripe. Free on every plan.",
    highlight: true,
  },
  {
    icon: Share2,
    title: "WhatsApp Sharing",
    description: "Share your booking link directly on WhatsApp and get booked instantly.",
  },
  {
    icon: Video,
    title: "Video Call Links",
    description: "Add Zoom, Google Meet, or Teams links. Your clients get them in their confirmation email.",
  },
  {
    icon: Bell,
    title: "Automated Reminders",
    description: "Both you and your clients get confirmation emails with all the details.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track bookings, revenue, and popular services at a glance.",
  },
  {
    icon: Shield,
    title: "No-Show Protection",
    description: "Collect payment upfront. Cancelled bookings automatically refund via Stripe.",
  },
];

const STEPS = [
  {
    step: 1,
    title: "Create your event types",
    description: "Set up your services — coaching calls, consultations, or training sessions. Add prices and durations.",
    icon: Zap,
  },
  {
    step: 2,
    title: "Share your booking link",
    description: "Copy your link or share it directly on WhatsApp. Clients see your availability and book instantly.",
    icon: Share2,
  },
  {
    step: 3,
    title: "Get booked and paid",
    description: "Clients pick a time, pay (or book for free), and you both get confirmation emails. Done.",
    icon: CreditCard,
  },
];

const FAQ_ITEMS = [
  {
    q: "Is BookFlow really free?",
    a: "Yes — the Free plan includes 3 event types with Stripe payments included. No hidden fees or commission on your bookings.",
  },
  {
    q: "What payment methods are supported?",
    a: "We use Stripe, so your clients can pay with all major credit/debit cards, Apple Pay, Google Pay, and more.",
  },
  {
    q: "Can I connect my calendar?",
    a: "Calendar sync (Google/Outlook) is in development. For now, set your availability directly in BookFlow's dashboard.",
  },
  {
    q: "How do I share my booking page?",
    a: "You get a unique link like bookflow.app/book/yourname. Share it anywhere — WhatsApp, email, Instagram bio.",
  },
  {
    q: "What happens when someone books?",
    a: "Both you and the client receive a confirmation email with all details and payment confirmation.",
  },
  {
    q: "How do I upgrade to Pro?",
    a: "Click 'Upgrade to Pro' in your billing settings. It's $5/month billed monthly via Stripe. Cancel anytime.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground">BookFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="hidden sm:flex">
                Get Your Free Booking Page <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button size="sm" className="sm:hidden">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/30 text-primary">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Payments are free on every plan — unlike Calendly
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Get Booked and Paid.
            <br />
            <span className="text-primary">No Extra Apps.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            BookFlow lets consultants, coaches, and freelancers schedule meetings and collect payments — all in one link. No Calendly + Stripe setup required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8">
                Start Free — No Credit Card <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
            <a href="#comparison">
              <Button size="lg" variant="outline" className="text-base px-8">
                Compare vs Calendly
              </Button>
            </a>
          </div>

          {/* Mockup */}
          <div className="mt-12 max-w-md mx-auto">
            <Card className="bg-[#141420] border-border/50 overflow-hidden">
              <div className="h-2 bg-primary/60" />
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    JD
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Jane Doe</p>
                    <p className="text-xs text-muted-foreground">Business Coach</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-foreground">Strategy Call</p>
                      <p className="text-xs text-muted-foreground">45 min</p>
                    </div>
                    <Badge variant="default" className="text-xs">$150</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-foreground">Quick Chat</p>
                      <p className="text-xs text-muted-foreground">15 min</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Free</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">Step {step.step}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            One link to book meetings and collect payments. No Zapier, no Stripe setup, no headaches.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className={f.highlight ? "border-primary/30 bg-primary/5" : ""}>
                  <CardContent className="pt-6">
                    <div className="mb-3 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="comparison" className="py-20 px-4 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Why BookFlow beats Calendly</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            The free tier difference is massive. We don&apos;t hold payments hostage behind a paywall.
          </p>

          <Card>
            <CardContent className="p-0">
              {/* Header */}
              <div className="grid grid-cols-4 border-b border-border p-4">
                <div className="text-sm font-semibold text-foreground">Feature</div>
                <div className="text-sm font-semibold text-primary text-center">BookFlow Free</div>
                <div className="text-sm font-semibold text-muted-foreground text-center">Calendly Free</div>
                <div className="text-sm font-semibold text-muted-foreground text-center">Acuity Free</div>
              </div>
              {/* Rows */}
              {[
                ["Event Types", "3", "1", "Limited"],
                ["Built-in Payments", "✓ Free", "Paid ($10+/mo)", "Paid ($16+/mo)"],
                ["WhatsApp Sharing", "✓ Free", "✗", "✗"],
                ["Confirmation Emails", "✓ Free", "✓ Free", "✓ Free"],
                ["Analytics", "✓ Basic", "✗", "✗"],
                ["Video Call Links", "✓ Free", "✓ Free", "✓ Free"],
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-4 border-b border-border last:border-b-0 p-4">
                  <div className="text-sm text-foreground">{row[0]}</div>
                  <div className={`text-sm text-center ${row[1].startsWith("✓") ? "text-emerald-400 font-medium" : "text-primary"}`}>
                    {row[1]}
                  </div>
                  <div className={`text-sm text-center ${row[2].startsWith("✓") ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {row[2]}
                  </div>
                  <div className={`text-sm text-center ${row[3].startsWith("✓") ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {row[3]}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <Card className="border-border">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Free</h3>
                <div className="mt-2 mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8 text-left max-w-xs mx-auto">
                  {[
                    "3 active event types",
                    "Stripe payments on bookings",
                    "WhatsApp sharing links",
                    "Basic analytics",
                    "Confirmation emails",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full">Get Started Free</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-primary/40 relative overflow-hidden">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" /> Best Value
                </Badge>
              </div>
              <CardContent className="pt-8 pb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/10 text-violet-400 mb-4">
                  <Star className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Pro</h3>
                <div className="mt-2 mb-6">
                  <span className="text-4xl font-bold">$5</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8 text-left max-w-xs mx-auto">
                  {[
                    "Unlimited event types",
                    "Everything in Free",
                    "Custom booking page themes",
                    "Team member links",
                    "Priority support",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full" variant="default">
                    Start Pro Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg text-muted-foreground italic">
            &ldquo;I used Calendly for years before switching. BookFlow&apos;s free tier with payments saves me $180/year on scheduling tools. It just works.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground mt-3">— A very happy coach</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get booked and paid?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of consultants and coaches who use BookFlow.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-base px-8">
              Create Your Free Booking Page <ArrowRight className="h-5 w-5 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">BookFlow</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
            <a href="mailto:support@bookflow.app" className="hover:text-foreground transition-colors">Support</a>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BookFlow. Get booked and paid.
          </p>
        </div>
      </footer>
    </div>
  );
}
