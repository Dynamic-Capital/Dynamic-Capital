import { strict as assert } from "node:assert";

import {
  computeNextSelfState,
  simulateSelfImprovement,
} from "../src/lib/self-improvement.ts";

const nextState = computeNextSelfState({
  currentState: 10,
  actionDelta: 2,
  reflectionGain: 0.3,
  learningGain: 0.2,
});

assert.equal(nextState, (10 + 2) * (1 + 0.3 + 0.2));

const trajectory = simulateSelfImprovement(5, [
  {
    actionDelta: 1,
    reflectionGain: 0,
    learningGain: 0,
  },
  {
    actionDelta: 2,
    reflectionGain: 0.1,
    learningGain: 0.1,
  },
]);

const expected = [5, 6, (6 + 2) * 1.2];
trajectory.forEach((value, index) => {
  const diff = Math.abs(value - expected[index]);
  assert.ok(diff < 1e-9, `trajectory mismatch at index ${index}`);
});

let errorThrown = false;
try {
  computeNextSelfState({
    currentState: Number.NaN,
    actionDelta: 0,
    reflectionGain: 0,
    learningGain: 0,
  });
} catch (error) {
  errorThrown = error instanceof TypeError;
}

assert.equal(errorThrown, true, "non-finite inputs should throw TypeError");

console.log("Self-improvement equation checks passed");
