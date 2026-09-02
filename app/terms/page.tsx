export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-sm text-navy-700">
      <h1 className="text-2xl font-semibold text-navy-900">Terms of use</h1>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        Draft for the Koh Samui pilot. These terms must be reviewed by a lawyer before Borrow
        operates beyond a closed test group.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">1. What Borrow is</h2>
      <p>
        Borrow is an intermediation platform. It puts members in touch so that one can rent an item
        from another, or book a service from another. Borrow is not a party to the rental or the
        service, does not own the items listed, and does not provide the services offered.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">2. Money</h2>
      <p>
        Borrow charges a service fee to the borrower, shown before confirmation. The rental price
        and any deposit are paid directly between members at handover; Borrow neither collects nor
        holds those amounts, and has no obligation in respect of them.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">3. Cancellation</h2>
      <p>
        A request not answered within 48 hours expires at no cost. A booking cancelled 48 hours or
        more before its start is refunded of the service fee. A booking cancelled later is not. If
        the owner cancels after accepting, the borrower is refunded the service fee.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">4. Responsibility between members</h2>
      <p>
        The borrower is responsible for the item from handover until return, and must return it in
        the condition documented at handover. The owner is responsible for the item being safe, as
        described, and legal to rent. Borrow provides no insurance and no guarantee.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">5. Services</h2>
      <p>
        A member offering a service warrants that they hold the qualifications, licences and
        insurance required to provide it. This is a personal warranty from that member. Borrow
        verifies the certifications submitted to it but is not responsible for the service.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">6. Disputes</h2>
      <p>
        Either party may open a dispute up to 7 days after a booking ends. Borrow acts as a neutral
        party and decides on the evidence provided. A member acting in bad faith may be removed.
      </p>

      <h2 className="pt-2 font-medium text-navy-900">7. Acceptable use</h2>
      <p>
        Members must not list anything illegal, stolen, unsafe, or which they have no right to
        rent, and must not use Borrow to harass another member or to move a transaction off the
        platform in order to avoid the service fee.
      </p>
    </div>
  );
}
