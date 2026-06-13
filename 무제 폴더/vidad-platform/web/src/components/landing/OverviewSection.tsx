"use client";

import { motion } from "framer-motion";
import { useSite } from "./SiteProvider";

export function OverviewSection() {
  const { site } = useSite();
  const o = site.overview;
  const specs = [
    { label: "위치", value: o.location },
    { label: "규모", value: o.scale },
    { label: "세대수", value: o.units },
    { label: "입주예정", value: o.moveInDate },
    { label: "시공사", value: o.constructor },
  ].filter((s) => s.value);

  return (
    <section id="overview" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHead label="OVERVIEW" title="사업개요" />
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {o.image && (
            <motion.div
              className="overflow-hidden rounded-sm shadow-xl"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.image} alt={`${o.siteName} 조감도`} className="aspect-[4/3] w-full object-cover" />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="mb-6 inline-block border-b-2 border-gold pb-2 text-2xl font-bold text-navy">
              {o.siteName}
            </h3>
            <dl className="divide-y divide-navy/8">
              {specs.map((s) => (
                <div key={s.label} className="grid grid-cols-[100px_1fr] gap-4 py-4">
                  <dt className="text-sm font-semibold text-muted">{s.label}</dt>
                  <dd className="font-medium text-navy">{s.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function SectionHead({
  label,
  title,
  light,
}: {
  label: string;
  title: string;
  light?: boolean;
}) {
  return (
    <div className="mb-12 text-center">
      <span className="mb-3 block text-xs font-semibold tracking-[0.2em] text-gold">
        {label}
      </span>
      <h2
        className={`font-serif text-2xl font-semibold sm:text-3xl ${light ? "text-white" : "text-navy"}`}
      >
        {title}
      </h2>
    </div>
  );
}
