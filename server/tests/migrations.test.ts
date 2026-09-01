/**
 * `server/src/migrations.ts` — forward-only database migrations that apply to
 * the Postgres schema on server startup.
 *
 * It shipped at 0% coverage — the migration array and the runMigrations function
 * had never been tested, so nothing checked that the migrations actually run,
 * that already-applied migrations are idempotent, that failures are caught and
 * rolled back, or that the schema_migrations tracking table is created and
 * managed correctly.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PoolClient } from "pg";

// Mock db.js before importing migrations
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

const mockPool = {
  connect: vi.fn(),
};

vi.mock("../src/db.js", () => ({
  getPool: () => mockPool,
}));

const { runMigrations } = await import("../src/migrations.js");

describe("runMigrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    mockPool.connect.mockClear();
  });

  it("creates the schema_migrations table if it does not exist", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });

    await runMigrations();

    // First call: create schema_migrations table
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("schema_migrations")
    );
    // Second call: SELECT from it
    expect(mockClient.query).toHaveBeenCalledWith(
      "SELECT name FROM schema_migrations"
    );
  });

  it("applies all migrations on a fresh database", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await runMigrations();

    expect(result.ok).toBe(true);
    expect(result.applied.length).toBe(4); // The 4 migrations in MIGRATIONS
    expect(result.applied).toContain("0001_init.sql");
    expect(result.applied).toContain("0002_add_apple_oauth.sql");
    expect(result.applied).toContain("0002_founder_grant_ay2m.sql");
    expect(result.applied).toContain("0003_pdpl_and_analytics.sql");
    expect(result.alreadyApplied).toEqual([]);

    // Each migration: BEGIN, migration SQL, INSERT, COMMIT
    const beginCalls = mockClient.query.mock.calls.filter((c) =>
      c[0]?.includes("BEGIN")
    );
    const insertCalls = mockClient.query.mock.calls.filter((c) =>
      c[0]?.includes("INSERT INTO schema_migrations")
    );
    const commitCalls = mockClient.query.mock.calls.filter((c) =>
      c[0]?.includes("COMMIT")
    );

    expect(beginCalls.length).toBe(4);
    expect(insertCalls.length).toBe(4);
    expect(commitCalls.length).toBe(4);
  });

  it("skips migrations that have already been applied", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    // First call: CREATE TABLE schema_migrations
    mockClient.query
      .mockResolvedValueOnce({}) // CREATE TABLE schema_migrations
      .mockResolvedValueOnce({
        rows: [{ name: "0001_init.sql" }, { name: "0002_add_apple_oauth.sql" }],
      }) // SELECT from schema_migrations returns 2 applied
      .mockResolvedValue({ rows: [] }); // Remaining calls return empty

    const result = await runMigrations();

    expect(result.ok).toBe(true);
    expect(result.applied.length).toBe(2); // Only the 2 new ones
    expect(result.applied).toContain("0002_founder_grant_ay2m.sql");
    expect(result.applied).toContain("0003_pdpl_and_analytics.sql");
    expect(result.alreadyApplied).toEqual([
      "0001_init.sql",
      "0002_add_apple_oauth.sql",
    ]);

    // Only 2 migrations should be applied (BEGIN/INSERT/COMMIT for each)
    const beginCalls = mockClient.query.mock.calls.filter((c) =>
      c[0]?.includes("BEGIN")
    );
    expect(beginCalls.length).toBe(2);
  });

  it("is idempotent — all migrations already applied returns ok:true with empty applied array", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    // First call: CREATE TABLE schema_migrations
    mockClient.query
      .mockResolvedValueOnce({}) // CREATE TABLE schema_migrations
      .mockResolvedValueOnce({
        rows: [
          { name: "0001_init.sql" },
          { name: "0002_add_apple_oauth.sql" },
          { name: "0002_founder_grant_ay2m.sql" },
          { name: "0003_pdpl_and_analytics.sql" },
        ],
      }) // SELECT: all migrations already applied
      .mockResolvedValue({ rows: [] }); // Remaining calls

    const result = await runMigrations();

    expect(result.ok).toBe(true);
    expect(result.applied).toEqual([]);
    expect(result.alreadyApplied.length).toBe(4);

    // No BEGIN/INSERT/COMMIT should happen
    const beginCalls = mockClient.query.mock.calls.filter((c) =>
      c[0]?.includes("BEGIN")
    );
    expect(beginCalls.length).toBe(0);
  });

  it("rolls back and returns error on migration failure", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    // First: schema_migrations check
    // Second: SELECT existing migrations (empty)
    // Third: BEGIN
    // Fourth: Migration SQL fails
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // schema_migrations exists
      .mockResolvedValueOnce({ rows: [] }) // SELECT name FROM schema_migrations
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error("Syntax error in migration"));

    const result = await runMigrations();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Syntax error in migration");
    expect(result.applied).toEqual([]);
    expect(result.alreadyApplied).toEqual([]);

    // Should have called ROLLBACK after the error
    const rollbackCalls = mockClient.query.mock.calls.filter((c) =>
      c[0]?.includes("ROLLBACK")
    );
    expect(rollbackCalls.length).toBeGreaterThan(0);
  });

  it("releases the client in the finally block even on error", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockRejectedValue(new Error("Database is down"));

    const result = await runMigrations();

    expect(result.ok).toBe(false);
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("releases the client in the finally block on success", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await runMigrations();

    expect(result.ok).toBe(true);
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("does not call release if connect fails", async () => {
    mockPool.connect.mockRejectedValue(new Error("Cannot connect"));

    const result = await runMigrations();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Cannot connect");
    expect(mockClient.release).not.toHaveBeenCalled();
  });

  it("returns migrations in order", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await runMigrations();

    expect(result.applied[0]).toBe("0001_init.sql");
    expect(result.applied[1]).toBe("0002_add_apple_oauth.sql");
    expect(result.applied[2]).toBe("0002_founder_grant_ay2m.sql");
    expect(result.applied[3]).toBe("0003_pdpl_and_analytics.sql");
  });

  it("handles both database and connection errors generically", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockRejectedValue(
      new Error("Connection timeout: database not responding")
    );

    const result = await runMigrations();

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
  });

  it("handles non-Error objects thrown by the database", async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockRejectedValue("some string error");

    const result = await runMigrations();

    expect(result.ok).toBe(false);
    expect(result.error).toBe("some string error");
  });
});
