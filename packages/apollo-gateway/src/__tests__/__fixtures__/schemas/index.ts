import * as accounts from './accounts';
import * as books from './books';
import * as documents from './documents';
import * as inventory from './inventory';
import * as product from './product';
import * as reviews from './reviews';
import { ServiceDefinition } from '@apollo/federation';

export {
  accounts,
  books,
  documents,
  inventory,
  product,
  reviews,
};

export const fixtures: ServiceDefinition[] = [
  accounts,
  books,
  documents,
  inventory,
  product,
  reviews,
];

export const fixtureNames = [
  accounts.name,
  product.name,
  inventory.name,
  reviews.name,
  books.name,
  documents.name,
];
