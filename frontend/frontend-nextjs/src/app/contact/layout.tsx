import type { ReactNode } from 'react';
import {
  JsonLd,
  buildContactPageGraph,
  createBreadcrumbList,
  AIVORY_UK_URL,
  absoluteUrl,
} from '@/lib/seo';

export default function ContactLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={buildContactPageGraph(AIVORY_UK_URL)} />
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', item: absoluteUrl('/') },
          { name: 'Contact', item: absoluteUrl('/contact') },
        ])}
      />
      {children}
    </>
  );
}
