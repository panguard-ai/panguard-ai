export interface PressItem {
  slug: string;
  title: string;
  type: 'press-release' | 'coverage';
  source?: string;
  date: string;
  excerpt: string;
}

export const pressItems: PressItem[] = [
  {
    slug: 'launch-free-scanner',
    title: 'Panguard AI Launches Free AI-Powered Security Scanner for Developers',
    type: 'press-release',
    date: '2026-02-10',
    excerpt:
      'Panguard AI today announced the general availability of Panguard Scan, a free 60-second AI security audit tool for servers and endpoints.',
  },
];
