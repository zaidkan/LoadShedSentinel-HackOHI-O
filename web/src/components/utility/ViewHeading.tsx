import type { ReactNode } from 'react';
import { CornerDownRight } from 'lucide-react';

/** The working views use the same display, reading width and hook as Overview. */
export function ViewHeading({ id, title, description, action }: { id: string; title: ReactNode; description: ReactNode; action?: ReactNode }) {
  return <header className="view-heading">
    <h1 id={id} className="display display-l">{title}<CornerDownRight className="hook" aria-hidden="true" /></h1>
    <div className="view-heading-aside"><p className="lead">{description}</p>{action}</div>
  </header>;
}
