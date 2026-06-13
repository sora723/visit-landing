"use client";

import { motion } from "framer-motion";
import { useSite } from "./SiteProvider";
import { SectionHead } from "./OverviewSection";

export function PremiumSection() {
  const { site } = useSite();
  if (!site.premium.length) return null;

  return (
    <section id="premium" className="bg-navy py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHead label="PREMIUM" title="프리미엄" light />
        <div className="grid gap-6 sm:grid-cols-2">
          {site.premium.map((item, i) => (
            <motion.article
              key={item.title}
              className="overflow-hidden rounded-sm border border-white/8 bg-white/4"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} className="aspect-video w-full object-cover" />
              )}
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{item.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LocationSection() {
  const { site } = useSite();

  return (
    <section id="location" className="bg-cream py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHead label="LOCATION" title={site.location.title} />
        {site.location.mapImage && (
          <motion.div
            className="mb-10 overflow-hidden rounded-sm shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={site.location.mapImage}
              alt="입지 지도"
              className="aspect-[21/9] w-full object-cover"
            />
          </motion.div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {site.location.items.map((item, i) => (
            <motion.article
              key={item.title}
              className="rounded-sm border border-navy/8 bg-white p-6 transition hover:shadow-lg"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              {item.category && (
                <span className="mb-3 inline-block rounded-sm bg-gold/12 px-2.5 py-1 text-[10px] font-bold tracking-wider text-gold">
                  {item.category}
                </span>
              )}
              <h3 className="mb-2 font-semibold text-navy">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContentGridSection({
  id,
  label,
  title,
  items,
  dark,
}: {
  id: string;
  label: string;
  title: string;
  items: { title: string; description?: string; image?: string }[];
  dark?: boolean;
}) {
  if (!items.length) return null;

  return (
    <section id={id} className={dark ? "bg-navy py-20" : "bg-white py-20"}>
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHead label={label} title={title} light={dark} />
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item, i) => (
            <motion.article
              key={item.title}
              className={`overflow-hidden rounded-sm border ${dark ? "border-white/8 bg-white/4" : "border-navy/8 bg-cream"}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} className="aspect-video w-full object-cover" />
              )}
              <div className="p-6">
                <h3 className={`mb-2 text-lg font-semibold ${dark ? "text-white" : "text-navy"}`}>
                  {item.title}
                </h3>
                <p className={`text-sm leading-relaxed ${dark ? "text-white/65" : "text-muted"}`}>
                  {item.description}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
