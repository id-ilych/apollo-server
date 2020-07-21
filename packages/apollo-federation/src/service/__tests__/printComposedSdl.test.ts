import { lexicographicSortSchema } from 'graphql';
import gql from 'graphql-tag';
import { __testing__ } from 'apollo-gateway';
import { composeAndValidate, ServiceDefinition } from '../../composition';
import { printComposedSdl } from '../printComposedSdl';

const { fixtures } = __testing__;

describe('printComposedSdl', () => {
  it('prints a full, composed schema', () => {
    let { schema, errors } = composeAndValidate(fixtures);
    schema = lexicographicSortSchema(schema);
    expect(errors).toHaveLength(0);
    expect(printComposedSdl(schema, fixtures)).toMatchInlineSnapshot(`
      "schema
        @graph(name: \\"accounts\\", url: \\"https://api.accounts.com\\")
        @graph(name: \\"books\\", url: \\"https://api.books.com\\")
        @graph(name: \\"documents\\", url: \\"https://api.documents.com\\")
        @graph(name: \\"inventory\\", url: \\"https://api.inventory.com\\")
        @graph(name: \\"product\\", url: \\"https://api.product.com\\")
        @graph(name: \\"reviews\\", url: \\"https://api.reviews.com\\")
        @composedGraph(version: 1)
      {
        query: Query
        mutation: Mutation
      }

      directive @stream on FIELD

      directive @transform(from: String!) on FIELD

      union AccountType = PasswordAccount | SMSAccount

      type Amazon {
        referrer: String
      }

      union Body = Image | Text

      type Book implements Product
        @owner(graph: \\"books\\")
        @key(fields: \\"isbn\\", graph: \\"books\\")
      {
        details: ProductDetailsBook @resolve(graph: \\"product\\")
        inStock: Boolean @resolve(graph: \\"inventory\\")
        isbn: String!
        isCheckedOut: Boolean @resolve(graph: \\"inventory\\")
        metadata: [MetadataOrError]
        name(delimeter: String = \\" \\"): String @resolve(graph: \\"product\\") @requires(fields: \\"title year\\")
        price: String @resolve(graph: \\"product\\")
        relatedReviews: [Review!]! @resolve(graph: \\"reviews\\") @requires(fields: \\"similarBooks { isbn }\\")
        reviews: [Review] @resolve(graph: \\"reviews\\")
        similarBooks: [Book]!
        sku: String! @resolve(graph: \\"product\\")
        title: String
        upc: String! @resolve(graph: \\"product\\")
        year: Int
      }

      union Brand = Amazon | Ikea

      type Car implements Vehicle
        @owner(graph: \\"product\\")
        @key(fields: \\"id\\", graph: \\"product\\")
      {
        description: String
        id: String!
        price: String
        retailPrice: String @resolve(graph: \\"reviews\\") @requires(fields: \\"price\\")
      }

      type Error {
        code: Int
        message: String
      }

      type Furniture implements Product
        @owner(graph: \\"product\\")
        @key(fields: \\"upc\\", graph: \\"product\\")
        @key(fields: \\"sku\\", graph: \\"product\\")
      {
        brand: Brand
        details: ProductDetailsFurniture
        inStock: Boolean @resolve(graph: \\"inventory\\")
        isHeavy: Boolean @resolve(graph: \\"inventory\\")
        metadata: [MetadataOrError]
        name: String
        price: String
        reviews: [Review] @resolve(graph: \\"reviews\\")
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

      type Library
        @owner(graph: \\"books\\")
        @key(fields: \\"id\\", graph: \\"books\\")
      {
        id: ID!
        name: String
        userAccount(id: ID! = 1): User @resolve(graph: \\"accounts\\") @requires(fields: \\"name\\")
      }

      union MetadataOrError = Error | KeyValue

      type Mutation {
        deleteReview(id: ID!): Boolean @resolve(graph: \\"reviews\\")
        login(password: String!, username: String!): User @resolve(graph: \\"accounts\\")
        reviewProduct(body: String!, upc: String!): Product @resolve(graph: \\"reviews\\")
        updateReview(review: UpdateReviewInput!): Review @resolve(graph: \\"reviews\\")
      }

      type PasswordAccount
        @owner(graph: \\"accounts\\")
        @key(fields: \\"email\\", graph: \\"accounts\\")
      {
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
        body: Body! @resolve(graph: \\"documents\\")
        book(isbn: String!): Book @resolve(graph: \\"books\\")
        books: [Book] @resolve(graph: \\"books\\")
        library(id: ID!): Library @resolve(graph: \\"books\\")
        me: User @resolve(graph: \\"accounts\\")
        product(upc: String!): Product @resolve(graph: \\"product\\")
        topCars(first: Int = 5): [Car] @resolve(graph: \\"product\\")
        topProducts(first: Int = 5): [Product] @resolve(graph: \\"product\\")
        topReviews(first: Int = 5): [Review] @resolve(graph: \\"reviews\\")
        user(id: ID!): User @resolve(graph: \\"accounts\\")
        vehicle(id: String!): Vehicle @resolve(graph: \\"product\\")
      }

      type Review
        @owner(graph: \\"reviews\\")
        @key(fields: \\"id\\", graph: \\"reviews\\")
      {
        author: User @provides(fields: \\"username\\")
        body(format: Boolean = false): String
        id: ID!
        metadata: [MetadataOrError]
        product: Product
      }

      type SMSAccount
        @owner(graph: \\"accounts\\")
        @key(fields: \\"number\\", graph: \\"accounts\\")
      {
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

      type User
        @owner(graph: \\"accounts\\")
        @key(fields: \\"id\\", graph: \\"accounts\\")
      {
        account: AccountType
        birthDate(locale: String): String
        goodAddress: Boolean @resolve(graph: \\"reviews\\") @requires(fields: \\"metadata { address }\\")
        goodDescription: Boolean @resolve(graph: \\"inventory\\") @requires(fields: \\"metadata { description }\\")
        id: ID!
        metadata: [UserMetadata]
        name: String
        numberOfReviews: Int! @resolve(graph: \\"reviews\\")
        reviews: [Review] @resolve(graph: \\"reviews\\")
        thing: Thing @resolve(graph: \\"product\\")
        username: String
        vehicle: Vehicle @resolve(graph: \\"product\\")
      }

      type UserMetadata {
        address: String
        description: String
        name: String
      }

      type Van implements Vehicle
        @owner(graph: \\"product\\")
        @key(fields: \\"id\\", graph: \\"product\\")
      {
        description: String
        id: String!
        price: String
        retailPrice: String @resolve(graph: \\"reviews\\") @requires(fields: \\"price\\")
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

  it('fixes the block description bug', () => {
    const serviceDefinitions: ServiceDefinition[] = [{
      name: 'service',
      url: 'https://service.api.com',
      typeDefs: gql`
        type Query {
          """
          Block description with "double quotes"
          """
          fieldWithBlockDescription: String
        }
      `,
    }];

    let { schema, errors } = composeAndValidate(serviceDefinitions);
    schema = lexicographicSortSchema(schema);

    expect(errors).toHaveLength(0);
    expect(printComposedSdl(schema, serviceDefinitions))
      .toMatchInlineSnapshot(`
      "schema
        @graph(name: \\"additional\\", url: \\"https://additional.api.com\\")
        @composedGraph(version: 1)
      {
        query: Query
      }

      type Query {
        \\"\\"\\"
        Block description with \\"double quotes\\"
        \\"\\"\\"
        additional: String @resolve(graph: \\"additional\\")
      }
      "
    `);
  });
});
