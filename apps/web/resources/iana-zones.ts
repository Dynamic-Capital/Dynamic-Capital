import tzdata from "tzdata";

interface TzDataModule {
  zones: Record<string, unknown>;
}

const tzdataModule: TzDataModule = tzdata;

const { zones } = tzdataModule;

export { zones };
