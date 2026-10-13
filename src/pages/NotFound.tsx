import {CompassIcon} from '@phosphor-icons/react';
import {EmptyState, LinkButton} from '../components/ui';

export function NotFound() {
  return (
    <EmptyState icon={CompassIcon} title="This page doesn’t exist" action={<LinkButton to="/" variant="primary">Go to the dashboard</LinkButton>}>
      The link may be old, or the demo data was reset.
    </EmptyState>
  );
}
