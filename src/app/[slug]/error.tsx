"use client";

import { ClinicError } from "@/components/ClinicError";

export default function ClinicSegmentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ClinicError reset={reset} />;
}
