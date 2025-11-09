import { createSignal, createEffect, For, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { api } from "../services/api.js";
import { useTheme } from "../contexts/ThemeContext.js";
import Timeline from "../components/Timeline.js";
import type {
  PageWithEndpoints,
  EndpointWithStats,
  Check,
  Incident,
} from "../types/api.js";

export default function StatusPage() {
  const params = useParams();
  const { theme, toggleTheme } = useTheme();
  const [page, setPage] = createSignal<PageWithEndpoints | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [showAddEndpoint, setShowAddEndpoint] = createSignal(false);
  const [showEditPage, setShowEditPage] = createSignal(false);
  const [showHistory, setShowHistory] = createSignal<number | null>(null);
  const [showEmbedBadge, setShowEmbedBadge] = createSignal(false);
  const [showCreateIncident, setShowCreateIncident] = createSignal(false);
  const [showEditIncident, setShowEditIncident] = createSignal<number | null>(
    null
  );
  const [history, setHistory] = createSignal<Check[]>([]);
  const [timeline, setTimeline] = createSignal<Check[]>([]);
  const [incidents, setIncidents] = createSignal<Incident[]>([]);
  const [historyLoading, setHistoryLoading] = createSignal(false);
  const [timelineLoading, setTimelineLoading] = createSignal(false);

  // Form state for adding endpoint
  const [newEndpoint, setNewEndpoint] = createSignal({
    name: "",
    url: "",
    method: "GET" as string,
    interval: 30,
    timeout: 10,
  });

  // Form state for editing page
  const [editPage, setEditPage] = createSignal({
    name: "",
    slug: "",
  });
  const [updating, setUpdating] = createSignal(false);
  const [updateError, setUpdateError] = createSignal<string | null>(null);

  // Form state for creating incident
  const [newIncident, setNewIncident] = createSignal({
    title: "",
    description: "",
    status: "investigating" as
      | "investigating"
      | "identified"
      | "monitoring"
      | "resolved",
  });
  const [creatingIncident, setCreatingIncident] = createSignal(false);
  const [incidentError, setIncidentError] = createSignal<string | null>(null);

  // Form state for editing incident
  const [editIncident, setEditIncident] = createSignal<{
    title: string;
    description: string;
    status: "investigating" | "identified" | "monitoring" | "resolved";
  }>({
    title: "",
    description: "",
    status: "investigating",
  });
  const [updatingIncident, setUpdatingIncident] = createSignal(false);

  async function fetchData() {
    try {
      const data = await api.pages.getPageBySlug(params.slug);
      setPage(data);
      // Initialize edit form with current page data
      setEditPage({
        name: data.name,
        slug: data.slug,
      });
      // Fetch timeline data
      await fetchTimeline();
      // Fetch incidents
      await fetchIncidents();
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchIncidents() {
    const currentPage = page();
    if (!currentPage) return;
    try {
      const data = await api.incidents.list(currentPage.id);
      setIncidents(data);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
    }
  }

  async function fetchTimeline() {
    setTimelineLoading(true);
    try {
      const data = await api.pages.getTimeline(params.slug, 24);
      setTimeline(data);
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
    } finally {
      setTimelineLoading(false);
    }
  }

  async function handleUpdatePage() {
    setUpdateError(null);
    const currentPage = page();
    if (!currentPage) return;

    if (!editPage().name.trim() || !editPage().slug.trim()) {
      setUpdateError("Name and slug are required");
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(editPage().slug)) {
      setUpdateError(
        "Slug must contain only lowercase letters, numbers, and hyphens"
      );
      return;
    }

    setUpdating(true);
    try {
      const updated = await api.pages.update(params.slug, editPage());
      setShowEditPage(false);
      // If slug changed, navigate to new URL
      if (updated.slug !== params.slug) {
        window.location.href = `/status/${updated.slug}`;
      } else {
        await fetchData();
      }
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update page");
    } finally {
      setUpdating(false);
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

  async function handleAddEndpoint() {
    const currentPage = page();
    if (!currentPage) return;

    try {
      await api.endpoints.create({
        page_id: currentPage.id,
        ...newEndpoint(),
      });
      setShowAddEndpoint(false);
      setNewEndpoint({
        name: "",
        url: "",
        method: "GET",
        interval: 30,
        timeout: 10,
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to create endpoint:", error);
      alert("Failed to create endpoint. Please check the URL and try again.");
    }
  }

  async function handleDeleteEndpoint(id: number) {
    if (!confirm("Are you sure you want to delete this endpoint?")) return;

    try {
      await api.endpoints.delete(id);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete endpoint:", error);
      alert("Failed to delete endpoint.");
    }
  }

  async function loadHistory(endpointId: number) {
    if (showHistory() === endpointId) {
      setShowHistory(null);
      return;
    }

    setHistoryLoading(true);
    setShowHistory(endpointId);
    try {
      const data = await api.endpoints.getHistory(endpointId);
      setHistory(data);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleCreateIncident() {
    const currentPage = page();
    if (!currentPage) return;

    setIncidentError(null);
    if (!newIncident().title.trim()) {
      setIncidentError("Title is required");
      return;
    }

    setCreatingIncident(true);
    try {
      await api.incidents.create({
        page_id: currentPage.id,
        title: newIncident().title,
        description: newIncident().description || undefined,
        status: newIncident().status,
      });
      setShowCreateIncident(false);
      setNewIncident({ title: "", description: "", status: "investigating" });
      await fetchIncidents();
    } catch (err: any) {
      setIncidentError(err.message || "Failed to create incident");
    } finally {
      setCreatingIncident(false);
    }
  }

  async function handleUpdateIncident(id: number) {
    setUpdatingIncident(true);
    try {
      await api.incidents.update(id, editIncident());
      setShowEditIncident(null);
      await fetchIncidents();
    } catch (err: any) {
      console.error("Failed to update incident:", err);
      alert("Failed to update incident");
    } finally {
      setUpdatingIncident(false);
    }
  }

  async function handleDeleteIncident(id: number) {
    if (!confirm("Are you sure you want to delete this incident?")) return;

    try {
      await api.incidents.delete(id);
      await fetchIncidents();
    } catch (error) {
      console.error("Failed to delete incident:", error);
      alert("Failed to delete incident");
    }
  }

  function startEditIncident(incident: Incident) {
    setEditIncident({
      title: incident.title,
      description: incident.description || "",
      status: incident.status,
    });
    setShowEditIncident(incident.id);
  }

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 md:p-8 transition-colors">
      <div class="max-w-4xl mx-auto">
        <div class="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <A
            href="/"
            class="px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition shadow flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            ← Back to Dashboard
          </A>
          <button
            onClick={toggleTheme}
            class="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition shadow shrink-0"
            title={
              theme() === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {theme() === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
        <Show
          when={!loading()}
          fallback={<div class="text-center py-20">Loading...</div>}
        >
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mb-6 transition-colors">
            <div class="flex flex-col gap-4 mb-4">
              <div class="flex-1">
                <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold dark:text-white mb-2 break-words">
                  {page()?.name}
                </h1>
                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-all">
                  /status/{page()?.slug}
                </p>
              </div>
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div
                  class={`px-3 sm:px-4 py-2 rounded-full text-white font-semibold text-sm sm:text-base text-center shrink-0 ${
                    overallStatus() === "operational"
                      ? "bg-green-500"
                      : overallStatus() === "degraded"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                >
                  {overallStatus() === "operational"
                    ? "✓ Operational"
                    : overallStatus() === "degraded"
                    ? "⚠ Degraded"
                    : "✗ Down"}
                </div>
                <div class="flex flex-wrap items-center gap-2 sm:border-l dark:border-gray-700 sm:pl-3">
                  <button
                    onClick={() => setShowEditPage(!showEditPage())}
                    class="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition"
                  >
                    {showEditPage() ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => setShowAddEndpoint(!showAddEndpoint())}
                    class="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {showAddEndpoint() ? "Cancel" : "+ Endpoint"}
                  </button>
                  <button
                    onClick={() => setShowCreateIncident(!showCreateIncident())}
                    class="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                  >
                    {showCreateIncident() ? "Cancel" : "+ Incident"}
                  </button>
                  <button
                    onClick={() => setShowEmbedBadge(!showEmbedBadge())}
                    class="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition"
                  >
                    {showEmbedBadge() ? "Hide" : "Embed"}
                  </button>
                </div>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t dark:border-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Overall Status Timeline (24h)
              </p>
              <Timeline checks={timeline()} hours={24} />
            </div>
          </div>

          <Show when={showEditPage()}>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 transition-colors">
              <h3 class="text-lg font-bold mb-4 dark:text-white">
                Edit Status Page
              </h3>
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="edit-page-name"
                  >
                    Name
                  </label>
                  <input
                    id="edit-page-name"
                    type="text"
                    value={editPage().name}
                    onInput={(e) =>
                      setEditPage({
                        ...editPage(),
                        name: e.currentTarget.value,
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., Production Services"
                  />
                </div>
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="edit-page-slug"
                  >
                    Slug
                  </label>
                  <input
                    id="edit-page-slug"
                    type="text"
                    value={editPage().slug}
                    onInput={(e) =>
                      setEditPage({
                        ...editPage(),
                        slug: e.currentTarget.value.toLowerCase(),
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., production"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    URL-friendly identifier (lowercase, numbers, hyphens only)
                  </p>
                </div>
                <Show when={updateError()}>
                  <div class="text-sm text-red-600 dark:text-red-400">
                    {updateError()}
                  </div>
                </Show>
                <button
                  onClick={handleUpdatePage}
                  disabled={updating()}
                  class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {updating() ? "Updating..." : "Update Page"}
                </button>
              </div>
            </div>
          </Show>

          <Show when={showAddEndpoint()}>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 transition-colors">
              <h3 class="text-lg font-bold mb-4 dark:text-white">
                Add New Endpoint
              </h3>
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="endpoint-name"
                  >
                    Name
                  </label>
                  <input
                    id="endpoint-name"
                    type="text"
                    value={newEndpoint().name}
                    onInput={(e) =>
                      setNewEndpoint({
                        ...newEndpoint(),
                        name: e.currentTarget.value,
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., API Server"
                  />
                </div>
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="endpoint-url"
                  >
                    URL
                  </label>
                  <input
                    id="endpoint-url"
                    type="url"
                    value={newEndpoint().url}
                    onInput={(e) =>
                      setNewEndpoint({
                        ...newEndpoint(),
                        url: e.currentTarget.value,
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="https://example.com"
                  />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      class="block text-sm font-medium mb-1 dark:text-gray-200"
                      for="method-select"
                    >
                      Method
                    </label>
                    <select
                      id="method-select"
                      value={newEndpoint().method}
                      onChange={(e) =>
                        setNewEndpoint({
                          ...newEndpoint(),
                          method: e.currentTarget.value,
                        })
                      }
                      class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      title="HTTP method"
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>PATCH</option>
                      <option>DELETE</option>
                    </select>
                  </div>
                  <div>
                    <label
                      class="block text-sm font-medium mb-1 dark:text-gray-200"
                      for="interval-input"
                    >
                      Interval (s)
                    </label>
                    <input
                      id="interval-input"
                      type="number"
                      value={newEndpoint().interval}
                      onInput={(e) =>
                        setNewEndpoint({
                          ...newEndpoint(),
                          interval: parseInt(e.currentTarget.value) || 30,
                        })
                      }
                      class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="10"
                      placeholder="30"
                      title="Check interval in seconds"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-medium mb-1 dark:text-gray-200"
                      for="timeout-input"
                    >
                      Timeout (s)
                    </label>
                    <input
                      id="timeout-input"
                      type="number"
                      value={newEndpoint().timeout}
                      onInput={(e) =>
                        setNewEndpoint({
                          ...newEndpoint(),
                          timeout: parseInt(e.currentTarget.value) || 10,
                        })
                      }
                      class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="1"
                      placeholder="10"
                      title="Request timeout in seconds"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddEndpoint}
                  class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Create Endpoint
                </button>
              </div>
            </div>
          </Show>

          <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 transition-colors">
            <h3 class="text-lg font-bold mb-3 dark:text-white">
              Public Status Page
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share this link with your users to view the public status page:
            </p>
            <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto dark:text-gray-300 mb-4">
              {`${window.location.origin}/public/${params.slug}`}
            </div>
            <A
              href={`/public/${params.slug}`}
              target="_blank"
              class="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
            >
              Open Public Page →
            </A>
          </div>

          <Show when={showEmbedBadge()}>
            <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
              <h3 class="font-bold mb-3 dark:text-white">Embed Code</h3>
              <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto dark:text-gray-300">
                {`<iframe src="${window.location.origin}/embed/${params.slug}" width="100%" height="300"></iframe>`}
              </div>
              <div class="py-3">
                <iframe
                  src={`${window.location.origin}/embed/${params.slug}`}
                  class="w-full h-full"
                  title="Status page embed preview"
                />
              </div>
              <h3 class="font-bold mt-4 mb-3 dark:text-white">Status Badge</h3>

              <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs dark:text-gray-300">
                {`![Status](${window.location.origin}${api.badge.getBadgeUrl(
                  params.slug
                )})`}
              </div>
              <div class="py-3">
                <img
                  src={api.badge.getBadgeUrl(params.slug)}
                  alt="Status"
                  class="mb-2"
                />
              </div>
            </div>
          </Show>

          <Show when={showCreateIncident()}>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 transition-colors">
              <h3 class="text-lg font-bold mb-4 dark:text-white">
                Report New Incident
              </h3>
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="incident-title"
                  >
                    Title *
                  </label>
                  <input
                    id="incident-title"
                    type="text"
                    value={newIncident().title}
                    onInput={(e) =>
                      setNewIncident({
                        ...newIncident(),
                        title: e.currentTarget.value,
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., API experiencing high latency"
                  />
                </div>
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="incident-description"
                  >
                    Description
                  </label>
                  <textarea
                    id="incident-description"
                    value={newIncident().description}
                    onInput={(e) =>
                      setNewIncident({
                        ...newIncident(),
                        description: e.currentTarget.value,
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows="3"
                    placeholder="Additional details about the incident..."
                  />
                </div>
                <div>
                  <label
                    class="block text-sm font-medium mb-1 dark:text-gray-200"
                    for="incident-status"
                  >
                    Status
                  </label>
                  <select
                    id="incident-status"
                    value={newIncident().status}
                    onChange={(e) =>
                      setNewIncident({
                        ...newIncident(),
                        status: e.currentTarget.value as
                          | "investigating"
                          | "identified"
                          | "monitoring"
                          | "resolved",
                      })
                    }
                    class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="identified">Identified</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <Show when={incidentError()}>
                  <div class="text-sm text-red-600 dark:text-red-400">
                    {incidentError()}
                  </div>
                </Show>
                <button
                  onClick={handleCreateIncident}
                  disabled={creatingIncident()}
                  class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {creatingIncident() ? "Creating..." : "Create Incident"}
                </button>
              </div>
            </div>
          </Show>

          <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl sm:text-2xl font-bold dark:text-white">
                Incidents
              </h2>
            </div>
            <div class="space-y-4">
              <For each={incidents()}>
                {(incident: Incident) => (
                  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <Show
                      when={showEditIncident() === incident.id}
                      fallback={
                        <>
                          <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                              <h3 class="text-lg font-semibold dark:text-white">
                                {incident.title}
                              </h3>
                              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {incident.description || "No description"}
                              </p>
                            </div>
                            <span
                              class={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                                incident.status === "investigating"
                                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                                  : incident.status === "identified"
                                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200"
                                  : incident.status === "monitoring"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                                  : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                              }`}
                            >
                              {incident.status}
                            </span>
                          </div>
                          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <div>
                              Created:{" "}
                              {new Date(incident.createdAt).toLocaleString()}
                              {incident.resolvedAt && (
                                <>
                                  <br />
                                  Resolved:{" "}
                                  {new Date(
                                    incident.resolvedAt
                                  ).toLocaleString()}
                                </>
                              )}
                            </div>
                            <div class="flex gap-2">
                              <button
                                onClick={() => startEditIncident(incident)}
                                class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-200 rounded transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteIncident(incident.id)
                                }
                                class="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      }
                    >
                      <div class="space-y-4">
                        <div>
                          <label
                            class="block text-sm font-medium mb-1 dark:text-gray-200"
                            for="edit-incident-title"
                          >
                            Title
                          </label>
                          <input
                            id="edit-incident-title"
                            type="text"
                            value={editIncident().title}
                            onInput={(e) =>
                              setEditIncident({
                                ...editIncident(),
                                title: e.currentTarget.value,
                              })
                            }
                            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium mb-1 dark:text-gray-200"
                            for="edit-incident-description"
                          >
                            Description
                          </label>
                          <textarea
                            id="edit-incident-description"
                            value={editIncident().description}
                            onInput={(e) =>
                              setEditIncident({
                                ...editIncident(),
                                description: e.currentTarget.value,
                              })
                            }
                            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            rows="3"
                          />
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium mb-1 dark:text-gray-200"
                            for="edit-incident-status"
                          >
                            Status
                          </label>
                          <select
                            id="edit-incident-status"
                            value={editIncident().status}
                            onChange={(e) =>
                              setEditIncident({
                                ...editIncident(),
                                status: e.currentTarget.value as
                                  | "investigating"
                                  | "identified"
                                  | "monitoring"
                                  | "resolved",
                              })
                            }
                            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="investigating">Investigating</option>
                            <option value="identified">Identified</option>
                            <option value="monitoring">Monitoring</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                        <div class="flex gap-2">
                          <button
                            onClick={() => handleUpdateIncident(incident.id)}
                            disabled={updatingIncident()}
                            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition"
                          >
                            {updatingIncident() ? "Updating..." : "Save"}
                          </button>
                          <button
                            onClick={() => setShowEditIncident(null)}
                            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
              {incidents().length === 0 && (
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                  No incidents reported yet.
                </div>
              )}
            </div>
          </div>

          <div class="space-y-4">
            <For each={page()?.endpoints || []}>
              {(ep: EndpointWithStats) => (
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 transition-colors">
                  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        class={`w-3 h-3 rounded-full shrink-0 ${statusColor(
                          ep.latest?.status || "down"
                        )}`}
                      ></div>
                      <div class="min-w-0 flex-1">
                        <h3 class="text-lg sm:text-xl font-semibold dark:text-white truncate">
                          {ep.name}
                        </h3>
                        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {ep.url}
                        </p>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {ep.method} • Check every {ep.interval}s
                        </p>
                      </div>
                    </div>
                    <div class="text-left sm:text-right shrink-0">
                      <div class="text-xl sm:text-2xl font-bold dark:text-white">
                        {ep.uptime}%
                      </div>
                      <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        24h uptime
                      </div>
                      <Show when={ep.latest?.responseTime !== null}>
                        <div class="text-xs text-gray-400 dark:text-gray-500">
                          {ep.latest?.responseTime}ms
                        </div>
                      </Show>
                    </div>
                  </div>
                  <div class="mt-3">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      24h Status Timeline
                    </p>
                    <Timeline
                      checks={timeline().filter((c) => c.endpointId === ep.id)}
                      hours={24}
                    />
                  </div>
                  <div class="flex gap-2 pt-4 border-t dark:border-gray-700">
                    <button
                      onClick={() => loadHistory(ep.id)}
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-200 rounded transition"
                    >
                      {showHistory() === ep.id ? "Hide" : "View"} History
                    </button>
                    <button
                      onClick={() => handleDeleteEndpoint(ep.id)}
                      class="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition"
                    >
                      Delete
                    </button>
                  </div>
                  <Show when={showHistory() === ep.id}>
                    <div class="mt-4 pt-4 border-t dark:border-gray-700">
                      <h4 class="font-semibold mb-2 dark:text-white">
                        Check History
                      </h4>
                      {historyLoading() ? (
                        <div class="text-center py-4">Loading...</div>
                      ) : (
                        <div class="max-h-64 overflow-x-auto overflow-y-auto">
                          <table class="w-full text-xs sm:text-sm min-w-[500px]">
                            <thead class="bg-gray-50 dark:bg-gray-700 sticky top-0">
                              <tr>
                                <th class="px-2 py-1 text-left dark:text-gray-200">
                                  Time
                                </th>
                                <th class="px-2 py-1 text-left dark:text-gray-200">
                                  Status
                                </th>
                                <th class="px-2 py-1 text-left dark:text-gray-200">
                                  Response
                                </th>
                                <th class="px-2 py-1 text-left dark:text-gray-200">
                                  Code
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={history()}>
                                {(check: Check) => (
                                  <tr class="border-t dark:border-gray-700">
                                    <td class="px-2 py-1 text-xs dark:text-gray-300">
                                      {new Date(
                                        check.checkedAt
                                      ).toLocaleString()}
                                    </td>
                                    <td class="px-2 py-1">
                                      <span
                                        class={`px-2 py-0.5 rounded text-xs ${
                                          check.status === "up"
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                            : check.status === "degraded"
                                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                            : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                                        }`}
                                      >
                                        {check.status}
                                      </span>
                                    </td>
                                    <td class="px-2 py-1 text-xs dark:text-gray-300">
                                      {check.responseTime !== null
                                        ? `${check.responseTime}ms`
                                        : "-"}
                                    </td>
                                    <td class="px-2 py-1 text-xs dark:text-gray-300">
                                      {check.statusCode || "-"}
                                    </td>
                                  </tr>
                                )}
                              </For>
                            </tbody>
                          </table>
                          {history().length === 0 && (
                            <div class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                              No check history available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
