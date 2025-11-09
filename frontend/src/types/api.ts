// API Response Types

export interface Page {
  id: number;
  slug: string;
  name: string;
  createdAt: string;
}

export interface Check {
  id: number;
  endpointId: number;
  status: "up" | "down" | "degraded";
  responseTime: number | null;
  statusCode: number | null;
  error: string | null;
  checkedAt: string;
}

export interface Endpoint {
  id: number;
  pageId: number;
  name: string;
  url: string;
  method: string;
  interval: number;
  timeout: number;
  active: boolean;
  createdAt: string;
}

export interface EndpointWithStats extends Endpoint {
  latest: Check | null;
  uptime: string;
}

export interface PageWithEndpoints extends Page {
  endpoints: EndpointWithStats[];
}

export interface ErrorResponse {
  error: string;
}

export interface Incident {
  id: number;
  pageId: number;
  title: string;
  description: string | null;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}
