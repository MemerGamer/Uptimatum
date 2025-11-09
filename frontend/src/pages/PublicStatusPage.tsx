import { createSignal, createEffect, For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { api } from "../services/api.js";
import Timeline from "../components/Timeline.js";
import type {
  PageWithEndpoints,
  EndpointWithStats,
  Check,
  Incident,
} from "../types/api.js";

export default function PublicStatusPage() {
  const params = useParams();
  const [page, setPage] = createSignal<PageWithEndpoints | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [timeline, setTimeline] = createSignal<Check[]>([]);
  const [incidents, setIncidents] = createSignal<Incident[]>([]);

  async function fetchData() {
    try {
      const data = await api.pages.getPageBySlug(params.slug);
      setPage(data);
      const timelineData = await api.pages.getTimeline(params.slug, 24);
      setTimeline(timelineData);
      // Fetch incidents
      const incidentsData = await api.incidents.list(data.id);
      setIncidents(incidentsData);
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setLoading(false);
    }
  }

  createEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  });

  const statusColor = (s: string) =>
    s === "up"
      ? "bg-green-500"
      : s === "degraded"
      ? "bg-yellow-500"
      : "bg-red-500";

  const overallStatus = () => {
    const currentPage = page();
    if (!currentPage) return "unknown";
    const eps = currentPage.endpoints || [];
    const anyDown = eps.some((e) => e.latest?.status === "down");
    const allUp = eps.every((e) => e.latest?.status === "up");
    return anyDown ? "down" : allUp ? "operational" : "degraded";
  };

  return (
    <div class="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <Show
          when={!loading()}
          fallback={<div class="text-center py-20">Loading...</div>}
        >
          <div class="text-center mb-8 sm:mb-12">
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold dark:text-white mb-4 px-2">
              {page()?.name}
            </h1>
            <div class="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                class={`w-3 h-3 rounded-full ${statusColor(overallStatus())}`}
              ></div>
              <span class="text-base sm:text-lg font-semibold dark:text-white text-center">
                {overallStatus() === "operational"
                  ? "All Systems Operational"
                  : overallStatus() === "degraded"
                  ? "Partial Service Degradation"
                  : "Service Disruption"}
              </span>
            </div>
          </div>

          <div class="mb-6 sm:mb-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sm:p-6">
            <h2 class="text-lg sm:text-xl font-semibold mb-4 dark:text-white">
              Status Overview (24h)
            </h2>
            <Timeline checks={timeline()} hours={24} />
          </div>

          <Show
            when={incidents().filter((i) => i.status !== "resolved").length > 0}
          >
            <div class="mb-6 sm:mb-8 space-y-4">
              <h2 class="text-xl sm:text-2xl font-bold dark:text-white">
                Active Incidents
              </h2>
              <For each={incidents().filter((i) => i.status !== "resolved")}>
                {(incident: Incident) => (
                  <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 sm:p-6">
                    <div class="flex flex-col sm:flex-row items-start sm:items-start justify-between mb-2 gap-3">
                      <div class="flex-1 min-w-0">
                        <h3 class="text-base sm:text-lg font-semibold dark:text-white break-words">
                          {incident.title}
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">
                          {incident.description || "No description provided"}
                        </p>
                      </div>
                      <span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 capitalize shrink-0">
                        {incident.status}
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Started: {new Date(incident.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <div class="space-y-4 sm:space-y-6">
            <h2 class="text-xl sm:text-2xl font-bold dark:text-white">
              Services
            </h2>
            <For each={page()?.endpoints || []}>
              {(ep: EndpointWithStats) => (
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
                  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        class={`w-3 h-3 rounded-full shrink-0 ${statusColor(
                          ep.latest?.status || "down"
                        )}`}
                      ></div>
                      <div class="min-w-0 flex-1">
                        <h3 class="text-base sm:text-lg font-semibold dark:text-white truncate">
                          {ep.name}
                        </h3>
                        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {ep.url}
                        </p>
                      </div>
                    </div>
                    <div class="text-left sm:text-right shrink-0">
                      <div class="text-lg sm:text-xl font-bold dark:text-white">
                        {ep.uptime}%
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        uptime
                      </div>
                    </div>
                  </div>
                  <div class="mt-4">
                    <Timeline
                      checks={timeline().filter((c) => c.endpointId === ep.id)}
                      hours={24}
                    />
                  </div>
                </div>
              )}
            </For>
          </div>

          <div class="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Last updated: {new Date().toLocaleString()}</p>
            <p class="mt-2">Status updates every 30 seconds</p>
          </div>
        </Show>
      </div>
    </div>
  );
}
