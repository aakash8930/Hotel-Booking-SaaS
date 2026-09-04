import { LegalPage } from '@/components/legal/legal-page';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="September 4, 2026">
      <section>
        <h2>1. What we collect</h2>
        <p>We collect only what&apos;s needed to run a booking:</p>
        <ul>
          <li>
            <strong>Guests:</strong> name, email, and phone number, entered at checkout. No
            account or password is required to book.
          </li>
          <li>
            <strong>Hosts:</strong> name, email, phone, and business name, used to manage
            listings and receive booking notifications.
          </li>
          <li>
            <strong>Booking data:</strong> which property/room, dates, guest count, and any
            special requests you enter.
          </li>
          <li>
            <strong>Payment data:</strong> we do not collect or store your UPI PIN, bank
            account, or card details. Payments are handled by our payment partner, PhonePe,
            under their own privacy and security practices. We store only the payment status
            and a transaction reference for reconciliation.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <ul>
          <li>To create, confirm, and manage your booking.</li>
          <li>To send booking confirmation emails.</li>
          <li>To let a Host see who has booked their property, for check-in purposes.</li>
          <li>To detect and prevent fraud or abuse of the booking system.</li>
        </ul>
        <p>We do not sell your data to third parties.</p>
      </section>

      <section>
        <h2>3. Who we share it with</h2>
        <ul>
          <li>
            <strong>The Host</strong> you&apos;re booking with — they need your name, contact
            details, and stay dates to prepare for your arrival.
          </li>
          <li>
            <strong>PhonePe</strong>, our UPI payment processor, to complete and verify
            payment.
          </li>
          <li>
            We do not currently use third-party analytics or error-tracking services on guest
            data. If that changes, this policy will be updated to name the service and what it
            receives.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. How long we keep it</h2>
        <p>
          Booking and payment records are kept for as long as needed for accounting, tax, and
          dispute-resolution purposes, consistent with applicable Indian record-keeping
          requirements. You can ask us to delete personal data that isn&apos;t tied to an
          active or legally-required record by contacting us.
        </p>
      </section>

      <section>
        <h2>5. Your rights</h2>
        <p>
          You can ask us what personal data we hold about you, ask us to correct it, or ask us
          to delete it where we&apos;re not required to retain it. Contact us using the details
          on our homepage to make a request.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          We use industry-standard practices to protect stored data, including encrypted
          connections between your browser and our servers. No system is perfectly secure, and
          we can&apos;t guarantee absolute security, but we treat guest and host data as
          sensitive by default.
        </p>
      </section>

      <section>
        <h2>7. Changes to this policy</h2>
        <p>
          We may update this policy as the product changes. Material changes will be reflected
          here with an updated date at the top of this page.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Questions about this policy or your data can be sent to the contact details listed
          on our homepage.
        </p>
      </section>
    </LegalPage>
  );
}
