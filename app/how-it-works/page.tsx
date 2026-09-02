import { Card } from "@/components/ui";
import { FEE_TIERS } from "@/lib/pricing";

export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-navy-900">How Borrow works</h1>

      <Card>
        <h2 className="mb-2 font-medium text-navy-900">Two kinds of listings</h2>
        <p className="text-sm text-navy-700">
          An <strong>item</strong> is rented by the day — a regulator, an underwater housing, a
          paddleboard. A <strong>service</strong> is booked on a slot — a guided dive, a coaching
          session, a class. Same platform, same people: often the person renting you the gear is
          the one who can teach you to use it.
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-navy-900">Booking</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-navy-700">
          <li>You send a request. Nothing is charged.</li>
          <li>The owner has 48 hours to accept, or the request expires.</li>
          <li>Once accepted, you pay the Borrow service fee. That confirms the booking.</li>
          <li>You get a 6-character handover code. Give it to the owner when you meet.</li>
          <li>Photos before and after. The owner confirms the return, and you both review.</li>
        </ol>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-navy-900">What Borrow charges</h2>
        <p className="mb-3 text-sm text-navy-700">
          Only a service fee, paid by the borrower. Owners pay nothing.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-navy-400">
              <th className="pb-1 font-medium">Booking value</th>
              <th className="pb-1 font-medium">Fee</th>
            </tr>
          </thead>
          <tbody className="text-navy-700">
            {FEE_TIERS.map((t, i) => (
              <tr key={t.upTo}>
                <td className="py-0.5">
                  {i === 0 ? `Under ฿${t.upTo.toLocaleString()}` : `Up to ฿${t.upTo.toLocaleString()}`}
                </td>
                <td className="py-0.5">฿{t.fee}</td>
              </tr>
            ))}
            <tr>
              <td className="py-0.5">฿12,000 and above</td>
              <td className="py-0.5">2.5%, capped at ฿900</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm text-navy-400">
          The rental price and the deposit are settled directly between the two of you at handover
          — cash or PromptPay. Borrow does not hold that money.
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-navy-900">Cancellations</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-navy-700">
          <li>Cancel 48 hours or more before the start: the fee is refunded.</li>
          <li>Cancel later than that: the fee is not refunded.</li>
          <li>If the owner cancels or does not show up, you get the fee back.</li>
          <li>A request that expires is never charged.</li>
        </ul>
      </Card>
    </div>
  );
}
