const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiClient {
  private getHeaders(): HeadersInit {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw { status: res.status, ...error };
    }
    return res.json();
  }

  async post(endpoint: string, body: unknown, method: string = "POST") {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw { status: res.status, ...error };
    }
    return res.json();
  }

  async delete(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw { status: res.status, ...error };
    }
    return res.json();
  }
}

export const api = new ApiClient();
