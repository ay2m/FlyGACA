# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useGetAirports, useCreateAirport, useUpdateAirport, useDeleteAirport, useGetMyProfile, useCreateUser, useUpdateMyProfile, useDeleteMyAccount, useListFlights, useCreateFlight } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useGetAirports();

const { data, isPending, isSuccess, isError, error } = useCreateAirport();

const { data, isPending, isSuccess, isError, error } = useUpdateAirport(updateAirportVars);

const { data, isPending, isSuccess, isError, error } = useDeleteAirport(deleteAirportVars);

const { data, isPending, isSuccess, isError, error } = useGetMyProfile();

const { data, isPending, isSuccess, isError, error } = useCreateUser(createUserVars);

const { data, isPending, isSuccess, isError, error } = useUpdateMyProfile(updateMyProfileVars);

const { data, isPending, isSuccess, isError, error } = useDeleteMyAccount();

const { data, isPending, isSuccess, isError, error } = useListFlights();

const { data, isPending, isSuccess, isError, error } = useCreateFlight(createFlightVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getAirports, createAirport, updateAirport, deleteAirport, getMyProfile, createUser, updateMyProfile, deleteMyAccount, listFlights, createFlight } from '@dataconnect/generated';


// Operation GetAirports: 
const { data } = await GetAirports(dataConnect);

// Operation CreateAirport: 
const { data } = await CreateAirport(dataConnect);

// Operation UpdateAirport:  For variables, look at type UpdateAirportVars in ../index.d.ts
const { data } = await UpdateAirport(dataConnect, updateAirportVars);

// Operation DeleteAirport:  For variables, look at type DeleteAirportVars in ../index.d.ts
const { data } = await DeleteAirport(dataConnect, deleteAirportVars);

// Operation GetMyProfile: 
const { data } = await GetMyProfile(dataConnect);

// Operation CreateUser:  For variables, look at type CreateUserVars in ../index.d.ts
const { data } = await CreateUser(dataConnect, createUserVars);

// Operation UpdateMyProfile:  For variables, look at type UpdateMyProfileVars in ../index.d.ts
const { data } = await UpdateMyProfile(dataConnect, updateMyProfileVars);

// Operation DeleteMyAccount: 
const { data } = await DeleteMyAccount(dataConnect);

// Operation ListFlights: 
const { data } = await ListFlights(dataConnect);

// Operation CreateFlight:  For variables, look at type CreateFlightVars in ../index.d.ts
const { data } = await CreateFlight(dataConnect, createFlightVars);


```