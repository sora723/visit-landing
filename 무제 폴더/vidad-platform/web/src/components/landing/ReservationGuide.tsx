"use client";

import { motion } from "framer-motion";
import { useSite } from "./SiteProvider";

export function ReservationGuide() {
  const { site } = useSite();
  const { title, steps } = site.reservationGuide;

  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <h2 className="mb-12 text-center font-serif text-2xl font-semibold text-navy">
          {title}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              className="relative text-center"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold/30 bg-white font-serif text-lg font-semibold text-gold">
                {step.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-navy">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-7 hidden h-px w-full translate-x-1/2 bg-gold/20 md:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
