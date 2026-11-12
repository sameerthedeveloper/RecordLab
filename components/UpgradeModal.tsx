"use client";

import { Sparkles } from "lucide-react";
import { useBillingConfig, useSubscription } from "@/lib/billing";
import { Modal } from "./Modal";
import { SubscriptionPanel } from "./SubscriptionPanel";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}

/** Opens when a free account is out of room: the full subscription block, with the reason on top. */
export function UpgradeModal({ open, onClose, onToast }: UpgradeModalProps) {
  const cfg = useBillingConfig();
  const sub = useSubscription();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sub ? "You're on Pro" : "Your free records are full"}
      description={
        sub
          ? "Unlimited cloud records."
          : `Free keeps ${cfg?.freeLimit ?? 15} records in the cloud. Go Pro to keep saving, or delete one you no longer need. You can manage your plan any time in Settings > Billing.`
      }
      icon={Sparkles}
      size="md"
    >
      <SubscriptionPanel onToast={onToast} onDone={onClose} />
    </Modal>
  );
}
