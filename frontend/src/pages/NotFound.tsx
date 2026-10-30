import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks';

export default function NotFound() {
  useDocumentTitle('Not found');
  return (
    <div className="container-app py-24 text-center">
      <p className="mono text-cyan2-400">404 · no trace found</p>
      <h1 className="mt-2 text-3xl">That page is not in the evidence locker</h1>
      <Link to="/dashboard" className="btn btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
