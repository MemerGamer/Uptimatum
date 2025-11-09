import { For } from "solid-js";
import type { Check } from "../types/api.js";

interface TimelineProps {
  checks: Check[];
  hours?: number; // Number of hours to show (default 24)
}

export default function Timeline(props: TimelineProps) {
  const hours = props.hours || 24;
  const now = Date.now();
  const startTime = now - hours * 60 * 60 * 1000;

  // Group checks into time buckets (e.g., 1 hour buckets)
  const bucketSize = hours <= 24 ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000; // 1 hour for 24h, 2 hours for longer
  const buckets: Array<{
    time: number;
    status: "up" | "down" | "degraded" | "unknown";
  }> = [];

  // Create buckets
  for (let i = 0; i < hours; i++) {
    const bucketStart = startTime + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;

    // Find checks in this bucket
    const bucketChecks = props.checks.filter((check) => {
      const checkTime = new Date(check.checkedAt).getTime();
      return checkTime >= bucketStart && checkTime < bucketEnd;
    });

    // Determine status for this bucket
    let status: "up" | "down" | "degraded" | "unknown" = "unknown";
    if (bucketChecks.length > 0) {
      const downCount = bucketChecks.filter((c) => c.status === "down").length;
      const degradedCount = bucketChecks.filter(
        (c) => c.status === "degraded"
      ).length;

      if (downCount > 0) {
        status = "down";
      } else if (degradedCount > 0) {
        status = "degraded";
      } else {
        status = "up";
      }
    }

    buckets.push({ time: bucketStart, status });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "up":
        return "bg-green-500 dark:bg-green-600";
      case "degraded":
        return "bg-yellow-500 dark:bg-yellow-600";
      case "down":
        return "bg-red-500 dark:bg-red-600";
      default:
        return "bg-gray-300 dark:bg-gray-600";
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div class="w-full">
      <div class="flex items-center gap-1 mb-2">
        <For each={buckets}>
          {(bucket) => (
            <div
              class={`flex-1 h-8 rounded ${getStatusColor(
                bucket.status
              )} transition-all hover:opacity-80 cursor-pointer`}
              title={`${formatTime(bucket.time)}: ${bucket.status}`}
            />
          )}
        </For>
      </div>
      <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatTime(startTime)}</span>
        <span>Now</span>
      </div>
    </div>
  );
}
