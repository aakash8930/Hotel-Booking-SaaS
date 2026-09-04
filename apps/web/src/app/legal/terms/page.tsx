import { LegalPage } from '@/components/legal/legal-page';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="September 4, 2026">
      <section>
        <h2>1. What StayEase is</h2>
        <p>
          StayEase is a booking platform that connects guests with independent hotels and
          homestays (&quot;Hosts&quot;) in India. When you book a stay through StayEase, you
          enter into a direct arrangement with the Host for that stay. StayEase is not the
          hotel or homestay operator — we provide the booking, payment, and availability
          infrastructure that makes the booking possible.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          Hosts create an account to list properties and manage bookings. Guests do not need
          an account to book — a booking is tied to the email and phone number provided at
          checkout. You&apos;re responsible for the accuracy of the information you provide and
          for keeping any account credentials secure.
        </p>
      </section>

      <section>
        <h2>3. How a booking works</h2>
        <ul>
          <li>
            When you select dates and submit a booking, the room is placed on a{' '}
            <strong>10-minute hold</strong> — no one else can book those exact dates while
            your hold is active.
          </li>
          <li>
            You must complete payment via UPI within that window. If the hold expires before
            payment is completed, the dates are released automatically and you&apos;ll need to
            book again.
          </li>
          <li>
            A booking is confirmed only once payment is verified as successful. Our database
            enforces this at a structural level — it is not possible for two guests to hold a
            confirmed, paid booking for the same room on overlapping dates.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Payments</h2>
        <p>
          Guest payments are processed via UPI through our payment partner, PhonePe. StayEase
          does not see or store your UPI PIN, bank credentials, or card details — that
          information is handled entirely within the UPI app and payment gateway.
        </p>
      </section>

      <section>
        <h2>5. Cancellations and refunds</h2>
        <p>
          See our separate{' '}
          <a href="/legal/cancellation-refund" className="underline">
            Cancellation &amp; Refund Policy
          </a>{' '}
          for how cancellations, refunds, and no-shows are handled.
        </p>
      </section>

      <section>
        <h2>6. Host responsibilities</h2>
        <p>
          Hosts are responsible for the accuracy of their listings (pricing, photos,
          amenities, availability), for honoring confirmed bookings, and for maintaining their
          property in a condition consistent with what was listed. StayEase may suspend a
          listing that receives repeated, verified complaints.
        </p>
      </section>

      <section>
        <h2>7. Guest conduct</h2>
        <p>
          Guests are expected to follow the check-in/check-out times and house rules stated
          on the listing. Property damage, disputes, or issues arising during a stay are
          primarily a matter between guest and Host; StayEase will assist in good faith but is
          not a party to that relationship.
        </p>
      </section>

      <section>
        <h2>8. Liability</h2>
        <p>
          StayEase provides the booking platform &quot;as is.&quot; We work to keep
          availability accurate and payments reliable, but we don&apos;t guarantee
          uninterrupted service, and we&apos;re not liable for losses arising from a
          Host&apos;s conduct, property condition, or a guest&apos;s conduct during a stay,
          beyond what applicable Indian consumer protection law requires.
        </p>
      </section>

      <section>
        <h2>9. Changes to these terms</h2>
        <p>
          We may update these terms as the product evolves. Material changes will be reflected
          here with an updated date at the top of this page.
        </p>
      </section>

      <section>
        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of India. Any disputes will be subject to the
          jurisdiction of the courts in the location where StayEase is registered.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>Questions about these terms can be sent to the contact details listed on our homepage.</p>
      </section>
    </LegalPage>
  );
}
