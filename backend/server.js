const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");
const fetch = require("node-fetch");
const { createServer } = require("http");
const { execute, subscribe } = require("graphql");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { PubSub, withFilter } = require("graphql-subscriptions");

const pubsub = new PubSub();

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    userId: Int!
  }
  type Query {
    users: [User]!
  }
  type Subscription {
    liveUsers(mustInclude: String): User!
  }
  type Mutation {
    createUser(name: String!, userId: Int!): User!
  }
`;

const schema = `mutation createUser($name: String!, $userId: Int!) {
  createUser(name: $name, userId: $userId) {
    name
  }
}`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    users: async () => {
      const response = await fetch("http://json-db:80/users");
      const users = await response.json();
      return users;
    },
  },
  Mutation: {
    createUser: async (_, args, context) => {
      if (context.authToken !== "secret") {
        throw new Error("Not authorized");
      }
      const response = await fetch("http://json-db:80/users", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(args),
      });
      const user = await response.json();
      pubsub.publish("USER_CREATED", { liveUsers: user });
      return user;
    },
  },
  Subscription: {
    liveUsers: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("USER_CREATED"),
        (payload, variables) => {
          return payload.liveUsers.name.includes(variables.mustInclude);
        }
      ),
    },
  },
};

const startServer = async () => {
  const app = express();

  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      async onConnect(connectionParams) {
        if (connectionParams.user) {
          const currentUser = await fetch(
            `http://json-db:80/users?name=${connectionParams.user}`
          );
          const parsedUser = await currentUser.json();
          console.log(parsedUser);
          if (parsedUser.length) {
            return { currentUser: parsedUser[0] };
          }
        }
      },
      // onDisconnect: () => {},
    },
    {
      server: httpServer,
      path: "/graphql",
    }
  );

  const server = new ApolloServer({
    schema,
    context: ({ req }) => ({
      authToken: req.headers.authorization,
    }),
    plugins: [
      ApolloServerPluginLandingPageGraphQLPlayground(),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });

  await server.start();

  server.applyMiddleware({ app });

  httpServer.listen({ port: 4000 }, () =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
  );
};
startServer();
