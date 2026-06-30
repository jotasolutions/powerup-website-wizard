import { describe, expect, it } from "vitest";
import { mergeGmbResults, type GmbResult } from "./google-places.server";

function result(id: string, name = id): GmbResult {
  return { place_id: id, name, address: "Calle 1" };
}

describe("mergeGmbResults", () => {
  it("deduplica por place_id manteniendo orden", () => {
    const merged = mergeGmbResults([
      [result("a", "Bar A"), result("b", "Rest B")],
      [result("a", "Bar A dup"), result("c", "Café C")],
    ]);
    expect(merged.map((r) => r.place_id)).toEqual(["a", "b", "c"]);
    expect(merged[0].name).toBe("Bar A");
  });

  it("limita a 8 resultados", () => {
    const batchA = Array.from({ length: 5 }, (_, i) => result(`a-${i}`));
    const batchB = Array.from({ length: 5 }, (_, i) => result(`b-${i}`));
    const merged = mergeGmbResults([batchA, batchB]);
    expect(merged).toHaveLength(8);
  });
});
