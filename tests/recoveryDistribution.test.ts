import { describe, expect, it } from "vitest";
import { getRecoveryDistribution } from "../src/lib/question-generator";

describe("distribuição da recuperação por subtópico fraco", () => {
  it.each([15, 30, 45, 65])("reserva ao subtópico pelo menos 40%% de %i questões", (total) => {
    const distribution = getRecoveryDistribution(total);
    expect(distribution.direct).toBe(Math.ceil(total * 0.4));
    expect(distribution.direct / total).toBeGreaterThanOrEqual(0.4);
    expect(distribution.direct + distribution.broader).toBe(total);
  });
});
