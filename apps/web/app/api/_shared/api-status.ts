import { withApiMetrics } from "@/observability/server-metrics.ts";
import { jsonResponse } from "@/utils/http.ts";

export interface ApiStatusResponseBody {
  message: string;
}

export const API_STATUS_MESSAGE = "API is running";

export function respondWithApiStatus(
  req: Request,
  path: string = "/api",
): Promise<Response> {
  return withApiMetrics(req, path, async () => {
    const body: ApiStatusResponseBody = { message: API_STATUS_MESSAGE };
    return jsonResponse(body, {}, req);
  });
}
