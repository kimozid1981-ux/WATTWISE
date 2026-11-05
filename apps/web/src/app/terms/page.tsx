'use client';

import { LegalPage } from '@/components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      titleKey="legal.terms"
      sections={[
        ['terms.serviceH', 'terms.serviceB'],
        ['terms.estimatesH', 'terms.estimatesB'],
        ['terms.independenceH', 'terms.independenceB'],
        ['terms.accountH', 'terms.accountB'],
      ]}
    />
  );
}
