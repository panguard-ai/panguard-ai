'use client';

/**
 * Client-side tier gate.
 *
 * Renders `children` if the workspace's current tier meets `require`.
 * Otherwise renders the `upsell` slot (or nothing when omitted, which is
 * useful for purely additive enterprise-only UI).
 *
 * Usage:
 *   <TierGate require="pilot" currentTier={ws.tier} upsell={<UpsellCard ... />}>
 *     <ComplianceEvidenceSection workspaceId={ws.id} />
 *   </TierGate>
 *
 * Why a client component: gates often wrap interactive children (download
 * buttons, modals). Server components can compose with this freely since
 * the gate itself only reads from props.
 */

import type { ReactNode } from 'react';
import { meetsTier, type Tier } from './types';

export interface TierGateProps {
  require: Tier;
  currentTier: Tier;
  upsell?: ReactNode;
  children: ReactNode;
}

export function TierGate({ require, currentTier, upsell, children }: TierGateProps) {
  if (meetsTier(currentTier, require)) return <>{children}</>;
  return <>{upsell ?? null}</>;
}
