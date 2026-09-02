import { Card } from "@/components/ui";

export const metadata = { title: "Safety" };

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-navy-900">Safety and trust</h1>

      <Card className="border-brick/30 bg-red-50">
        <h2 className="mb-2 font-medium text-brick-dark">Borrow is not an insurer</h2>
        <p className="text-sm text-navy-700">
          There is no insurance behind a Borrow booking. If an item is damaged or not returned, the
          deposit and whatever you agreed between yourselves is what covers it. We say this plainly
          rather than leaving it vague — unclear liability is the number one reason people distrust
          peer-to-peer platforms, and pretending otherwise would not make it safer.
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-navy-900">What we do check</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-navy-700">
          <li>Every member confirms a phone number before booking or listing.</li>
          <li>
            Services in regulated categories — diving, coaching — are reviewed by hand before going
            live, and the provider&apos;s certifications are verified before the badge appears.
          </li>
          <li>Photos at handover and at return are recorded on both sides.</li>
          <li>Reviews are double-blind, so nobody writes one in retaliation.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-navy-900">Good habits</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-navy-700">
          <li>Meet in a public place in daylight when you can.</li>
          <li>Photograph the item together, from every angle, before money changes hands.</li>
          <li>Agree the deposit amount before meeting, and hand it back in person at return.</li>
          <li>Keep the conversation inside Borrow — it is what we can look at if there is a dispute.</li>
          <li>For diving and any in-water activity, check the certification badge and ask questions.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-navy-900">Disputes</h2>
        <p className="text-sm text-navy-700">
          Either party can open a dispute up to 7 days after a booking ends. Borrow acts as a
          neutral party and decides on the evidence provided — the handover photos above all. We
          are not a court, and we cannot force a payment; what we can do is record what happened,
          decide who is right on the evidence, and remove people who act in bad faith.
        </p>
      </Card>
    </div>
  );
}
