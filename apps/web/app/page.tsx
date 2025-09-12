import { redirect } from 'next/navigation';

// This page forwards to the static site. Marking it dynamic avoids build-time
// errors when `redirect` is executed without a request context.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  redirect('/_static/');
}

