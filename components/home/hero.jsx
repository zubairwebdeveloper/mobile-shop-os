"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, BatteryCharging, Camera, Sparkles, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/constants/site";
import { PhoneShowcase } from "@/components/three/phone-showcase";
import { cn } from "@/lib/utils";

const STATS = [
  { value: "100%", label: "Genuine devices" },
  { value: "12 mo", label: "Warranty support" },
  { value: "48 h", label: "Nationwide delivery" },
];

function PhoneMockup({ reduce }) {
  const float = reduce
    ? {}
    : { animate: { y: [0, -12, 0] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
      {/* glow */}
      <div className="absolute inset-0 rounded-full bg-primary/25 blur-[90px]" aria-hidden="true" />
      <div
        className="absolute top-10 right-4 size-40 rounded-full bg-accent/25 blur-[70px]"
        aria-hidden="true"
      />

      <motion.div
        {...float}
        className="absolute top-1/2 left-1/2 h-[88%] w-[46%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <div className="relative h-full w-full rotate-[-6deg] rounded-[2.4rem] border-[7px] border-[#1c2740] bg-black shadow-2xl shadow-primary/30">
          <div className="absolute top-2.5 left-1/2 z-10 h-4 w-14 -translate-x-1/2 rounded-full bg-black" />
          <div className="h-full w-full overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-primary via-[#1d3fa8] to-accent">
            <div className="flex h-full flex-col justify-between p-4 pt-10 text-white">
              <div>
                <p className="font-display text-[10px] tracking-[0.3em] opacity-80">ZUBAIR MOBILE</p>
                <p className="mt-2 font-heading text-2xl leading-tight font-extrabold">
                  Next-gen
                  <br />
                  flagships
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-1.5 w-2/3 rounded-full bg-white/40" />
                <div className="h-1.5 w-1/2 rounded-full bg-white/25" />
                <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-[11px] font-semibold backdrop-blur">
                  From Rs. 89,999
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <FloatingChip className="top-[14%] left-0" icon={Camera} label="200MP camera" delay={0} reduce={reduce} />
      <FloatingChip className="top-[48%] -right-1" icon={BatteryCharging} label="Fast charging" delay={0.6} reduce={reduce} />
      <FloatingChip className="bottom-[10%] left-3" icon={Sparkles} label="AI picks for you" delay={1.2} reduce={reduce} />
    </div>
  );
}

function FloatingChip({ className, icon: Icon, label, delay, reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      animate={reduce ? undefined : { opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 + delay, duration: 0.5 }}
      className={cn(
        "absolute flex items-center gap-2 rounded-full border bg-card/90 px-3.5 py-2 text-xs font-semibold shadow-soft backdrop-blur",
        className,
      )}
    >
      <Icon className="size-4 text-primary" />
      {label}
    </motion.div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const item = (i) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,rgb(37_99_235/0.12),transparent),radial-gradient(40%_40%_at_90%_30%,rgb(22_160_133/0.12),transparent)]"
      />
      <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-6 lg:py-24">
        <div className="max-w-xl">
          <motion.div {...item(0)}>
            <Badge variant="mint" className="gap-1.5 px-3 py-1 text-[13px]">
              <BadgeCheck /> Authorized smartphone retail
            </Badge>
          </motion.div>
          <motion.h1
            {...item(1)}
            className="mt-5 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl"
          >
            Buy Smarter.
            <br />
            Sell Faster.
            <br />
            <span className="text-gradient-brand">Manage Everything.</span>
          </motion.h1>
          <motion.p {...item(2)} className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {SITE.description}
          </motion.p>
          <motion.div {...item(3)} className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className={cn(buttonVariants({ size: "lg" }))}>
              Shop phones <ArrowRight />
            </Link>
            <Link href="/finder" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Find my phone
            </Link>
          </motion.div>
          <motion.ul {...item(4)} className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t pt-6">
            {STATS.map((s) => (
              <li key={s.label}>
                <p className="font-display text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </li>
            ))}
          </motion.ul>
          <motion.p {...item(5)} className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="size-4 text-accent" /> Free delivery above Rs. 25,000
          </motion.p>
        </div>

        <PhoneShowcase fallback={<PhoneMockup reduce={reduce} />} />
      </div>
    </section>
  );
}
