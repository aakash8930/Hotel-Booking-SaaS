'use client';

import { motion } from 'framer-motion';

const features = [
  {
    icon: '📅',
    title: 'Live Availability',
    description:
      'See real-time room availability — no more calling to check if a room is free. Book with confidence.',
  },
  {
    icon: '💳',
    title: 'UPI-First Payments',
    description:
      'Pay with PhonePe, Google Pay, or any UPI app. Instant confirmation, no card details needed.',
  },
  {
    icon: '🔒',
    title: 'No Double Bookings',
    description:
      'Our database-level guarantees mean your reservation is rock-solid. Structurally impossible to overbook.',
  },
  {
    icon: '🏡',
    title: 'Truly Local Stays',
    description:
      'Skip the chains. Stay in family-run homestays and boutique hotels with character and warmth.',
  },
  {
    icon: '📱',
    title: 'Mobile-First',
    description:
      'Book on the go. Our mobile experience is fast, smooth, and designed for how you actually travel.',
  },
  {
    icon: '💬',
    title: 'Direct Communication',
    description:
      'Chat with your host before you arrive. Ask about early check-in, local tips, or dietary needs.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export function Features() {
  return (
    <section className="section bg-white">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-surface-900 mb-4">
            Why hosts & guests love us
          </h2>
          <p className="text-lg text-surface-600 max-w-2xl mx-auto">
            Built specifically for independent hotels and homestays in India — not a repurposed chain hotel system.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="card p-8"
              variants={itemVariants}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-surface-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-surface-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
