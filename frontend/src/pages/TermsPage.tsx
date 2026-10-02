import React from 'react';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { FileText } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <MetaTags
        title="Terms and Conditions"
        description="Terms and conditions governing ticket allocation, fair queues, and resale restrictions."
        canonicalPath="/terms"
      />

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-[#5c34d7]" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#5c34d7]">
            Platform Agreement
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b0519]">
          Terms and Conditions
        </h1>
        <p className="mt-1 text-xs text-[#524b64]">
          Last revised: [PLACEHOLDER DATE]
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-[#0b0519]">
        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            1. Agreement to Terms
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Legal text establishing binding agreement between user and platform operator [LEGAL ENTITY NAME].]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            2. Anti-Scalping and Non-Transferability Rules
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Strict terms prohibiting unauthorized resale, secondary market postings, and bot-assisted bulk purchasing. Tickets found on unauthorized platforms are subject to immediate revocation without refund.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            3. Virtual Waiting Room and Randomized Queues
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Terms governing randomized queue allocation, queue token validity, and refusal of automated requests.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            4. Atomic Seat Hold and Expiry Policy
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Details on the 5-minute temporary seat hold window, automatic release upon expiration or failed payment processing.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            5. Rotating Cryptographic Pass Validation
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Gate entry policies requiring live display of the dynamic, refreshing QR pass on a mobile device with government matching identification.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            6. Limitation of Liability and Governing Law
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Standard jurisdiction, dispute resolution, governing law of [JURISDICTION], and limitation of liability provisions.]
          </p>
        </section>
      </Card>
    </div>
  );
};
