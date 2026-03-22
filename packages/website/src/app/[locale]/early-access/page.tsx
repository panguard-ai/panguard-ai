import { redirect } from 'next/navigation';

/**
 * Early access page is no longer needed — PanGuard is publicly available.
 * Redirect visitors to the homepage.
 */
export default function EarlyAccessPage() {
  redirect('/');
}
