export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-sm text-navy-700">
      <h1 className="text-2xl font-semibold text-navy-900">Privacy</h1>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        Draft for the Koh Samui pilot, to be reviewed before any wider launch.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">What we store</h2>
      <p>
        Your email address, the name and photo you choose, the area of the island you are in, the
        languages you list, your phone number, your listings and bookings, the messages you send
        through Borrow, the handover photos, and the reviews you write.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">Who sees what</h2>
      <p>
        Your name, photo, area, languages, listings, verified certification badges and published
        reviews are public. Your phone number is shown only to the other party of a confirmed
        booking, and only while it is active. Your email address is never shown to other members.
        Handover photos are private to the two parties and to Borrow in case of a dispute.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">Payment</h2>
      <p>
        Card details are handled by Stripe and never reach Borrow&apos;s servers. We store only the
        payment reference for a booking.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">Your data</h2>
      <p>
        You can edit your profile at any time and ask for your account to be deleted. Bookings and
        reviews connected to other members are kept in anonymised form, because they form part of
        someone else&apos;s history on the platform.
      </p>
    </div>
  );
}
