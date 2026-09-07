'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState } from 'react';

const stays = [
  {
    name: 'The Himalayan House',
    place: 'Manali, Himachal Pradesh',
    price: '₹5,800',
    rating: '4.92',
    image: 'https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=1800&q=85',
    tag: 'Mountain hideaway',
  },
  {
    name: 'Casa de Sal',
    place: 'Assagao, Goa',
    price: '₹7,400',
    rating: '4.89',
    image: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1800&q=85',
    tag: 'Slow coastal living',
  },
  {
    name: 'The Amber Courtyard',
    place: 'Jaipur, Rajasthan',
    price: '₹6,200',
    rating: '4.96',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1800&q=85',
    tag: 'Heritage retreat',
  },
];

const destinations = [
  { name: 'Himachal', count: '128 stays', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=85' },
  { name: 'Goa', count: '94 stays', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=85' },
  { name: 'Rajasthan', count: '76 stays', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=85' },
  { name: 'Kerala', count: '61 stays', image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=85' },
];

function Arrow() {
  return <span aria-hidden className="arrow-mark">↗</span>;
}

export default function HomePage() {
  const [destination, setDestination] = useState('');
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.2], ['0%', '18%']);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1.05, 1]);

  return (
    <main className="premium-home">
      <section className="hero-premium">
        <motion.div className="hero-image" style={{ y: heroY, scale: heroScale }} />
        <div className="hero-vignette" />
        <div className="hero-grain" />

        <div className="hero-content container-premium">
          <motion.p
            className="eyebrow light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            Independent stays · India
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 45 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Stay somewhere
            <em>worth remembering.</em>
          </motion.h1>

          <motion.p
            className="hero-copy"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            Handpicked homestays, boutique hotels and quiet retreats — booked directly,
            with live availability and UPI checkout.
          </motion.p>

          <motion.div
            className="search-orb"
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
          >
            <div className="search-field">
              <span className="field-label">Where</span>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination or stay"
                aria-label="Destination"
              />
            </div>
            <div className="search-field desktop-field">
              <span className="field-label">Dates</span>
              <span className="field-value">Add dates</span>
            </div>
            <div className="search-field desktop-field">
              <span className="field-label">Guests</span>
              <span className="field-value">2 guests</span>
            </div>
            <Link className="search-submit" href="/search">
              Search stays <Arrow />
            </Link>
          </motion.div>
        </div>

        <div className="hero-bottom container-premium">
          <span>Scroll to explore</span>
          <div className="scroll-line"><i /></div>
          <span>01 / 04</span>
        </div>
      </section>

      <section className="intro-section section-dark">
        <div className="container-premium intro-grid">
          <div>
            <p className="eyebrow">A different way to stay</p>
            <h2>Closer to the place.<br /><em>Closer to the people.</em></h2>
          </div>
          <div className="intro-copy">
            <p>
              StayEase is built for the places that never needed a chain logo.
              Family-run homes, thoughtful boutique hotels and hosts who know the
              best chai spot down the road.
            </p>
            <Link href="/search" className="text-link">Explore the collection <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="stays-section section-dark">
        <div className="container-premium">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The collection</p>
              <h2>Stays with <em>a story.</em></h2>
            </div>
            <Link href="/search" className="outline-link">View all stays <Arrow /></Link>
          </div>

          <div className="stay-grid">
            {stays.map((stay, index) => (
              <motion.article
                key={stay.name}
                className={`stay-card stay-card-${index + 1}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Link href="/search" className="stay-image-wrap">
                  <img src={stay.image} alt={stay.name} className="stay-image" />
                  <span className="stay-tag">{stay.tag}</span>
                  <span className="stay-heart">♡</span>
                  <span className="stay-index">0{index + 1}</span>
                </Link>
                <div className="stay-meta">
                  <div>
                    <h3>{stay.name}</h3>
                    <p>{stay.place}</p>
                  </div>
                  <div className="stay-price">
                    <strong>{stay.price}</strong>
                    <span>night · ★ {stay.rating}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="destination-section">
        <div className="container-premium">
          <div className="section-heading destination-heading">
            <div>
              <p className="eyebrow">Go your own way</p>
              <h2>Where India feels<br /><em>different.</em></h2>
            </div>
            <p className="heading-note">From mountain mornings to salt-air evenings.</p>
          </div>

          <div className="destination-rail">
            {destinations.map((destination, index) => (
              <Link href="/search" className="destination-card" key={destination.name}>
                <img src={destination.image} alt={destination.name} />
                <div className="destination-overlay" />
                <div className="destination-number">0{index + 1}</div>
                <div className="destination-copy">
                  <span>{destination.count}</span>
                  <h3>{destination.name}</h3>
                </div>
                <Arrow />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="guarantee-section section-dark">
        <div className="container-premium guarantee-grid">
          <div className="guarantee-copy">
            <p className="eyebrow">Built on a hard guarantee</p>
            <h2>Beautiful on the surface.<br /><em>Uncompromising underneath.</em></h2>
            <p>
              Every reservation is protected at the database level. When two guests
              reach for the same room at the same moment, only one can win.
            </p>
            <Link href="/search" className="text-link">See available stays <Arrow /></Link>
          </div>

          <div className="system-card">
            <div className="system-top">
              <span>LIVE RESERVATION ENGINE</span>
              <span className="live-dot">● LIVE</span>
            </div>
            <div className="room-row">
              <div className="room-icon">204</div>
              <div>
                <strong>Himalayan House</strong>
                <span>12 Oct — 15 Oct</span>
              </div>
              <b>CONFIRMED</b>
            </div>
            <div className="system-line"><i /></div>
            <div className="blocked-row">
              <span>Concurrent request</span>
              <strong>BLOCKED</strong>
            </div>
            <div className="system-footer">
              <span>PostgreSQL exclusion constraint</span>
              <span>00.04s</span>
            </div>
          </div>
        </div>
      </section>

      <section className="host-section">
        <div className="container-premium host-grid">
          <div className="host-image">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=85"
              alt="Boutique hotel courtyard"
            />
            <div className="host-float">
              <span>HOST OS</span>
              <strong>Everything<br />in one place.</strong>
              <Arrow />
            </div>
          </div>
          <div className="host-copy">
            <p className="eyebrow">For independent hosts</p>
            <h2>Your property.<br /><em>Your rules.</em></h2>
            <p>
              A calmer way to run a stay. Manage rooms, availability, bookings,
              guests and revenue without wrestling with enterprise hotel software.
            </p>
            <div className="host-points">
              <span><b>01</b> Live calendar</span>
              <span><b>02</b> Direct bookings</span>
              <span><b>03</b> UPI payments</span>
              <span><b>04</b> Guest communication</span>
            </div>
            <Link href="/host/register" className="dark-button">List your property <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="final-cta section-dark">
        <div className="container-premium">
          <p className="eyebrow">Your next stay is out there</p>
          <h2>Go somewhere<br /><em>with a little soul.</em></h2>
          <Link href="/search" className="gold-button">Find your stay <Arrow /></Link>
        </div>
      </section>
    </main>
  );
}
