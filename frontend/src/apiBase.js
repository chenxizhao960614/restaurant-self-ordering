export function getApiBase() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const host = window.location.hostname || "localhost";
  return `http://${host}:4000`;
}
