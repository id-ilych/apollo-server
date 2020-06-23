import gql from 'graphql-tag';
import { astSerializer, queryPlanSerializer } from '../../snapshotSerializers';
import { execute, ServiceDefinitionModule } from '../execution-utils';

expect.addSnapshotSerializer(astSerializer);
expect.addSnapshotSerializer(queryPlanSerializer);

const videos = [{ id: 1, url: 'https://foobar.com/videos/1', duration: 42 }];
const articles = [{ id: 1, url: 'https://foobar.com/articles/1' }];
const audios = [
  { id: 1, audioUrl: 'https://foobar.com/audios/1', duration: 66 },
];
const thumbnail = [{ id: 1, url: 'https://foobar.com/thumbnail/1' }];

const contentService: ServiceDefinitionModule = {
  name: 'contentService',
  typeDefs: gql`
    type Query {
      content: [Content!]!
      webResources: [WebResource!]!
    }
    union Content = Video | Article | Audio
    type Article implements WebResource @key(fields: "id") {
      id: ID
      url: String
    }
    extend type Video @key(fields: "id") {
      id: ID @external
    }
    extend type Audio @key(fields: "id") {
      id: ID @external
    }
    interface WebResource {
      url: String
    }
  `,
  resolvers: {
    Query: {
      content() {
        return [
          ...articles.map((a) => ({ ...a, type: 'Article' })),
          ...audios.map(({ id }) => ({ id, type: 'Audio' })),
          ...videos.map(({ id }) => ({ id, type: 'Video' })),
        ];
      },
      webResources() {
        return [...articles.map((a) => ({ ...a, type: 'Article' }))];
      },
    },
    Content: {
      __resolveType(object) {
        return object.type;
      },
    },
    Article: {
      __resolveReference(object) {
        return articles.find(
          (article) => article.id === parseInt(object.id, 10),
        );
      },
      id(object) {
        return object.id;
      },
      url(object) {
        return object.url;
      },
    },
    WebResource: {
      __resolveType(object) {
        return object.type;
      },
    },
  },
};

const videoService: ServiceDefinitionModule = {
  name: 'videoService',
  typeDefs: gql`
    interface WebResource {
      url: String
    }
    interface Playable {
      duration: Int
    }
    type Video implements WebResource & Playable @key(fields: "id") {
      id: ID
      url: String
      thumbnail: Thumbnail
      duration: Int
    }
    type Thumbnail implements WebResource {
      id: ID
      url: String
    }
  `,
  resolvers: {
    Video: {
      __resolveReference(object) {
        return videos.find((video) => video.id === parseInt(object.id, 10));
      },
      id(object) {
        return object.id;
      },
      url(object) {
        return object.url;
      },
      thumbnail(object) {
        // assume that thumbnail.id matches video.id for simplicity
        return thumbnail.find(
          (thumbnail) => thumbnail.id === parseInt(object.id, 10),
        );
      },
      duration(object) {
        return object.duration;
      },
    },
    Thumbnail: {
      id(object) {
        return object.id;
      },
      url(object) {
        return object.url;
      },
    },
  },
};

const audioService: ServiceDefinitionModule = {
  name: 'audioService',
  typeDefs: gql`
    interface Playable {
      duration: Int
    }
    type Audio implements Playable @key(fields: "id") {
      id: ID
      audioUrl: String
      duration: Int
    }
  `,
  resolvers: {
    Audio: {
      __resolveReference(object) {
        return audios.find((audio) => audio.id === parseInt(object.id, 10));
      },
      id(object) {
        return object.id;
      },
      audioUrl(object) {
        return object.audioUrl;
      },
      duration(object) {
        return object.duration;
      },
    },
  },
};

it('handles interface fragments for union-typed field from multiple services', async () => {
  const query = `#graphql
    query {
      content {
        ... on WebResource {
          url
        }
        ... on Audio {
          url: audioUrl
        }
      }
    }
  `;

  const { queryPlan, errors, data } = await execute({ query }, [
    contentService,
    videoService,
    audioService,
  ]);
  expect(errors).toBeUndefined();

  expect(queryPlan).toMatchInlineSnapshot(`
    QueryPlan {
      Sequence {
        Fetch(service: "contentService") {
          {
            content {
              __typename
              ... on WebResource {
                url
              }
              ... on Video {
                __typename
                id
              }
              ... on Audio {
                __typename
                id
              }
            }
          }
        },
        Parallel {
          Flatten(path: "content.@") {
            Fetch(service: "videoService") {
              {
                ... on Video {
                  __typename
                  id
                }
              } =>
              {
                ... on Video {
                  url
                }
              }
            },
          },
          Flatten(path: "content.@") {
            Fetch(service: "audioService") {
              {
                ... on Audio {
                  __typename
                  id
                }
              } =>
              {
                ... on Audio {
                  url: audioUrl
                }
              }
            },
          },
        },
      },
    }
  `);
  expect(data).toEqual({
    content: [
      { url: 'https://foobar.com/articles/1' },
      { url: 'https://foobar.com/audios/1' },
      { url: 'https://foobar.com/videos/1' },
    ],
  });
});

it('handles interface-typed field when interface is used on multiple services', async () => {
  const query = `#graphql
    query {
      webResources {
        url
      }
    }
  `;

  const { queryPlan, errors, data } = await execute({ query }, [
    contentService,
    videoService,
    audioService,
  ]);
  expect(errors).toBeUndefined();

  expect(queryPlan).toMatchInlineSnapshot(`
    QueryPlan {
      Fetch(service: "contentService") {
        {
          webResources {
            __typename
            url
          }
        }
      },
    }
  `);
  expect(data).toEqual({
    webResources: [{ url: 'https://foobar.com/articles/1' }],
  });
});

it('handles interface fragments on interfaces from other services', async () => {
  const query = `#graphql
    query {
      content {
        ... on Playable {
          duration
        }
      }
    }
  `;

  const { queryPlan, errors, data } = await execute({ query }, [
    contentService,
    videoService,
    audioService,
  ]);
  expect(errors).toBeUndefined();

  expect(queryPlan).toMatchInlineSnapshot(`
    QueryPlan {
      Sequence {
        Fetch(service: "contentService") {
          {
            content {
              __typename
              ... on Video {
                __typename
                id
              }
              ... on Audio {
                __typename
                id
              }
            }
          }
        },
        Parallel {
          Flatten(path: "content.@") {
            Fetch(service: "videoService") {
              {
                ... on Video {
                  __typename
                  id
                }
              } =>
              {
                ... on Video {
                  duration
                }
              }
            },
          },
          Flatten(path: "content.@") {
            Fetch(service: "audioService") {
              {
                ... on Audio {
                  __typename
                  id
                }
              } =>
              {
                ... on Audio {
                  duration
                }
              }
            },
          },
        },
      },
    }
  `);
  expect(data).toEqual({
    content: [{}, { duration: 66 }, { duration: 42 }],
  });
});
