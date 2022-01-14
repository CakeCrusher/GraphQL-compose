import { useQuery, useMutation, useSubscription, gql } from "@apollo/client";
import { useEffect, useState } from "react";

const USERS = gql`
  query users {
    users {
      name
      id
    }
  }
`;
const ADD_USER = gql`
  mutation createUser($name: String!, $userId: Int!) {
    createUser(name: $name, userId: $userId) {
      name
      id
    }
  }
`;
const USERS_SUBSCRIPTION = gql`
  subscription liveUsers($mustInclude: String) {
    liveUsers(mustInclude: $mustInclude) {
      name
      id
    }
  }
`;

const UsersList = ({ subscribeToNewUsers, loading, data, error, refetch }) => {
  useEffect(() => {
    subscribeToNewUsers();
  }, []);
  console.log("data", data);
  console.log("loading", loading);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;
  return (
    <div>
      <button onClick={() => refetch()}>refresh</button>
      <ul>
        {data.users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
};

const UsersListWithData = () => {
  const { subscribeToMore, ...result } = useQuery(USERS);

  return (
    <UsersList
      {...result}
      subscribeToNewUsers={() => {
        subscribeToMore({
          document: USERS_SUBSCRIPTION,
          variables: { mustInclude: "" },
          updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) return prev;
            const newFeedItem = subscriptionData.data.liveUsers;
            console.log("newFeedItem", newFeedItem);
            console.log("prev", prev);
            return Object.assign({}, prev, {
              users: [...prev.users, newFeedItem],
            });
          },
        });
      }}
    />
  );
};

const AddUser = () => {
  let name;
  let userId;
  const [addUser, { loading, error, data, reset }] = useMutation(ADD_USER, {
    variables: {
      name: "default",
      userId: 20,
    },
    // refetchQueries: [USERS, "users"],
    // update(cache, { data: { createUser } }) {
    //   cache.modify({
    //     fields: {
    //       users(existingUsers = []) {
    //         const newUsersRef = cache.writeFragment({
    //           data: createUser,
    //           fragment: gql`
    //             fragment newUser on User {
    //               id
    //               name
    //             }
    //           `,
    //         });
    //         return [...existingUsers, newUsersRef];
    //       },
    //     },
    //   });
    // },
    onQueryUpdated(observableQuery) {
      if (observableQuery.hasObservers()) {
        console.log("observableQuery", observableQuery);
      }
    },
  });

  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          reset();
          addUser({
            variables: { name: name.value, userId: parseInt(userId.value) },
          });
          name.value = "";
          userId.value = "";
        }}
      >
        <input
          ref={(node) => {
            name = node;
          }}
          placeholder="name"
        />
        <input
          ref={(node) => {
            userId = node;
          }}
          placeholder="user id"
        />
        {error ? <p>error</p> : null}
        <button type="submit">submit</button>
      </form>
    </div>
  );
};

const NewestUser = () => {
  const { data, loading } = useSubscription(USERS_SUBSCRIPTION, {
    variables: { mustInclude: "seb" },
  });
  console.log("subscription data", data);
  return (
    <h3>Newest user that contains "seb": {!loading && data.liveUsers.name}</h3>
  );
};

const App = () => {
  return (
    <div className="App">
      <h1>Hello</h1>
      <UsersListWithData />
      <AddUser />
      <NewestUser />
    </div>
  );
};

export default App;
