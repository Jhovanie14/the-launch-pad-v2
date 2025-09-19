interface CarApiResponse<T> {
  data: T[];
  collection?: {
    url: string;
    count: number;
    pages: number;
    total: number;
  };
}

interface Make {
  id: number;
  name: string;
}

interface Model {
  id: number;
  name: string;
}

interface Trim {
  id: number;
  trim: string;
  description: string;
  msrp: number;
}

interface BodyType {
  id: number;
  body_type: string;
}
interface Color {
  id: number;
  color: string;
  rgb: string;
}

export class CarApiService {
  private baseUrl = "/api/carapi";

  async getYears(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/years`);
    return response.json();
  }

  async getMakes(year: number): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/makes?year=${year}`);
    const data: CarApiResponse<Make> = await response.json();

    if (Array.isArray(data)) {
      return data;
    } else if (Array.isArray(data.data)) {
      return data.data.map((m) => m.name);
    }
    return [];
  }

  async getModels(year: number, make: string): Promise<string[]> {
    const response = await fetch(
      `${this.baseUrl}/models?year=${year}&make=${make}`
    );
    const data: CarApiResponse<Model> = await response.json();

    if (Array.isArray(data)) {
      return data;
    } else if (Array.isArray(data.data)) {
      return data.data.map((m) => m.name);
    }
    return [];
  }

  async getTrims(year: number, make: string, model: string): Promise<Trim[]> {
    const response = await fetch(
      `${this.baseUrl}/trims?year=${year}&make=${make}&model=${model}`
    );
    const data: CarApiResponse<Trim> = await response.json();

    if (Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  }

  /**
   * Fetch body type for a specific trim. Returns a string like "SUV", "Sedan", etc.
   */
  async getBodyType(params: {
    year: number;
    make: string;
    model: string;
    trim: string;
  }): Promise<string | null> {
    const query = new URLSearchParams({
      year: String(params.year),
      make: params.make,
      model: params.model,
      trim: params.trim,
    });

    const response = await fetch(
      `${this.baseUrl}/bodytype?${query.toString()}`
    );
    const payload = await response.json();

    // Our API returns { body_type: string } or passthrough CarAPI { data: [...] }
    if (typeof payload?.body_type === "string")
      return payload.body_type as string;

    if (Array.isArray(payload?.data) && payload.data.length > 0) {
      const first = payload.data[0] as { type?: string };
      return first?.type ?? null;
    }

    return null;
  }

  async getColors(
    trimId: number,
    year: number,
    make: string,
    model: string,
    trim: string
  ): Promise<string[]> {
    const params = new URLSearchParams({
      trim_id: String(trimId),
      year: String(year),
      make,
      model,
      trim,
    });

    const response = await fetch(`${this.baseUrl}/colors?${params.toString()}`);
    const data: CarApiResponse<Color> = await response.json();

    if (Array.isArray(data.data)) {
      return data.data.map((c) => c.color);
    }
    return [];
  }
}

export const carApiService = new CarApiService();
