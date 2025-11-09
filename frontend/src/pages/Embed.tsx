import { createSignal, createEffect, For } from "solid-js";
import { useParams } from "@solidjs/router";
import { api } from "../services/api.js";
import type { PageWithEndpoints, EndpointWithStats } from "../types/api.js";

export default function Embed() {
  const params = useParams();
  const [page, setPage] = createSignal<PageWithEndpoints | null>(null);

  createEffect(async () => {
    try {
      const data = await api.pages.getPageBySlug(params.slug);
      setPage(data);
    } catch (error) {
      console.error("Failed to fetch page:", error);
    }
  });

  const statusColor = (s: string) =>
    s === "up" ? "bg-green-500" : "bg-red-500";

  return (
    <div class="p-4 bg-gray-50">
      <h2 class="text-xl font-bold mb-4">{page()?.name}</h2>
      <div class="space-y-2">
        <For each={page()?.endpoints || []}>
          {(ep: EndpointWithStats) => (
            <div class="bg-white rounded shadow-sm p-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div
                  class={`w-2 h-2 rounded-full ${statusColor(
                    ep.latest?.status || "down"
                  )}`}
                ></div>
                <span class="font-medium text-sm">{ep.name}</span>
              </div>
              <span class="text-xs text-gray-600">{ep.uptime}%</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
