import { LegalPage } from '@/components/legal/legal-page';

export const metadata = { title: 'Cancellation & Refund Policy' };

export default function CancellationRefundPage() {
  return (
    <LegalPage title="Cancellation & Refund Policy" lastUpdated="September 4, 2026">
      <section>
        <h2>1. Before you pay: the 10-minute hold</h2>
        <p>
          When you submit a booking, StayEase holds those dates for <strong>10 minutes</strong>{' '}
          while you complete payment. If you don&apos;t pay within that window, the hold
          expires automatically, the dates are released, and <strong>nothing is charged</strong>
          . There&apos;s nothing to cancel at this stage — you simply haven&apos;t paid yet.
        </p>
      </section>

      <section>
        <h2>2. After payment: cancelling a confirmed booking</h2>
        <p>
          This is a pilot-stage default and may vary by property — check the specific
          listing&apos;s house rules where noted. Unless a listing states otherwise:
        </p>
        <ul>
          <li>
            <strong>48 hours or more before check-in:</strong> full refund, minus any payment
            processing fee that is non-refundable to us.
          </li>
          <li>
            <strong>Less than 48 hours before check-in:</strong> the booking is non-refundable,
            since the Host has already turned away other bookings for those dates.
          </li>
          <li>
            <strong>No-shows:</strong> treated the same as a late cancellation — non-refundable.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How to cancel</h2>
        <p>
          At pilot stage, cancellations are handled by contacting the Host or StayEase directly
          using the contact details in your booking confirmation email — self-serve
          cancellation from the booking page is on our roadmap but not live yet.
        </p>
      </section>

      <section>
        <h2>4. How refunds are paid</h2>
        <p>
          Approved refunds are issued back to the original UPI account used for payment,
          processed through PhonePe. Refunds typically reflect within 5-7 business days,
          depending on your bank — this timeline is set by the banking network, not by
          StayEase.
        </p>
      </section>

      <section>
        <h2>5. Host-initiated cancellations</h2>
        <p>
          In the rare case a Host needs to cancel a confirmed, paid booking (e.g. the property
          becomes unavailable), you&apos;ll receive a full refund regardless of how close it is
          to check-in, and we&apos;ll help you find alternative accommodation where possible.
        </p>
      </section>

      <section>
        <h2>6. Payment failures and duplicate charges</h2>
        <p>
          If a payment fails partway through, the booking is automatically cancelled and the
          dates are released — you will not be charged for a failed payment. If you believe
          you were charged twice for the same booking, contact us with your transaction
          reference and we&apos;ll investigate and refund any duplicate charge.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          For cancellation or refund requests, use the contact details on our homepage or the
          contact information in your booking confirmation email.
        </p>
      </section>
    </LegalPage>
  );
}
