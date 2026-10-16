const configuredUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";
const normalizedUrl = configuredUrl.replace(/\/+$/, "");
const API_BASE_URL = /\/api$/i.test(normalizedUrl)
  ? normalizedUrl
  : `${normalizedUrl}/api`;

export function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("quickline_token");
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const authToken = token();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  let response;
  try {
    response = await fetch(
      `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
      { ...options, headers, cache: "no-store" }
    );
  } catch (error) {
    throw new Error(
      `Cannot reach the backend. Confirm it is running and NEXT_PUBLIC_API_URL in .env.local is correct.`,
      { cause: error }
    );
  }

  const responseText = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let data = responseText;

  if (responseText && contentType.includes("application/json")) {
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The backend returned invalid JSON.", { cause: error });
    }
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error?.errorMessage ||
        `Request failed (${response.status})`
    );
  }

  return data;
}
