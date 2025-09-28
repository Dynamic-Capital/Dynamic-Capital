export interface SelfImprovementInputs {
  /**
   * The current state of the self before the update (S_t).
   */
  currentState: number;
  /**
   * The direct contribution from actions chosen this cycle (A_t).
   */
  actionDelta: number;
  /**
   * Reflection coefficient that compounds the state for the next loop (R_t).
   */
  reflectionGain: number;
  /**
   * Learning coefficient representing new insights for the next loop (L_t).
   */
  learningGain: number;
}

export interface SelfImprovementCycle
  extends Omit<SelfImprovementInputs, "currentState"> {}

const FINITE_ERROR_MESSAGE = "Self-improvement inputs must be finite numbers.";

/**
 * Computes the next self state using the self-improvement recurrence:
 *
 * S_{t+1} = (S_t + A_t) * (1 + R_t + L_t)
 */
export function computeNextSelfState({
  currentState,
  actionDelta,
  reflectionGain,
  learningGain,
}: SelfImprovementInputs): number {
  validateFinite(currentState, actionDelta, reflectionGain, learningGain);

  const base = currentState + actionDelta;
  const compoundedGain = reflectionGain + learningGain;

  return base + base * compoundedGain;
}

/**
 * Runs a sequence of self-improvement cycles, returning the state after each
 * update (including the initial state).
 */
export function simulateSelfImprovement(
  initialState: number,
  cycles: readonly SelfImprovementCycle[],
): number[] {
  validateFinite(initialState);

  const cycleCount = cycles.length;
  const states = new Array<number>(cycleCount + 1);
  states[0] = initialState;

  let currentState = initialState;

  for (let index = 0; index < cycleCount; index += 1) {
    const cycle = cycles[index];
    const { actionDelta, reflectionGain, learningGain } = cycle;

    validateFinite(actionDelta, reflectionGain, learningGain);

    const base = currentState + actionDelta;
    const compoundedGain = reflectionGain + learningGain;
    const nextState = base + base * compoundedGain;

    currentState = nextState;
    states[index + 1] = nextState;
  }

  return states;
}

function validateFinite(...values: number[]): void {
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) {
      throw new TypeError(FINITE_ERROR_MESSAGE);
    }
  }
}
