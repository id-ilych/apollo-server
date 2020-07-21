import { fixtures } from '../../fixtures/schemas';
import { composeServices } from '../../composition';
import { printSchema } from '../printFederatedSchema';
import { lexicographicSortSchema } from 'graphql';

describe('printFederatedSchema', () => {
  let { schema } = composeServices(fixtures);
  const sorted = lexicographicSortSchema(schema);

  it('prints a full, composed schema', () => {
    expect(printSchema(sorted)).toMatchInlineSnapshot(`
      "directive @stream on FIELD

      directive @transform(from: String!) on FIELD

      union AccountType = PasswordAccount | SMSAccount

      type Amazon {
        referrer: String
      }

      union Body = Image | Text

      type Book implements Product @key(fields: \\"isbn\\") {
        details: ProductDetailsBook
        inStock: Boolean
        isbn: String!
        isCheckedOut: Boolean
        metadata: [MetadataOrError]
        name(delimeter: String = \\" \\"): String @requires(fields: \\"title year\\")
        price: String
        relatedReviews: [Review!]! @requires(fields: \\"similarBooks { isbn }\\")
        reviews: [Review]
        similarBooks: [Book]!
        sku: String!
        title: String
        upc: String!
        year: Int
      }

      union Brand = Amazon | Ikea

      type Car implements Vehicle @key(fields: \\"id\\") {
        description: String
        id: String!
        price: String
        retailPrice: String @requires(fields: \\"price\\")
      }

      type Error {
        code: Int
        message: String
      }

      type Furniture implements Product @key(fields: \\"upc\\") @key(fields: \\"sku\\") {
        brand: Brand
        details: ProductDetailsFurniture
        inStock: Boolean
        isHeavy: Boolean
        metadata: [MetadataOrError]
        name: String
        price: String
        reviews: [Review]
        sku: String!
        upc: String!
      }

      type Ikea {
        asile: Int
      }

      type Image {
        attributes: ImageAttributes!
        name: String!
      }

      type ImageAttributes {
        url: String!
      }

      type KeyValue {
        key: String!
        value: String!
      }

      type Library @key(fields: \\"id\\") {
        id: ID!
        name: String
        userAccount(id: ID! = 1): User @requires(fields: \\"name\\")
      }

      union MetadataOrError = Error | KeyValue

      type Mutation {
        deleteReview(id: ID!): Boolean
        login(password: String!, username: String!): User
        reviewProduct(body: String!, upc: String!): Product
        updateReview(review: UpdateReviewInput!): Review
      }

      type PasswordAccount @key(fields: \\"email\\") {
        email: String!
      }

      interface Product {
        details: ProductDetails
        inStock: Boolean
        name: String
        price: String
        reviews: [Review]
        sku: String!
        upc: String!
      }

      interface ProductDetails {
        country: String
      }

      type ProductDetailsBook implements ProductDetails {
        country: String
        pages: Int
      }

      type ProductDetailsFurniture implements ProductDetails {
        color: String
        country: String
      }

      type Query {
        body: Body!
        book(isbn: String!): Book
        books: [Book]
        library(id: ID!): Library
        product(upc: String!): Product
        topCars(first: Int = 5): [Car]
        topProducts(first: Int = 5): [Product]
        topReviews(first: Int = 5): [Review]
        vehicle(id: String!): Vehicle
      }

      type Review @key(fields: \\"id\\") {
        author: User @provides(fields: \\"username\\")
        body(format: Boolean = false): String
        id: ID!
        metadata: [MetadataOrError]
        product: Product
      }

      type SMSAccount @key(fields: \\"number\\") {
        number: String
      }

      type Text {
        attributes: TextAttributes!
        name: String!
      }

      type TextAttributes {
        bold: Boolean
        text: String
      }

      union Thing = Car | Ikea

      input UpdateReviewInput {
        body: String
        id: ID!
      }

      type User @key(fields: \\"id\\") {
        account: AccountType
        birthDate(locale: String): String
        goodAddress: Boolean @requires(fields: \\"metadata { address }\\")
        goodDescription: Boolean @requires(fields: \\"metadata { description }\\")
        id: ID!
        metadata: [UserMetadata]
        name: String
        numberOfReviews: Int!
        reviews: [Review]
        thing: Thing
        username: String
        vehicle: Vehicle
      }

      type UserMetadata {
        address: String
        description: String
        name: String
      }

      type Van implements Vehicle @key(fields: \\"id\\") {
        description: String
        id: String!
        price: String
        retailPrice: String @requires(fields: \\"price\\")
      }

      interface Vehicle {
        description: String
        id: String!
        price: String
        retailPrice: String
      }
      "
    `);
  });
});
