import type {
  Page,
  PageWithEndpoints,
  Endpoint,
  Check,
  ErrorResponse,
  Incident,
} from "../types/api.js";

const API_BASE = ""; // Use relative paths - works with proxy in dev and nginx in prod

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.error || `Request failed: ${response.statusText}`);
  }

  return response.json();
}

// Pages API
export const pagesApi = {
  /**
   * Get all status pages
   */
  listPages: async (): Promise<Page[]> => {
    return request<Page[]>("/api/pages");
  },

  /**
   * Get a status page by slug with endpoints and statistics
   */
  getPageBySlug: async (slug: string): Promise<PageWithEndpoints> => {
    return request<PageWithEndpoints>(`/api/pages/${slug}`);
  },

  /**
   * Create a new status page
   */
  create: async (page: { name: string; slug: string }): Promise<Page> => {
    return request<Page>("/api/pages", {
      method: "POST",
      body: JSON.stringify(page),
    });
  },

  /**
   * Update a status page
   */
  update: async (
    slug: string,
    page: {
      name?: string;
      slug?: string;
    }
  ): Promise<Page> => {
    return request<Page>(`/api/pages/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(page),
    });
  },

  /**
   * Get timeline data for a page
   */
  getTimeline: async (slug: string, hours: number = 24): Promise<Check[]> => {
    return request<Check[]>(`/api/pages/${slug}/timeline?hours=${hours}`);
  },
};

// Endpoints API
export const endpointsApi = {
  /**
   * Get check history for an endpoint
   */
  getHistory: async (id: number): Promise<Check[]> => {
    return request<Check[]>(`/api/endpoints/${id}/history`);
  },

  /**
   * Create a new endpoint
   */
  create: async (endpoint: {
    page_id: number;
    name: string;
    url: string;
    method?: string;
    interval?: number;
    timeout?: number;
  }): Promise<Endpoint> => {
    return request<Endpoint>("/api/endpoints", {
      method: "POST",
      body: JSON.stringify(endpoint),
    });
  },

  /**
   * Delete an endpoint
   */
  delete: async (id: number): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/api/endpoints/${id}`, {
      method: "DELETE",
    });
  },
};

// Badge API
export const badgeApi = {
  /**
   * Get badge URL for a status page
   */
  getBadgeUrl: (slug: string): string => {
    return `${API_BASE}/badge/${slug}`;
  },
};

// Health API
export const healthApi = {
  /**
   * Check API health
   */
  check: async (): Promise<{ status: string }> => {
    return request<{ status: string }>("/health");
  },
};

// Incidents API
export const incidentsApi = {
  /**
   * Get all incidents for a page
   */
  list: async (pageId: number): Promise<Incident[]> => {
    return request<Incident[]>(`/api/incidents?page_id=${pageId}`);
  },

  /**
   * Create a new incident
   */
  create: async (incident: {
    page_id: number;
    title: string;
    description?: string;
    status?: "investigating" | "identified" | "monitoring" | "resolved";
  }): Promise<Incident> => {
    return request<Incident>("/api/incidents", {
      method: "POST",
      body: JSON.stringify(incident),
    });
  },

  /**
   * Update an incident
   */
  update: async (
    id: number,
    incident: {
      title?: string;
      description?: string;
      status?: "investigating" | "identified" | "monitoring" | "resolved";
    }
  ): Promise<Incident> => {
    return request<Incident>(`/api/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(incident),
    });
  },

  /**
   * Delete an incident
   */
  delete: async (id: number): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/api/incidents/${id}`, {
      method: "DELETE",
    });
  },
};

// Export all APIs
export const api = {
  pages: pagesApi,
  endpoints: endpointsApi,
  badge: badgeApi,
  health: healthApi,
  incidents: incidentsApi,
};
