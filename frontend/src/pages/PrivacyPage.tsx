import React from 'react';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { Shield } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <MetaTags
        title="Privacy Policy"
        description="Privacy policy outline and data processing disclosure for ticketing and anti-bot integrity."
        canonicalPath="/privacy"
      />

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-[#5c34d7]" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#5c34d7]">
            Platform Policy Outline
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b0519]">
          Privacy Policy
        </h1>
        <p className="mt-1 text-xs text-[#524b64]">
          Last revised: [PLACEHOLDER DATE]
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-[#0b0519]">
        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            1. Account Data
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Description of personal registration details collected, including full legal name, verified email address, phone number, and government-issued credential identifiers necessary for binding entry passes.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            2. Booking Data
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Description of transaction records, temporary hold allocations, seat selections, purchase history, and cryptographic ticket hashes linked to verified account profiles.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            3. Behavior Signals Used for Bot Detection
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Disclosure of interaction telemetry, automated bot detection heuristics, virtual queue dynamics, device session integrity, and rate-limiting signals processed to prevent bulk scalper extraction.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            4. Screenshots Analyzed by an AI Service
          </h2>
          <p className="text-xs text-[#524b64] mb-3">
            [PLACEHOLDER: Explanation of automated resale post scanning. When secondary ticket listings or black-market resales are reported, visual screenshots and listing metadata may be submitted to an external AI service to detect unauthorized ticket resale.]
          </p>
          <div className="bg-[#faf8fe] border border-[#cbbfef] rounded-[6px] p-4 text-xs text-[#0b0519]">
            <p className="font-semibold mb-1">
              Third-Party AI Service Provider Processing Notice:
            </p>
            <p className="text-[#524b64]">
              Behavior signals and flagged unauthorized resale screenshots may be processed by [AI PROVIDER NAME] solely for the purposes of detecting fraudulent automation and enforcing anti-scalping terms.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            5. Data Retention
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Retention schedules for account information, booking histories, anti-fraud telemetry logs, and post-event cryptographic ticket records.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            6. User Rights
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Specific consumer privacy rights, including access, correction, deletion, and export of stored personal and booking records under applicable law.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0b0519] mb-2 pb-1 border-b border-[#dfd8f5]">
            7. Contact
          </h2>
          <p className="text-xs text-[#524b64]">
            [PLACEHOLDER: Privacy officer contact email at [CONTACT EMAIL], legal representative address at [LEGAL ADDRESS], and inquiry escalation procedures.]
          </p>
        </section>
      </Card>
    </div>
  );
};
