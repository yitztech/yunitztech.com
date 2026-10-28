import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { log, requestId } from "../../apps/api/src/observability";

describe("requestId", () => {
  test("keeps a well-formed X-Request-ID", () => {
    assert.equal(requestId("abc-123_x.y"), "abc-123_x.y");
  });
  test("replaces a missing, oversized or unsafe header with a UUID", () => {
    for (const header of [
      undefined,
      "",
      "a".repeat(129),
      "bad id",
      "x\ny",
      ["a"],
    ])
      assert.match(requestId(header), /^[0-9a-f-]{36}$/);
  });
});

describe("log", () => {
  test("writes one JSON line with time, level and msg", (t) => {
    const lines: string[] = [];
    t.mock.method(process.stdout, "write", (chunk: string) => {
      lines.push(chunk);
      return true;
    });
    log("info", "request", { requestId: "r1", status: 200 });
    t.mock.restoreAll();
    assert.equal(lines.length, 1);
    assert.ok(lines[0].endsWith("\n"));
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.level, "info");
    assert.equal(entry.msg, "request");
    assert.equal(entry.requestId, "r1");
    assert.ok(!Number.isNaN(Date.parse(entry.time)));
  });
});
