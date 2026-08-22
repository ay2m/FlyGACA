# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetAirports*](#getairports)
  - [*GetMyProfile*](#getmyprofile)
  - [*ListFlights*](#listflights)
  - [*ListMyBookings*](#listmybookings)
  - [*ListCargo*](#listcargo)
- [**Mutations**](#mutations)
  - [*CreateAirport*](#createairport)
  - [*UpdateAirport*](#updateairport)
  - [*DeleteAirport*](#deleteairport)
  - [*CreateUser*](#createuser)
  - [*UpdateMyProfile*](#updatemyprofile)
  - [*DeleteMyAccount*](#deletemyaccount)
  - [*CreateFlight*](#createflight)
  - [*UpdateFlightStatus*](#updateflightstatus)
  - [*DeleteFlight*](#deleteflight)
  - [*CreateBooking*](#createbooking)
  - [*UpdateBooking*](#updatebooking)
  - [*DeleteBooking*](#deletebooking)
  - [*CreateCargo*](#createcargo)
  - [*UpdateCargoStatus*](#updatecargostatus)
  - [*DeleteCargo*](#deletecargo)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetAirports
You can execute the `GetAirports` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getAirports(options?: ExecuteQueryOptions): QueryPromise<GetAirportsData, undefined>;

interface GetAirportsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAirportsData, undefined>;
}
export const getAirportsRef: GetAirportsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAirports(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetAirportsData, undefined>;

interface GetAirportsRef {
  ...
  (dc: DataConnect): QueryRef<GetAirportsData, undefined>;
}
export const getAirportsRef: GetAirportsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAirportsRef:
```typescript
const name = getAirportsRef.operationName;
console.log(name);
```

### Variables
The `GetAirports` query has no variables.
### Return Type
Recall that executing the `GetAirports` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAirportsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAirportsData {
  airports: ({
    id: UUIDString;
    name: string;
    city: string;
    airportCode: string;
  } & Airport_Key)[];
}
```
### Using `GetAirports`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAirports } from '@dataconnect/generated';


// Call the `getAirports()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAirports();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAirports(dataConnect);

console.log(data.airports);

// Or, you can use the `Promise` API.
getAirports().then((response) => {
  const data = response.data;
  console.log(data.airports);
});
```

### Using `GetAirports`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAirportsRef } from '@dataconnect/generated';


// Call the `getAirportsRef()` function to get a reference to the query.
const ref = getAirportsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAirportsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.airports);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.airports);
});
```

## GetMyProfile
You can execute the `GetMyProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyProfile(options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;

interface GetMyProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProfileData, undefined>;
}
export const getMyProfileRef: GetMyProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyProfile(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;

interface GetMyProfileRef {
  ...
  (dc: DataConnect): QueryRef<GetMyProfileData, undefined>;
}
export const getMyProfileRef: GetMyProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyProfileRef:
```typescript
const name = getMyProfileRef.operationName;
console.log(name);
```

### Variables
The `GetMyProfile` query has no variables.
### Return Type
Recall that executing the `GetMyProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyProfileData {
  user?: {
    name: string;
    email: string;
    phoneNumber?: string | null;
  };
}
```
### Using `GetMyProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyProfile } from '@dataconnect/generated';


// Call the `getMyProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyProfile();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyProfile(dataConnect);

console.log(data.user);

// Or, you can use the `Promise` API.
getMyProfile().then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetMyProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyProfileRef } from '@dataconnect/generated';


// Call the `getMyProfileRef()` function to get a reference to the query.
const ref = getMyProfileRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyProfileRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## ListFlights
You can execute the `ListFlights` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listFlights(options?: ExecuteQueryOptions): QueryPromise<ListFlightsData, undefined>;

interface ListFlightsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListFlightsData, undefined>;
}
export const listFlightsRef: ListFlightsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listFlights(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListFlightsData, undefined>;

interface ListFlightsRef {
  ...
  (dc: DataConnect): QueryRef<ListFlightsData, undefined>;
}
export const listFlightsRef: ListFlightsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listFlightsRef:
```typescript
const name = listFlightsRef.operationName;
console.log(name);
```

### Variables
The `ListFlights` query has no variables.
### Return Type
Recall that executing the `ListFlights` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListFlightsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListFlightsData {
  flights: ({
    flightNumber: string;
    originAirport: {
      name: string;
    };
    destinationAirport: {
      name: string;
    };
    departureTime: TimestampString;
    status: string;
  })[];
}
```
### Using `ListFlights`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listFlights } from '@dataconnect/generated';


// Call the `listFlights()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listFlights();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listFlights(dataConnect);

console.log(data.flights);

// Or, you can use the `Promise` API.
listFlights().then((response) => {
  const data = response.data;
  console.log(data.flights);
});
```

### Using `ListFlights`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listFlightsRef } from '@dataconnect/generated';


// Call the `listFlightsRef()` function to get a reference to the query.
const ref = listFlightsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listFlightsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.flights);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.flights);
});
```

## ListMyBookings
You can execute the `ListMyBookings` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMyBookings(options?: ExecuteQueryOptions): QueryPromise<ListMyBookingsData, undefined>;

interface ListMyBookingsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyBookingsData, undefined>;
}
export const listMyBookingsRef: ListMyBookingsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyBookings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyBookingsData, undefined>;

interface ListMyBookingsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyBookingsData, undefined>;
}
export const listMyBookingsRef: ListMyBookingsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyBookingsRef:
```typescript
const name = listMyBookingsRef.operationName;
console.log(name);
```

### Variables
The `ListMyBookings` query has no variables.
### Return Type
Recall that executing the `ListMyBookings` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyBookingsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyBookingsData {
  bookings: ({
    seatNumber: string;
    flight: {
      flightNumber: string;
      departureTime: TimestampString;
    };
  })[];
}
```
### Using `ListMyBookings`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyBookings } from '@dataconnect/generated';


// Call the `listMyBookings()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyBookings();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyBookings(dataConnect);

console.log(data.bookings);

// Or, you can use the `Promise` API.
listMyBookings().then((response) => {
  const data = response.data;
  console.log(data.bookings);
});
```

### Using `ListMyBookings`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyBookingsRef } from '@dataconnect/generated';


// Call the `listMyBookingsRef()` function to get a reference to the query.
const ref = listMyBookingsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyBookingsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.bookings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.bookings);
});
```

## ListCargo
You can execute the `ListCargo` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCargo(options?: ExecuteQueryOptions): QueryPromise<ListCargoData, undefined>;

interface ListCargoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCargoData, undefined>;
}
export const listCargoRef: ListCargoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCargo(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCargoData, undefined>;

interface ListCargoRef {
  ...
  (dc: DataConnect): QueryRef<ListCargoData, undefined>;
}
export const listCargoRef: ListCargoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCargoRef:
```typescript
const name = listCargoRef.operationName;
console.log(name);
```

### Variables
The `ListCargo` query has no variables.
### Return Type
Recall that executing the `ListCargo` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCargoData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCargoData {
  cargos: ({
    trackingNumber: string;
    status: string;
    weight: number;
    flight: {
      flightNumber: string;
    };
  })[];
}
```
### Using `ListCargo`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCargo } from '@dataconnect/generated';


// Call the `listCargo()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCargo();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCargo(dataConnect);

console.log(data.cargos);

// Or, you can use the `Promise` API.
listCargo().then((response) => {
  const data = response.data;
  console.log(data.cargos);
});
```

### Using `ListCargo`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCargoRef } from '@dataconnect/generated';


// Call the `listCargoRef()` function to get a reference to the query.
const ref = listCargoRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCargoRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.cargos);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.cargos);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAirport
You can execute the `CreateAirport` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createAirport(): MutationPromise<CreateAirportData, undefined>;

interface CreateAirportRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateAirportData, undefined>;
}
export const createAirportRef: CreateAirportRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAirport(dc: DataConnect): MutationPromise<CreateAirportData, undefined>;

interface CreateAirportRef {
  ...
  (dc: DataConnect): MutationRef<CreateAirportData, undefined>;
}
export const createAirportRef: CreateAirportRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAirportRef:
```typescript
const name = createAirportRef.operationName;
console.log(name);
```

### Variables
The `CreateAirport` mutation has no variables.
### Return Type
Recall that executing the `CreateAirport` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAirportData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAirportData {
  airport_insert: Airport_Key;
}
```
### Using `CreateAirport`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAirport } from '@dataconnect/generated';


// Call the `createAirport()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAirport();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAirport(dataConnect);

console.log(data.airport_insert);

// Or, you can use the `Promise` API.
createAirport().then((response) => {
  const data = response.data;
  console.log(data.airport_insert);
});
```

### Using `CreateAirport`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAirportRef } from '@dataconnect/generated';


// Call the `createAirportRef()` function to get a reference to the mutation.
const ref = createAirportRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAirportRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.airport_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.airport_insert);
});
```

## UpdateAirport
You can execute the `UpdateAirport` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateAirport(vars: UpdateAirportVariables): MutationPromise<UpdateAirportData, UpdateAirportVariables>;

interface UpdateAirportRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateAirportVariables): MutationRef<UpdateAirportData, UpdateAirportVariables>;
}
export const updateAirportRef: UpdateAirportRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateAirport(dc: DataConnect, vars: UpdateAirportVariables): MutationPromise<UpdateAirportData, UpdateAirportVariables>;

interface UpdateAirportRef {
  ...
  (dc: DataConnect, vars: UpdateAirportVariables): MutationRef<UpdateAirportData, UpdateAirportVariables>;
}
export const updateAirportRef: UpdateAirportRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateAirportRef:
```typescript
const name = updateAirportRef.operationName;
console.log(name);
```

### Variables
The `UpdateAirport` mutation requires an argument of type `UpdateAirportVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateAirportVariables {
  id: UUIDString;
  capacity?: number | null;
}
```
### Return Type
Recall that executing the `UpdateAirport` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateAirportData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateAirportData {
  airport_update?: Airport_Key | null;
}
```
### Using `UpdateAirport`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateAirport, UpdateAirportVariables } from '@dataconnect/generated';

// The `UpdateAirport` mutation requires an argument of type `UpdateAirportVariables`:
const updateAirportVars: UpdateAirportVariables = {
  id: ..., 
  capacity: ..., // optional
};

// Call the `updateAirport()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateAirport(updateAirportVars);
// Variables can be defined inline as well.
const { data } = await updateAirport({ id: ..., capacity: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateAirport(dataConnect, updateAirportVars);

console.log(data.airport_update);

// Or, you can use the `Promise` API.
updateAirport(updateAirportVars).then((response) => {
  const data = response.data;
  console.log(data.airport_update);
});
```

### Using `UpdateAirport`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateAirportRef, UpdateAirportVariables } from '@dataconnect/generated';

// The `UpdateAirport` mutation requires an argument of type `UpdateAirportVariables`:
const updateAirportVars: UpdateAirportVariables = {
  id: ..., 
  capacity: ..., // optional
};

// Call the `updateAirportRef()` function to get a reference to the mutation.
const ref = updateAirportRef(updateAirportVars);
// Variables can be defined inline as well.
const ref = updateAirportRef({ id: ..., capacity: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateAirportRef(dataConnect, updateAirportVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.airport_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.airport_update);
});
```

## DeleteAirport
You can execute the `DeleteAirport` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteAirport(vars: DeleteAirportVariables): MutationPromise<DeleteAirportData, DeleteAirportVariables>;

interface DeleteAirportRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteAirportVariables): MutationRef<DeleteAirportData, DeleteAirportVariables>;
}
export const deleteAirportRef: DeleteAirportRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteAirport(dc: DataConnect, vars: DeleteAirportVariables): MutationPromise<DeleteAirportData, DeleteAirportVariables>;

interface DeleteAirportRef {
  ...
  (dc: DataConnect, vars: DeleteAirportVariables): MutationRef<DeleteAirportData, DeleteAirportVariables>;
}
export const deleteAirportRef: DeleteAirportRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteAirportRef:
```typescript
const name = deleteAirportRef.operationName;
console.log(name);
```

### Variables
The `DeleteAirport` mutation requires an argument of type `DeleteAirportVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteAirportVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteAirport` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteAirportData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteAirportData {
  airport_delete?: Airport_Key | null;
}
```
### Using `DeleteAirport`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteAirport, DeleteAirportVariables } from '@dataconnect/generated';

// The `DeleteAirport` mutation requires an argument of type `DeleteAirportVariables`:
const deleteAirportVars: DeleteAirportVariables = {
  id: ..., 
};

// Call the `deleteAirport()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteAirport(deleteAirportVars);
// Variables can be defined inline as well.
const { data } = await deleteAirport({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteAirport(dataConnect, deleteAirportVars);

console.log(data.airport_delete);

// Or, you can use the `Promise` API.
deleteAirport(deleteAirportVars).then((response) => {
  const data = response.data;
  console.log(data.airport_delete);
});
```

### Using `DeleteAirport`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteAirportRef, DeleteAirportVariables } from '@dataconnect/generated';

// The `DeleteAirport` mutation requires an argument of type `DeleteAirportVariables`:
const deleteAirportVars: DeleteAirportVariables = {
  id: ..., 
};

// Call the `deleteAirportRef()` function to get a reference to the mutation.
const ref = deleteAirportRef(deleteAirportVars);
// Variables can be defined inline as well.
const ref = deleteAirportRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteAirportRef(dataConnect, deleteAirportVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.airport_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.airport_delete);
});
```

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation requires an argument of type `CreateUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserVariables {
  email: string;
  name: string;
  role: string;
}
```
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser, CreateUserVariables } from '@dataconnect/generated';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  email: ..., 
  name: ..., 
  role: ..., 
};

// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser(createUserVars);
// Variables can be defined inline as well.
const { data } = await createUser({ email: ..., name: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect, createUserVars);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser(createUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef, CreateUserVariables } from '@dataconnect/generated';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  email: ..., 
  name: ..., 
  role: ..., 
};

// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef(createUserVars);
// Variables can be defined inline as well.
const ref = createUserRef({ email: ..., name: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect, createUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## UpdateMyProfile
You can execute the `UpdateMyProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateMyProfile(vars?: UpdateMyProfileVariables): MutationPromise<UpdateMyProfileData, UpdateMyProfileVariables>;

interface UpdateMyProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpdateMyProfileVariables): MutationRef<UpdateMyProfileData, UpdateMyProfileVariables>;
}
export const updateMyProfileRef: UpdateMyProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMyProfile(dc: DataConnect, vars?: UpdateMyProfileVariables): MutationPromise<UpdateMyProfileData, UpdateMyProfileVariables>;

interface UpdateMyProfileRef {
  ...
  (dc: DataConnect, vars?: UpdateMyProfileVariables): MutationRef<UpdateMyProfileData, UpdateMyProfileVariables>;
}
export const updateMyProfileRef: UpdateMyProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMyProfileRef:
```typescript
const name = updateMyProfileRef.operationName;
console.log(name);
```

### Variables
The `UpdateMyProfile` mutation has an optional argument of type `UpdateMyProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMyProfileVariables {
  name?: string | null;
  phoneNumber?: string | null;
}
```
### Return Type
Recall that executing the `UpdateMyProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMyProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMyProfileData {
  user_update?: User_Key | null;
}
```
### Using `UpdateMyProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMyProfile, UpdateMyProfileVariables } from '@dataconnect/generated';

// The `UpdateMyProfile` mutation has an optional argument of type `UpdateMyProfileVariables`:
const updateMyProfileVars: UpdateMyProfileVariables = {
  name: ..., // optional
  phoneNumber: ..., // optional
};

// Call the `updateMyProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMyProfile(updateMyProfileVars);
// Variables can be defined inline as well.
const { data } = await updateMyProfile({ name: ..., phoneNumber: ..., });
// Since all variables are optional for this mutation, you can omit the `UpdateMyProfileVariables` argument.
const { data } = await updateMyProfile();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMyProfile(dataConnect, updateMyProfileVars);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateMyProfile(updateMyProfileVars).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateMyProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMyProfileRef, UpdateMyProfileVariables } from '@dataconnect/generated';

// The `UpdateMyProfile` mutation has an optional argument of type `UpdateMyProfileVariables`:
const updateMyProfileVars: UpdateMyProfileVariables = {
  name: ..., // optional
  phoneNumber: ..., // optional
};

// Call the `updateMyProfileRef()` function to get a reference to the mutation.
const ref = updateMyProfileRef(updateMyProfileVars);
// Variables can be defined inline as well.
const ref = updateMyProfileRef({ name: ..., phoneNumber: ..., });
// Since all variables are optional for this mutation, you can omit the `UpdateMyProfileVariables` argument.
const ref = updateMyProfileRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMyProfileRef(dataConnect, updateMyProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

## DeleteMyAccount
You can execute the `DeleteMyAccount` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteMyAccount(): MutationPromise<DeleteMyAccountData, undefined>;

interface DeleteMyAccountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteMyAccountData, undefined>;
}
export const deleteMyAccountRef: DeleteMyAccountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteMyAccount(dc: DataConnect): MutationPromise<DeleteMyAccountData, undefined>;

interface DeleteMyAccountRef {
  ...
  (dc: DataConnect): MutationRef<DeleteMyAccountData, undefined>;
}
export const deleteMyAccountRef: DeleteMyAccountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteMyAccountRef:
```typescript
const name = deleteMyAccountRef.operationName;
console.log(name);
```

### Variables
The `DeleteMyAccount` mutation has no variables.
### Return Type
Recall that executing the `DeleteMyAccount` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteMyAccountData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteMyAccountData {
  user_delete?: User_Key | null;
}
```
### Using `DeleteMyAccount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteMyAccount } from '@dataconnect/generated';


// Call the `deleteMyAccount()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteMyAccount();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteMyAccount(dataConnect);

console.log(data.user_delete);

// Or, you can use the `Promise` API.
deleteMyAccount().then((response) => {
  const data = response.data;
  console.log(data.user_delete);
});
```

### Using `DeleteMyAccount`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteMyAccountRef } from '@dataconnect/generated';


// Call the `deleteMyAccountRef()` function to get a reference to the mutation.
const ref = deleteMyAccountRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteMyAccountRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_delete);
});
```

## CreateFlight
You can execute the `CreateFlight` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createFlight(vars: CreateFlightVariables): MutationPromise<CreateFlightData, CreateFlightVariables>;

interface CreateFlightRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateFlightVariables): MutationRef<CreateFlightData, CreateFlightVariables>;
}
export const createFlightRef: CreateFlightRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createFlight(dc: DataConnect, vars: CreateFlightVariables): MutationPromise<CreateFlightData, CreateFlightVariables>;

interface CreateFlightRef {
  ...
  (dc: DataConnect, vars: CreateFlightVariables): MutationRef<CreateFlightData, CreateFlightVariables>;
}
export const createFlightRef: CreateFlightRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createFlightRef:
```typescript
const name = createFlightRef.operationName;
console.log(name);
```

### Variables
The `CreateFlight` mutation requires an argument of type `CreateFlightVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateFlightVariables {
  flightNumber: string;
  originId: UUIDString;
  destId: UUIDString;
  departure: TimestampString;
}
```
### Return Type
Recall that executing the `CreateFlight` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateFlightData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateFlightData {
  flight_insert: Flight_Key;
}
```
### Using `CreateFlight`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createFlight, CreateFlightVariables } from '@dataconnect/generated';

// The `CreateFlight` mutation requires an argument of type `CreateFlightVariables`:
const createFlightVars: CreateFlightVariables = {
  flightNumber: ..., 
  originId: ..., 
  destId: ..., 
  departure: ..., 
};

// Call the `createFlight()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createFlight(createFlightVars);
// Variables can be defined inline as well.
const { data } = await createFlight({ flightNumber: ..., originId: ..., destId: ..., departure: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createFlight(dataConnect, createFlightVars);

console.log(data.flight_insert);

// Or, you can use the `Promise` API.
createFlight(createFlightVars).then((response) => {
  const data = response.data;
  console.log(data.flight_insert);
});
```

### Using `CreateFlight`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createFlightRef, CreateFlightVariables } from '@dataconnect/generated';

// The `CreateFlight` mutation requires an argument of type `CreateFlightVariables`:
const createFlightVars: CreateFlightVariables = {
  flightNumber: ..., 
  originId: ..., 
  destId: ..., 
  departure: ..., 
};

// Call the `createFlightRef()` function to get a reference to the mutation.
const ref = createFlightRef(createFlightVars);
// Variables can be defined inline as well.
const ref = createFlightRef({ flightNumber: ..., originId: ..., destId: ..., departure: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createFlightRef(dataConnect, createFlightVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.flight_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.flight_insert);
});
```

## UpdateFlightStatus
You can execute the `UpdateFlightStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateFlightStatus(vars: UpdateFlightStatusVariables): MutationPromise<UpdateFlightStatusData, UpdateFlightStatusVariables>;

interface UpdateFlightStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateFlightStatusVariables): MutationRef<UpdateFlightStatusData, UpdateFlightStatusVariables>;
}
export const updateFlightStatusRef: UpdateFlightStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateFlightStatus(dc: DataConnect, vars: UpdateFlightStatusVariables): MutationPromise<UpdateFlightStatusData, UpdateFlightStatusVariables>;

interface UpdateFlightStatusRef {
  ...
  (dc: DataConnect, vars: UpdateFlightStatusVariables): MutationRef<UpdateFlightStatusData, UpdateFlightStatusVariables>;
}
export const updateFlightStatusRef: UpdateFlightStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateFlightStatusRef:
```typescript
const name = updateFlightStatusRef.operationName;
console.log(name);
```

### Variables
The `UpdateFlightStatus` mutation requires an argument of type `UpdateFlightStatusVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateFlightStatusVariables {
  id: UUIDString;
  status: string;
}
```
### Return Type
Recall that executing the `UpdateFlightStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateFlightStatusData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateFlightStatusData {
  flight_update?: Flight_Key | null;
}
```
### Using `UpdateFlightStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateFlightStatus, UpdateFlightStatusVariables } from '@dataconnect/generated';

// The `UpdateFlightStatus` mutation requires an argument of type `UpdateFlightStatusVariables`:
const updateFlightStatusVars: UpdateFlightStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateFlightStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateFlightStatus(updateFlightStatusVars);
// Variables can be defined inline as well.
const { data } = await updateFlightStatus({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateFlightStatus(dataConnect, updateFlightStatusVars);

console.log(data.flight_update);

// Or, you can use the `Promise` API.
updateFlightStatus(updateFlightStatusVars).then((response) => {
  const data = response.data;
  console.log(data.flight_update);
});
```

### Using `UpdateFlightStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateFlightStatusRef, UpdateFlightStatusVariables } from '@dataconnect/generated';

// The `UpdateFlightStatus` mutation requires an argument of type `UpdateFlightStatusVariables`:
const updateFlightStatusVars: UpdateFlightStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateFlightStatusRef()` function to get a reference to the mutation.
const ref = updateFlightStatusRef(updateFlightStatusVars);
// Variables can be defined inline as well.
const ref = updateFlightStatusRef({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateFlightStatusRef(dataConnect, updateFlightStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.flight_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.flight_update);
});
```

## DeleteFlight
You can execute the `DeleteFlight` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteFlight(vars: DeleteFlightVariables): MutationPromise<DeleteFlightData, DeleteFlightVariables>;

interface DeleteFlightRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteFlightVariables): MutationRef<DeleteFlightData, DeleteFlightVariables>;
}
export const deleteFlightRef: DeleteFlightRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteFlight(dc: DataConnect, vars: DeleteFlightVariables): MutationPromise<DeleteFlightData, DeleteFlightVariables>;

interface DeleteFlightRef {
  ...
  (dc: DataConnect, vars: DeleteFlightVariables): MutationRef<DeleteFlightData, DeleteFlightVariables>;
}
export const deleteFlightRef: DeleteFlightRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteFlightRef:
```typescript
const name = deleteFlightRef.operationName;
console.log(name);
```

### Variables
The `DeleteFlight` mutation requires an argument of type `DeleteFlightVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteFlightVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteFlight` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteFlightData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteFlightData {
  flight_delete?: Flight_Key | null;
}
```
### Using `DeleteFlight`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteFlight, DeleteFlightVariables } from '@dataconnect/generated';

// The `DeleteFlight` mutation requires an argument of type `DeleteFlightVariables`:
const deleteFlightVars: DeleteFlightVariables = {
  id: ..., 
};

// Call the `deleteFlight()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteFlight(deleteFlightVars);
// Variables can be defined inline as well.
const { data } = await deleteFlight({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteFlight(dataConnect, deleteFlightVars);

console.log(data.flight_delete);

// Or, you can use the `Promise` API.
deleteFlight(deleteFlightVars).then((response) => {
  const data = response.data;
  console.log(data.flight_delete);
});
```

### Using `DeleteFlight`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteFlightRef, DeleteFlightVariables } from '@dataconnect/generated';

// The `DeleteFlight` mutation requires an argument of type `DeleteFlightVariables`:
const deleteFlightVars: DeleteFlightVariables = {
  id: ..., 
};

// Call the `deleteFlightRef()` function to get a reference to the mutation.
const ref = deleteFlightRef(deleteFlightVars);
// Variables can be defined inline as well.
const ref = deleteFlightRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteFlightRef(dataConnect, deleteFlightVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.flight_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.flight_delete);
});
```

## CreateBooking
You can execute the `CreateBooking` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createBooking(vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;

interface CreateBookingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
}
export const createBookingRef: CreateBookingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createBooking(dc: DataConnect, vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;

interface CreateBookingRef {
  ...
  (dc: DataConnect, vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
}
export const createBookingRef: CreateBookingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createBookingRef:
```typescript
const name = createBookingRef.operationName;
console.log(name);
```

### Variables
The `CreateBooking` mutation requires an argument of type `CreateBookingVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateBookingVariables {
  flightId: UUIDString;
  seat: string;
}
```
### Return Type
Recall that executing the `CreateBooking` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateBookingData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateBookingData {
  booking_insert: Booking_Key;
}
```
### Using `CreateBooking`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createBooking, CreateBookingVariables } from '@dataconnect/generated';

// The `CreateBooking` mutation requires an argument of type `CreateBookingVariables`:
const createBookingVars: CreateBookingVariables = {
  flightId: ..., 
  seat: ..., 
};

// Call the `createBooking()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createBooking(createBookingVars);
// Variables can be defined inline as well.
const { data } = await createBooking({ flightId: ..., seat: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createBooking(dataConnect, createBookingVars);

console.log(data.booking_insert);

// Or, you can use the `Promise` API.
createBooking(createBookingVars).then((response) => {
  const data = response.data;
  console.log(data.booking_insert);
});
```

### Using `CreateBooking`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createBookingRef, CreateBookingVariables } from '@dataconnect/generated';

// The `CreateBooking` mutation requires an argument of type `CreateBookingVariables`:
const createBookingVars: CreateBookingVariables = {
  flightId: ..., 
  seat: ..., 
};

// Call the `createBookingRef()` function to get a reference to the mutation.
const ref = createBookingRef(createBookingVars);
// Variables can be defined inline as well.
const ref = createBookingRef({ flightId: ..., seat: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createBookingRef(dataConnect, createBookingVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.booking_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.booking_insert);
});
```

## UpdateBooking
You can execute the `UpdateBooking` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateBooking(vars: UpdateBookingVariables): MutationPromise<UpdateBookingData, UpdateBookingVariables>;

interface UpdateBookingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateBookingVariables): MutationRef<UpdateBookingData, UpdateBookingVariables>;
}
export const updateBookingRef: UpdateBookingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateBooking(dc: DataConnect, vars: UpdateBookingVariables): MutationPromise<UpdateBookingData, UpdateBookingVariables>;

interface UpdateBookingRef {
  ...
  (dc: DataConnect, vars: UpdateBookingVariables): MutationRef<UpdateBookingData, UpdateBookingVariables>;
}
export const updateBookingRef: UpdateBookingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateBookingRef:
```typescript
const name = updateBookingRef.operationName;
console.log(name);
```

### Variables
The `UpdateBooking` mutation requires an argument of type `UpdateBookingVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateBookingVariables {
  id: UUIDString;
  seat: string;
}
```
### Return Type
Recall that executing the `UpdateBooking` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateBookingData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateBookingData {
  booking_update?: Booking_Key | null;
}
```
### Using `UpdateBooking`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateBooking, UpdateBookingVariables } from '@dataconnect/generated';

// The `UpdateBooking` mutation requires an argument of type `UpdateBookingVariables`:
const updateBookingVars: UpdateBookingVariables = {
  id: ..., 
  seat: ..., 
};

// Call the `updateBooking()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateBooking(updateBookingVars);
// Variables can be defined inline as well.
const { data } = await updateBooking({ id: ..., seat: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateBooking(dataConnect, updateBookingVars);

console.log(data.booking_update);

// Or, you can use the `Promise` API.
updateBooking(updateBookingVars).then((response) => {
  const data = response.data;
  console.log(data.booking_update);
});
```

### Using `UpdateBooking`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateBookingRef, UpdateBookingVariables } from '@dataconnect/generated';

// The `UpdateBooking` mutation requires an argument of type `UpdateBookingVariables`:
const updateBookingVars: UpdateBookingVariables = {
  id: ..., 
  seat: ..., 
};

// Call the `updateBookingRef()` function to get a reference to the mutation.
const ref = updateBookingRef(updateBookingVars);
// Variables can be defined inline as well.
const ref = updateBookingRef({ id: ..., seat: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateBookingRef(dataConnect, updateBookingVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.booking_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.booking_update);
});
```

## DeleteBooking
You can execute the `DeleteBooking` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteBooking(vars: DeleteBookingVariables): MutationPromise<DeleteBookingData, DeleteBookingVariables>;

interface DeleteBookingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteBookingVariables): MutationRef<DeleteBookingData, DeleteBookingVariables>;
}
export const deleteBookingRef: DeleteBookingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteBooking(dc: DataConnect, vars: DeleteBookingVariables): MutationPromise<DeleteBookingData, DeleteBookingVariables>;

interface DeleteBookingRef {
  ...
  (dc: DataConnect, vars: DeleteBookingVariables): MutationRef<DeleteBookingData, DeleteBookingVariables>;
}
export const deleteBookingRef: DeleteBookingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteBookingRef:
```typescript
const name = deleteBookingRef.operationName;
console.log(name);
```

### Variables
The `DeleteBooking` mutation requires an argument of type `DeleteBookingVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteBookingVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteBooking` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteBookingData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteBookingData {
  booking_delete?: Booking_Key | null;
}
```
### Using `DeleteBooking`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteBooking, DeleteBookingVariables } from '@dataconnect/generated';

// The `DeleteBooking` mutation requires an argument of type `DeleteBookingVariables`:
const deleteBookingVars: DeleteBookingVariables = {
  id: ..., 
};

// Call the `deleteBooking()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteBooking(deleteBookingVars);
// Variables can be defined inline as well.
const { data } = await deleteBooking({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteBooking(dataConnect, deleteBookingVars);

console.log(data.booking_delete);

// Or, you can use the `Promise` API.
deleteBooking(deleteBookingVars).then((response) => {
  const data = response.data;
  console.log(data.booking_delete);
});
```

### Using `DeleteBooking`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteBookingRef, DeleteBookingVariables } from '@dataconnect/generated';

// The `DeleteBooking` mutation requires an argument of type `DeleteBookingVariables`:
const deleteBookingVars: DeleteBookingVariables = {
  id: ..., 
};

// Call the `deleteBookingRef()` function to get a reference to the mutation.
const ref = deleteBookingRef(deleteBookingVars);
// Variables can be defined inline as well.
const ref = deleteBookingRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteBookingRef(dataConnect, deleteBookingVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.booking_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.booking_delete);
});
```

## CreateCargo
You can execute the `CreateCargo` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createCargo(vars: CreateCargoVariables): MutationPromise<CreateCargoData, CreateCargoVariables>;

interface CreateCargoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCargoVariables): MutationRef<CreateCargoData, CreateCargoVariables>;
}
export const createCargoRef: CreateCargoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createCargo(dc: DataConnect, vars: CreateCargoVariables): MutationPromise<CreateCargoData, CreateCargoVariables>;

interface CreateCargoRef {
  ...
  (dc: DataConnect, vars: CreateCargoVariables): MutationRef<CreateCargoData, CreateCargoVariables>;
}
export const createCargoRef: CreateCargoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createCargoRef:
```typescript
const name = createCargoRef.operationName;
console.log(name);
```

### Variables
The `CreateCargo` mutation requires an argument of type `CreateCargoVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateCargoVariables {
  trackingNumber: string;
  weight: number;
  flightId: UUIDString;
}
```
### Return Type
Recall that executing the `CreateCargo` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateCargoData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCargoData {
  cargo_insert: Cargo_Key;
}
```
### Using `CreateCargo`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCargo, CreateCargoVariables } from '@dataconnect/generated';

// The `CreateCargo` mutation requires an argument of type `CreateCargoVariables`:
const createCargoVars: CreateCargoVariables = {
  trackingNumber: ..., 
  weight: ..., 
  flightId: ..., 
};

// Call the `createCargo()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createCargo(createCargoVars);
// Variables can be defined inline as well.
const { data } = await createCargo({ trackingNumber: ..., weight: ..., flightId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createCargo(dataConnect, createCargoVars);

console.log(data.cargo_insert);

// Or, you can use the `Promise` API.
createCargo(createCargoVars).then((response) => {
  const data = response.data;
  console.log(data.cargo_insert);
});
```

### Using `CreateCargo`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createCargoRef, CreateCargoVariables } from '@dataconnect/generated';

// The `CreateCargo` mutation requires an argument of type `CreateCargoVariables`:
const createCargoVars: CreateCargoVariables = {
  trackingNumber: ..., 
  weight: ..., 
  flightId: ..., 
};

// Call the `createCargoRef()` function to get a reference to the mutation.
const ref = createCargoRef(createCargoVars);
// Variables can be defined inline as well.
const ref = createCargoRef({ trackingNumber: ..., weight: ..., flightId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createCargoRef(dataConnect, createCargoVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.cargo_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.cargo_insert);
});
```

## UpdateCargoStatus
You can execute the `UpdateCargoStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateCargoStatus(vars: UpdateCargoStatusVariables): MutationPromise<UpdateCargoStatusData, UpdateCargoStatusVariables>;

interface UpdateCargoStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCargoStatusVariables): MutationRef<UpdateCargoStatusData, UpdateCargoStatusVariables>;
}
export const updateCargoStatusRef: UpdateCargoStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateCargoStatus(dc: DataConnect, vars: UpdateCargoStatusVariables): MutationPromise<UpdateCargoStatusData, UpdateCargoStatusVariables>;

interface UpdateCargoStatusRef {
  ...
  (dc: DataConnect, vars: UpdateCargoStatusVariables): MutationRef<UpdateCargoStatusData, UpdateCargoStatusVariables>;
}
export const updateCargoStatusRef: UpdateCargoStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateCargoStatusRef:
```typescript
const name = updateCargoStatusRef.operationName;
console.log(name);
```

### Variables
The `UpdateCargoStatus` mutation requires an argument of type `UpdateCargoStatusVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateCargoStatusVariables {
  id: UUIDString;
  status: string;
}
```
### Return Type
Recall that executing the `UpdateCargoStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateCargoStatusData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateCargoStatusData {
  cargo_update?: Cargo_Key | null;
}
```
### Using `UpdateCargoStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateCargoStatus, UpdateCargoStatusVariables } from '@dataconnect/generated';

// The `UpdateCargoStatus` mutation requires an argument of type `UpdateCargoStatusVariables`:
const updateCargoStatusVars: UpdateCargoStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateCargoStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateCargoStatus(updateCargoStatusVars);
// Variables can be defined inline as well.
const { data } = await updateCargoStatus({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateCargoStatus(dataConnect, updateCargoStatusVars);

console.log(data.cargo_update);

// Or, you can use the `Promise` API.
updateCargoStatus(updateCargoStatusVars).then((response) => {
  const data = response.data;
  console.log(data.cargo_update);
});
```

### Using `UpdateCargoStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateCargoStatusRef, UpdateCargoStatusVariables } from '@dataconnect/generated';

// The `UpdateCargoStatus` mutation requires an argument of type `UpdateCargoStatusVariables`:
const updateCargoStatusVars: UpdateCargoStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateCargoStatusRef()` function to get a reference to the mutation.
const ref = updateCargoStatusRef(updateCargoStatusVars);
// Variables can be defined inline as well.
const ref = updateCargoStatusRef({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateCargoStatusRef(dataConnect, updateCargoStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.cargo_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.cargo_update);
});
```

## DeleteCargo
You can execute the `DeleteCargo` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteCargo(vars: DeleteCargoVariables): MutationPromise<DeleteCargoData, DeleteCargoVariables>;

interface DeleteCargoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteCargoVariables): MutationRef<DeleteCargoData, DeleteCargoVariables>;
}
export const deleteCargoRef: DeleteCargoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteCargo(dc: DataConnect, vars: DeleteCargoVariables): MutationPromise<DeleteCargoData, DeleteCargoVariables>;

interface DeleteCargoRef {
  ...
  (dc: DataConnect, vars: DeleteCargoVariables): MutationRef<DeleteCargoData, DeleteCargoVariables>;
}
export const deleteCargoRef: DeleteCargoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteCargoRef:
```typescript
const name = deleteCargoRef.operationName;
console.log(name);
```

### Variables
The `DeleteCargo` mutation requires an argument of type `DeleteCargoVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteCargoVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteCargo` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteCargoData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteCargoData {
  cargo_delete?: Cargo_Key | null;
}
```
### Using `DeleteCargo`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteCargo, DeleteCargoVariables } from '@dataconnect/generated';

// The `DeleteCargo` mutation requires an argument of type `DeleteCargoVariables`:
const deleteCargoVars: DeleteCargoVariables = {
  id: ..., 
};

// Call the `deleteCargo()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteCargo(deleteCargoVars);
// Variables can be defined inline as well.
const { data } = await deleteCargo({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteCargo(dataConnect, deleteCargoVars);

console.log(data.cargo_delete);

// Or, you can use the `Promise` API.
deleteCargo(deleteCargoVars).then((response) => {
  const data = response.data;
  console.log(data.cargo_delete);
});
```

### Using `DeleteCargo`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteCargoRef, DeleteCargoVariables } from '@dataconnect/generated';

// The `DeleteCargo` mutation requires an argument of type `DeleteCargoVariables`:
const deleteCargoVars: DeleteCargoVariables = {
  id: ..., 
};

// Call the `deleteCargoRef()` function to get a reference to the mutation.
const ref = deleteCargoRef(deleteCargoVars);
// Variables can be defined inline as well.
const ref = deleteCargoRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteCargoRef(dataConnect, deleteCargoVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.cargo_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.cargo_delete);
});
```

