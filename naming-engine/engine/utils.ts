const LAYER_PREFIX: Record<'core' | 'gui' | 'oracle', string> = {
  core: 'C',
  gui: 'G',
  oracle: 'O',
};

const TYPE_SUFFIX: Record<'module' | 'token' | 'bot', string> = {
  module: 'M',
  token: 'T',
  bot: 'B',
};

export interface GenerateShortNameOptions {
  readonly domain: 'DC' | 'AGI' | 'TON';
  readonly layer: 'core' | 'gui' | 'oracle';
  readonly type: 'module' | 'token' | 'bot';
  readonly variant?: number | string;
}

export function generateShortName(options: GenerateShortNameOptions): string {
  const domain = options.domain.toUpperCase();
  const layer = LAYER_PREFIX[options.layer];
  const type = TYPE_SUFFIX[options.type];
  const variant = normaliseVariant(options.variant);

  return variant ? `${domain}-${layer}${type}${variant}` : `${domain}-${layer}${type}`;
}

function normaliseVariant(variant: GenerateShortNameOptions['variant']): string {
  if (variant === undefined || variant === null || variant === '') {
    return '';
  }

  if (typeof variant === 'number') {
    const normalised = Math.max(0, Math.floor(variant));
    return Number.isNaN(normalised) ? '' : `-${normalised}`;
  }

  const cleaned = variant.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned ? `-${cleaned}` : '';
}
