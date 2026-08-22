# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





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