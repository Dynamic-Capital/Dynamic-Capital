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

  const multiplier = 1 + reflectionGain + learningGain;

  return (currentState + actionDelta) * multiplier;
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

  const states: number[] = [initialState];
  let currentState = initialState;

  for (const cycle of cycles) {
    const nextState = computeNextSelfState({
      currentState,
      actionDelta: cycle.actionDelta,
      reflectionGain: cycle.reflectionGain,
      learningGain: cycle.learningGain,
    });

    states.push(nextState);
    currentState = nextState;
  }

  return states;
}

function validateFinite(...values: number[]): void {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(FINITE_ERROR_MESSAGE);
  }
}
