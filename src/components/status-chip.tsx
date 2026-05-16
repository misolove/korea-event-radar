import {
  deliveryTypeLabels,
  priceTypeLabels,
  registrationStatusLabels,
  statusOriginLabels,
  type DeliveryType,
  type PriceType,
  type RegistrationStatus,
  type StatusOrigin,
} from "@/lib/event-model";

type Props =
  | { kind: "status"; value: RegistrationStatus }
  | { kind: "price"; value: PriceType }
  | { kind: "origin"; value: StatusOrigin }
  | { kind: "delivery"; value: DeliveryType };

function resolveLabel(props: Props) {
  if (props.kind === "status") return registrationStatusLabels[props.value];
  if (props.kind === "price") return priceTypeLabels[props.value];
  if (props.kind === "origin") return statusOriginLabels[props.value];
  return deliveryTypeLabels[props.value];
}

function resolveClassName(props: Props) {
  if (props.kind === "status") {
    return {
      open: "chip chip-open",
      waitlist: "chip chip-waitlist",
      closed: "chip chip-closed",
      past: "chip chip-past",
      unknown: "chip chip-unknown",
    }[props.value];
  }
  if (props.kind === "price") {
    return {
      free: "chip chip-free",
      paid: "chip chip-paid",
      mixed: "chip chip-mixed",
      unknown: "chip chip-unknown",
    }[props.value];
  }
  if (props.kind === "origin") {
    return props.value === "direct" ? "chip chip-direct" : "chip chip-inferred";
  }
  return "chip chip-delivery";
}

export function StatusChip(props: Props) {
  return <span className={resolveClassName(props)}>{resolveLabel(props)}</span>;
}
