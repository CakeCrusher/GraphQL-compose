import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

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
    }
  }
`;

const UsersList = () => {
  let query = useQuery(USERS);
  if (query.loading) return <p>Loading...</p>;
  if (query.error) return <p>Error :(</p>;
  return (
    <div>
      <button onClick={() => query.refetch()}>refresh</button>
      <ul>
        {query.data.users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
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
    update(cache, { data: { createUser } }) {
      cache.modify({
        fields: {
          users(existingUsers = []) {
            const newUsersRef = cache.writeFragment({
              data: createUser,
              fragment: gql`
                fragment newUser on User {
                  id
                  name
                }
              `,
            });
            return [...existingUsers, newUsersRef];
          },
        },
      });
    },
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

const App = () => {
  return (
    <div className="App">
      <h1>Hello</h1>
      <UsersList />
      <AddUser />
    </div>
  );
};

export default App;
