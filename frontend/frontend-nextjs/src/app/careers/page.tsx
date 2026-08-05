import type { Metadata } from 'next';
import { getVacancies } from '@/lib/careers-api';
import {
  JsonLd,
  buildCareersListGraph,
  createBreadcrumbList,
  AIVORY_UK_URL,
  absoluteUrl,
} from '@/lib/seo';
import CareersClient from './CareersClient';

export const metadata: Metadata = {
  title: 'Careers — Aivory',
  description:
    'Open roles at Aivory. We hire people who prefer clear thinking over noise. Browse current openings in engineering, product, and operations.',
  alternates: {
    canonical: '/careers',
    languages: { en: '/careers', id: '/careers' },
  },
  openGraph: {
    title: 'Careers — Aivory',
    description:
      'Open roles at Aivory. We hire people who prefer clear thinking over noise. Browse current openings.',
  },
};

export default async function CareersPage() {
  let vacancies: Awaited<ReturnType<typeof getVacancies>> = [];

  try {
    vacancies = await getVacancies();
  } catch (err) {
    console.error('[CareersPage] Failed to fetch vacancies:', err);
  }

  return (
    <>
      <JsonLd data={buildCareersListGraph(AIVORY_UK_URL, vacancies)} />
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', item: absoluteUrl('/') },
          { name: 'Careers', item: absoluteUrl('/careers') },
        ])}
      />
      <CareersClient vacancies={vacancies} />
    </>
  );
}
