declare module "@opentelemetry/instrumentation-fetch" {
  import {
    InstrumentationBase,
    InstrumentationConfig,
  } from "@opentelemetry/instrumentation";

  export interface FetchInstrumentationConfig extends InstrumentationConfig {
    clearTimingResources?: boolean;
  }

  export class FetchInstrumentation
    extends InstrumentationBase<FetchInstrumentationConfig> {
    constructor(config?: FetchInstrumentationConfig);
  }
}
