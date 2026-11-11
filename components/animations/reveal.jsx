"use client";

import { motion, useReducedMotion } from "framer-motion";

// Scroll-reveal wrapper. Reduced-motion users ko seedha content milta hai.
export function Reveal({ children, delay = 0, y = 24, className }) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
