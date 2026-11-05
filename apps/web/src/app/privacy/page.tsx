'use client';

import { LegalPage } from '@/components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      titleKey="legal.privacy"
      sections={[
        ['privacy.whatH', 'privacy.whatB'],
        ['privacy.whyH', 'privacy.whyB'],
        ['privacy.aiH', 'privacy.aiB'],
        ['privacy.whereH', 'privacy.whereB'],
        ['privacy.rightsH', 'privacy.rightsB'],
        ['privacy.neverH', 'privacy.neverB'],
      ]}
    />
  );
}
