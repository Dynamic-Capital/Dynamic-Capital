export type Attributes = Record<string, string | number | boolean>;

type Histogram = {
  record: (value: number, attributes?: Attributes) => void;
};

type Counter = {
  add: (value: number, attributes?: Attributes) => void;
};

type UpDownCounter = {
  add: (value: number, attributes?: Attributes) => void;
};

type Meter = {
  createHistogram: (
    _name: string,
    _options?: Record<string, unknown>,
  ) => Histogram;
  createCounter: (_name: string, _options?: Record<string, unknown>) => Counter;
  createUpDownCounter: (
    _name: string,
    _options?: Record<string, unknown>,
  ) => UpDownCounter;
};

const noopHistogram: Histogram = {
  record: () => {
    // no-op stub for tests
  },
};

const noopCounter: Counter = {
  add: () => {
    // no-op stub for tests
  },
};

const noopUpDownCounter: UpDownCounter = {
  add: () => {
    // no-op stub for tests
  },
};

export const metrics = {
  getMeter: (_serviceName: string): Meter => ({
    createHistogram: () => noopHistogram,
    createCounter: () => noopCounter,
    createUpDownCounter: () => noopUpDownCounter,
  }),
};
