import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Crown, Check, ChevronRight, Zap, Download, Star, Sparkles } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";

const invoices = [
  { id: "INV-2024-03", date: "Mar 1, 2026", amount: "$0.00", plan: "Explorer", status: "paid" },
  { id: "INV-2024-02", date: "Feb 1, 2026", amount: "$0.00", plan: "Explorer", status: "paid" },
  { id: "INV-2024-01", date: "Jan 1, 2026", amount: "$0.00", plan: "Explorer", status: "paid" },
];

const plans = [
  {
    id: "free", name: "Explorer", price: "Free", period: "",
    features: ["100 messages/day", "50+ characters", "Standard speed"],
    current: true,
    accentVar: "--muted-foreground",
    glowVar: "--border",
  },
  {
    id: "pro", name: "Voyager", price: "$9.99", period: "/mo",
    features: ["Unlimited messages", "All characters", "Priority speed", "Create 10 characters"],
    current: false,
    accentVar: "--spectral-cyan",
    glowVar: "--spectral-cyan",
  },
  {
    id: "ultra", name: "Luminary", price: "$24.99", period: "/mo",
    features: ["Everything in Voyager", "Unlimited characters", "Advanced AI models", "Early access"],
    current: false,
    accentVar: "--primary",
    glowVar: "--primary",
  },
];

export default function Billing() {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 w-80 h-80 opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--spectral-amber)) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "hsl(var(--card) / 0.72)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid hsl(var(--border) / 0.4)",
        }}>
        <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(var(--spectral-amber) / 0.2)", border: "1px solid hsl(var(--spectral-amber) / 0.4)" }}>
            <CreditCard className="w-3 h-3" style={{ color: "hsl(var(--spectral-amber))" }} />
          </div>
          <span className="font-display font-bold text-sm gradient-text">Billing</span>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show"
        className="max-w-xl mx-auto px-4 pt-6 pb-safe-nav lg:pb-10 relative z-10 space-y-5">

        {/* Current plan hero */}
        <motion.div variants={itemVariants} className="panel rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "hsl(var(--card) / 0.6)", borderColor: "hsl(var(--primary) / 0.2)" }}>
          <div className="absolute top-0 right-0 w-40 h-40 opacity-[0.07] blur-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Current Plan</p>
              <h2 className="font-display font-bold text-2xl text-foreground">Explorer</h2>
              <p className="text-muted-foreground/70 text-sm mt-0.5">Free forever</p>
            </div>
            <div className="w-11 h-11 rounded-xl btn-gradient flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Messages Today</p>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.4)" }}>
                <div className="h-full rounded-full btn-gradient" style={{ width: "62%" }} />
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1.5">62 / 100 used</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Characters</p>
              <p className="font-display font-bold text-lg text-foreground mt-1">50+</p>
            </div>
          </div>
        </motion.div>

        {/* Upgrade plans */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-3">
            Upgrade Your Plan
          </p>
          <div className="space-y-3">
            {plans.filter((p) => !p.current).map((plan) => (
              <div key={plan.id} className="panel rounded-2xl p-4 relative overflow-hidden transition-all duration-200"
                style={{ borderColor: `hsl(var(${plan.glowVar}) / 0.3)` }}>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.05] blur-xl pointer-events-none"
                  style={{ background: `radial-gradient(circle, hsl(var(${plan.glowVar})) 0%, transparent 70%)` }} />
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {plan.id === "ultra"
                      ? <Sparkles className="w-4 h-4" style={{ color: `hsl(var(${plan.accentVar}))` }} />
                      : <Zap className="w-4 h-4" style={{ color: `hsl(var(${plan.accentVar}))` }} />
                    }
                    <h3 className="font-display font-bold text-foreground">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-display font-bold text-xl" style={{ color: `hsl(var(${plan.accentVar}))` }}>
                      {plan.price}
                    </span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground/80">
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: `hsl(var(${plan.accentVar}))` }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  style={
                    plan.id === "ultra"
                      ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", boxShadow: "0 0 16px hsl(var(--primary) / 0.35)" }
                      : { background: `hsl(var(${plan.accentVar}) / 0.12)`, color: `hsl(var(${plan.accentVar}))`, border: `1px solid hsl(var(${plan.accentVar}) / 0.35)` }
                  }
                >
                  Upgrade to {plan.name}
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment method */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Payment Method</p>
          <div className="panel rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border) / 0.5)" }}>
              <CreditCard className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground/50">No payment method</p>
              <p className="text-xs text-muted-foreground/40 mt-0.5">Add a card to upgrade your plan</p>
            </div>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.25)" }}>
              Add Card
            </button>
          </div>
        </motion.div>

        {/* Invoice history */}
        <motion.div variants={itemVariants}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2">Invoice History</p>
          <div className="panel rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            {invoices.map((inv, i) => (
              <div key={inv.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: i < invoices.length - 1 ? "1px solid hsl(var(--border) / 0.25)" : "none" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--spectral-green) / 0.1)", border: "1px solid hsl(var(--spectral-green) / 0.25)" }}>
                  <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--spectral-green))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{inv.date}</p>
                  <p className="text-xs text-muted-foreground/60">{inv.plan} Plan · {inv.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-foreground">{inv.amount}</span>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                    <Download className="w-3 h-3 text-muted-foreground/70" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Cancel */}
        <motion.div variants={itemVariants}>
          <button className="w-full panel rounded-2xl p-4 flex items-center justify-between"
            style={{ borderColor: "hsl(var(--destructive) / 0.2)" }}>
            <div>
              <p className="text-sm font-medium text-muted-foreground/60">Cancel Subscription</p>
              <p className="text-xs text-muted-foreground/40 mt-0.5">You're on the free plan — nothing to cancel</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30" />
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
