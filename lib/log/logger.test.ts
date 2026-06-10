import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("suppresses debug/info in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.debug("secret");
    logger.info("secret");
    expect(log).not.toHaveBeenCalled();
  });

  it("always logs errors", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom");
    expect(err).toHaveBeenCalledWith("boom");
  });

  it("logs debug/info outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello");
    expect(log).toHaveBeenCalled();
  });
});
