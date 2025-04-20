import axios from "axios";

const API_BASE = "http://localhost:8000";

export interface EmbedResponse {
  status: "success";
  embedding: number[];
  url: string;
}

export interface SearchResult {
  id: string;
  score: number;
}

export interface SearchResponse {
  status: "success";
  query: string;
  results_count: number;
  results: SearchResult[];
}

export interface CoordinateResult {
  id: string;
  scores: number[];
}

export interface CoordinateResponse {
  status: "success";
  queries: string[];
  axis_count: number;
  results_count: number;
  results: CoordinateResult[];
}

// POST /embed-website
export async function embedWebsite(
  files: File[],
  text: string,
  url: string
): Promise<EmbedResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("text", text);
  formData.append("url", url);

  const response = await axios.post(`${API_BASE}/embed-website`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

// POST /search_vectors
export async function searchVectors(
  query: string,
  k_returns = 5
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.append("query", query);
  params.append("k_returns", k_returns.toString());

  const response = await axios.post(`${API_BASE}/search_vectors`, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}

// GET /get_coordinates
export async function getCoordinates(
  axis1: string,
  axis2: string,
  axis3?: string,
  k_returns = 500
): Promise<CoordinateResponse> {
console.log("Fetching coordinates...");
  const params = new URLSearchParams();
  console.log("Axis 1:", axis1);
  console.log("Axis 2:", axis2);
  console.log("Axis 3:", axis3);
  params.append("axis1", axis1);
  params.append("axis2", axis2);
  if (axis3) params.append("axis3", axis3);

  params.append("k_returns", k_returns.toString());

    console.log("Params:", params.toString());

  const response = await axios.get(`${API_BASE}/get_coordinates`, {
    params,
  });

  if (!response.data || response.data.length === 0) {
    console.warn('⚠️ No results returned from coordinates API.');
  }

  return response.data;
}
