import 'core-js/features/array/flat';
import 'core-js/features/array/flat-map';
import * as fixtures from './fixtures/schemas';

export * from './composition';
export * from './service';

export const __testing__ = { ...fixtures };
