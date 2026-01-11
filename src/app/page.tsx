import Link from "next/link";
import {
  Building2,
  Globe2,
  Users2,
  ArrowRight,
  Zap,
  ShieldCheck,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="w-full">
      {/* Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-6xl h-16 z-50 flex items-center glass rounded-2xl border border-white/20 shadow-xl px-6">
        <div className="flex justify-between items-center w-full">
          <div className="text-2xl font-black text-indigo-600 tracking-tighter">
            Travyntra
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-bold text-slate-600">
            <a href="#solutions" className="hover:text-indigo-600 transition-colors">Solutions</a>
            <a href="#ecosystem" className="hover:text-indigo-600 transition-colors">Ecosystem</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="text-sm font-bold text-slate-700">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-6 pt-24 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-joy-blue/40 blur-[120px] rounded-full -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-joy-purple/40 blur-[120px] rounded-full -z-10 animate-pulse" />

        <div className="max-w-4xl mx-auto">
          <Badge className="mb-8 px-5 py-2 text-sm font-black bg-white text-indigo-600 border-joy-blue shadow-md rounded-full">
            ✨ Infrastructure for Enteprise Joy
          </Badge>
          <h1 className="text-6xl md:text-8xl font-black leading-[1.05] tracking-tight mb-8 text-slate-900">
            Operating System <br />
            for Business Travel.
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            A joyful, triple-layered ecosystem connecting Agencies,
            Corporations, and Employees. Managed at scale, fulfilled with precision.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Button size="lg" className="h-16 px-10 text-lg rounded-2xl font-black shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 transition-all" asChild>
              <Link href="/register">
                Start for Free <ArrowRight className="ml-3 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-16 px-10 text-lg rounded-2xl font-bold border-2 border-indigo-50 text-indigo-600 hover:bg-indigo-50 transition-all" asChild>
              <Link href="#ecosystem">Explore Platform</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section id="ecosystem" className="py-24 md:py-36 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-slate-900 tracking-tight">Unified Experience.</h2>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
              Three perspectives, one shared source of truth. Designed to be joyful,
              secure, and impossibly efficient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Fulfillment Agents */}
            <div className="group p-8 md:p-12 rounded-[40px] bg-[#E0F2FE] border border-white hover:border-blue-200 transition-all hover:shadow-2xl hover:shadow-blue-200/50">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-10 shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                <Globe2 className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-black mb-5 text-slate-900">Fulfillment Agents</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Your SaaS command center. Manage high-volume ticketing,
                visas, and global corporate accounts from one joyful interface.
              </p>
            </div>

            {/* Corporate Admins */}
            <div className="group p-8 md:p-12 rounded-[40px] bg-[#F3E8FF] border border-white hover:border-purple-200 transition-all hover:shadow-2xl hover:shadow-purple-200/50">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-10 shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                <Building2 className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-black mb-5 text-slate-900">Corporate Admins</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                The ultimate control plane. Define your company&apos;s chain of
                command and approve requests with a single click.
              </p>
            </div>

            {/* Global Staff */}
            <div className="group p-8 md:p-12 rounded-[40px] bg-[#DCFCE7] border border-white hover:border-green-200 transition-all hover:shadow-2xl hover:shadow-green-200/50">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-10 shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                <Users2 className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-black mb-5 text-slate-900">Global Staff</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Travel requests made simple. Track your journey&apos;s lifecycle
                and message your fulfillers directly within the thread.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Detail */}
      <section id="solutions" className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <div className="w-14 h-14 bg-joy-amber/50 rounded-2xl flex items-center justify-center text-amber-600">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="text-3xl font-black text-fg-primary">Automated Workflows</h3>
              <p className="text-fg-secondary text-lg font-medium leading-relaxed">
                {`Staff -> Manager -> Agent. Build custom hierarchies that 
                fit your company's unique DNA perfectly.`}
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-14 h-14 bg-joy-blue/50 rounded-2xl flex items-center justify-center text-blue-600">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="text-3xl font-black text-fg-primary">Digital Asset Vault</h3>
              <p className="text-fg-secondary text-lg font-medium leading-relaxed">
                Securely store and share travel documents. Tickets and Visas
                delivered directly to the employee&apos;s dashboard.
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-14 h-14 bg-joy-green/50 rounded-2xl flex items-center justify-center text-emerald-600">
                <BarChart3 className="h-7 w-7" />
              </div>
              <h3 className="text-3xl font-black text-fg-primary">Unified Billing</h3>
              <p className="text-fg-secondary text-lg font-medium leading-relaxed">
                Automated invoicing per request. Track every cent spent
                across your entire organization in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Enterprise Section */}
      <section id="pricing" className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="bg-joy-amber/30 rounded-[48px] p-8 md:p-16 border border-amber-100/50 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-xl">
              <Badge className="mb-6 bg-amber-100 text-amber-700 border-none rounded-lg px-4 py-1 font-bold">
                Enterprise Only
              </Badge>
              <h2 className="text-4xl md:text-6xl font-black mb-6 text-slate-900 leading-tight">
                Tailored for your <br />
                organization&apos;s scale.
              </h2>
              <p className="text-lg text-slate-600 font-medium leading-relaxed">
                Travyntra is an elite infrastructure provider. We don&apos;t believe in one-size-fits-all
                subscriptions. Our pricing is calculated based on your travel volume,
                number of agents, and custom workflow complexity.
              </p>
            </div>
            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl shadow-amber-900/5 border border-amber-50 w-full md:w-[450px]">
              <h3 className="text-2xl font-black mb-4 text-slate-900">Request Bespoke Pricing</h3>
              <p className="text-slate-500 mb-8 font-medium">
                Connect with our deployment specialists to architect your custom travel portal.
              </p>
              <div className="space-y-4">
                <Button className="w-full h-14 text-lg rounded-2xl bg-slate-900 hover:bg-black text-white font-bold transition-all" asChild>
                  <Link href="mailto:sales@travyntra.com">
                    Contact Sales Specialist
                  </Link>
                </Button>
                <p className="text-center text-sm text-slate-400 font-bold uppercase tracking-widest pt-2">
                  Avg. Response Time: 2 Hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="relative overflow-hidden bg-primary rounded-[48px] py-20 px-10 text-center text-white shadow-2xl">
            {/* CTA Background Deco */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-black mb-6 text-white leading-tight">Ready for a new direction?</h2>
              <p className="text-xl opacity-90 mb-10 font-medium">
                Join hundreds of enterprises that trust Travyntra to manage their most important journeys.
              </p>
              <Button size="lg" variant="secondary" className="h-16 px-12 text-lg rounded-2xl font-black bg-white text-primary hover:bg-joy-white hover:scale-105 transition-all shadow-xl" asChild>
                <Link href="/register">Get Started Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-brand-subtle border-t">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-extrabold text-primary tracking-tighter">
            Travyntra
          </div>
          <p className="text-slate-400 font-bold flex items-center gap-2">
            © 2026 Travyntra <span className="text-slate-200">|</span> <span className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-600 text-xs">Built by Chhatriwala.com</span>
          </p>
          <div className="flex gap-8 text-sm font-bold text-slate-500">
            <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
            <Link href="/status" className="hover:text-indigo-600 transition-colors">Status</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
