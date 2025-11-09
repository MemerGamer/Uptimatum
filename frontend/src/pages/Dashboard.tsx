import { createSignal, createEffect, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { api } from "../services/api.js";
import { useTheme } from "../contexts/ThemeContext.js";
import Timeline from "../components/Timeline.js";
import type { Page, Check } from "../types/api.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [pages, setPages] = createSignal<Page[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showCreatePage, setShowCreatePage] = createSignal(false);
  const [pageTimelines, setPageTimelines] = createSignal<
    Record<number, Check[]>
  >({});
  const [newPage, setNewPage] = createSignal({
    name: "",
    slug: "",
  });
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    try {
      const data = await api.pages.listPages();
      setPages(data);
      // Fetch timeline for each page
      const timelines: Record<number, Check[]> = {};
      for (const page of data) {
        try {
          const timeline = await api.pages.getTimeline(page.slug, 24);
          timelines[page.id] = timeline;
        } catch (error) {
          console.error(`Failed to fetch timeline for ${page.slug}:`, error);
        }
      }
      setPageTimelines(timelines);
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setLoading(false);
    }
  });

  async function handleCreatePage() {
    setError(null);
    if (!newPage().name.trim() || !newPage().slug.trim()) {
      setError("Name and slug are required");
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(newPage().slug)) {
      setError(
        "Slug must contain only lowercase letters, numbers, and hyphens"
      );
      return;
    }

    setCreating(true);
    try {
      const page = await api.pages.create(newPage());
      setShowCreatePage(false);
      setNewPage({ name: "", slug: "" });
      await fetchPages();
      navigate(`/status/${page.slug}`);
    } catch (err: any) {
      setError(err.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  }

  async function fetchPages() {
    try {
      const data = await api.pages.listPages();
      setPages(data);
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    }
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 md:p-8 transition-colors">
      <div class="max-w-5xl mx-auto">
        <div class="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <div class="text-center sm:text-left flex-1">
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              Uptimatum
            </h1>
            <p class="text-base sm:text-lg text-blue-100 dark:text-gray-300">
              Uptime Monitoring Platform
            </p>
          </div>
          <button
            onClick={toggleTheme}
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition shrink-0"
            title={
              theme() === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {theme() === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 transition-colors">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 class="text-xl sm:text-2xl font-bold dark:text-white">
              Status Pages
            </h2>
            <button
              onClick={() => setShowCreatePage(!showCreatePage())}
              class="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              {showCreatePage() ? "Cancel" : "+ New Page"}
            </button>
          </div>

          <Show when={showCreatePage()}>
            <div class="mb-6 p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 class="text-lg font-semibold mb-4 dark:text-white">
                Create New Status Page
              </h3>
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="page-name"
                  >
                    Name
                  </label>
                  <input
                    id="page-name"
                    type="text"
                    value={newPage().name}
                    onInput={(e) => {
                      const name = e.currentTarget.value;
                      setNewPage({ name, slug: generateSlug(name) });
                    }}
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    placeholder="e.g., Production Services"
                  />
                </div>
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="page-slug"
                  >
                    Slug
                  </label>
                  <input
                    id="page-slug"
                    type="text"
                    value={newPage().slug}
                    onInput={(e) =>
                      setNewPage({
                        ...newPage(),
                        slug: e.currentTarget.value.toLowerCase(),
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    placeholder="e.g., production"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    URL-friendly identifier (lowercase, numbers, hyphens only)
                  </p>
                </div>
                <Show when={error()}>
                  <div class="text-sm text-red-600 dark:text-red-400">
                    {error()}
                  </div>
                </Show>
                <button
                  onClick={handleCreatePage}
                  disabled={creating()}
                  class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {creating() ? "Creating..." : "Create Page"}
                </button>
              </div>
            </div>
          </Show>

          {loading() ? (
            <div class="text-center py-8 dark:text-gray-300">Loading...</div>
          ) : (
            <div class="grid gap-4">
              <For each={pages()}>
                {(page: Page) => (
                  <A
                    href={`/status/${page.slug}`}
                    class="block p-4 sm:p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition dark:bg-gray-700"
                  >
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex-1 min-w-0">
                        <h3 class="text-lg sm:text-xl font-semibold dark:text-white truncate">
                          {page.name}
                        </h3>
                        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          /status/{page.slug}
                        </p>
                      </div>
                    </div>
                    <div class="mt-3">
                      <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        24h Status Timeline
                      </p>
                      <Timeline
                        checks={pageTimelines()[page.id] || []}
                        hours={24}
                      />
                    </div>
                  </A>
                )}
              </For>
              {pages().length === 0 && (
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                  No status pages yet. Create one to get started!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
