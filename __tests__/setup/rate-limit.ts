import { beforeEach } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
});
