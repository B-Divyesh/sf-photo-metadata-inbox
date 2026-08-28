interface VerifyRequest {
  headers?: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
}

interface VerifyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface VerifyHandlerOptions {
  limit?: number;
  windowMs?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

export function createVerifyHandler(options?: VerifyHandlerOptions): (request: VerifyRequest) => Promise<VerifyResponse>;
