import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Airport_Key {
  id: UUIDString;
  __typename?: 'Airport_Key';
}

export interface Booking_Key {
  id: UUIDString;
  __typename?: 'Booking_Key';
}

export interface Cargo_Key {
  id: UUIDString;
  __typename?: 'Cargo_Key';
}

export interface CreateAirportData {
  airport_insert: Airport_Key;
}

export interface CreateBookingData {
  booking_insert: Booking_Key;
}

export interface CreateBookingVariables {
  flightId: UUIDString;
  seat: string;
}

export interface CreateCargoData {
  cargo_insert: Cargo_Key;
}

export interface CreateCargoVariables {
  trackingNumber: string;
  weight: number;
  flightId: UUIDString;
}

export interface CreateFlightData {
  flight_insert: Flight_Key;
}

export interface CreateFlightVariables {
  flightNumber: string;
  originId: UUIDString;
  destId: UUIDString;
  departure: TimestampString;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  email: string;
  name: string;
  role: string;
}

export interface DeleteAirportData {
  airport_delete?: Airport_Key | null;
}

export interface DeleteAirportVariables {
  id: UUIDString;
}

export interface DeleteBookingData {
  booking_delete?: Booking_Key | null;
}

export interface DeleteBookingVariables {
  id: UUIDString;
}

export interface DeleteCargoData {
  cargo_delete?: Cargo_Key | null;
}

export interface DeleteCargoVariables {
  id: UUIDString;
}

export interface DeleteFlightData {
  flight_delete?: Flight_Key | null;
}

export interface DeleteFlightVariables {
  id: UUIDString;
}

export interface DeleteMyAccountData {
  user_delete?: User_Key | null;
}

export interface Flight_Key {
  id: UUIDString;
  __typename?: 'Flight_Key';
}

export interface GetAirportsData {
  airports: ({
    id: UUIDString;
    name: string;
    city: string;
    airportCode: string;
  } & Airport_Key)[];
}

export interface GetMyProfileData {
  user?: {
    name: string;
    email: string;
    phoneNumber?: string | null;
  };
}

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

export interface ListMyBookingsData {
  bookings: ({
    seatNumber: string;
    flight: {
      flightNumber: string;
      departureTime: TimestampString;
    };
  })[];
}

export interface UpdateAirportData {
  airport_update?: Airport_Key | null;
}

export interface UpdateAirportVariables {
  id: UUIDString;
  capacity?: number | null;
}

export interface UpdateBookingData {
  booking_update?: Booking_Key | null;
}

export interface UpdateBookingVariables {
  id: UUIDString;
  seat: string;
}

export interface UpdateCargoStatusData {
  cargo_update?: Cargo_Key | null;
}

export interface UpdateCargoStatusVariables {
  id: UUIDString;
  status: string;
}

export interface UpdateFlightStatusData {
  flight_update?: Flight_Key | null;
}

export interface UpdateFlightStatusVariables {
  id: UUIDString;
  status: string;
}

export interface UpdateMyProfileData {
  user_update?: User_Key | null;
}

export interface UpdateMyProfileVariables {
  name?: string | null;
  phoneNumber?: string | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface GetAirportsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAirportsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAirportsData, undefined>;
  operationName: string;
}
export const getAirportsRef: GetAirportsRef;

export function getAirports(options?: ExecuteQueryOptions): QueryPromise<GetAirportsData, undefined>;
export function getAirports(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetAirportsData, undefined>;

interface CreateAirportRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateAirportData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateAirportData, undefined>;
  operationName: string;
}
export const createAirportRef: CreateAirportRef;

export function createAirport(): MutationPromise<CreateAirportData, undefined>;
export function createAirport(dc: DataConnect): MutationPromise<CreateAirportData, undefined>;

interface UpdateAirportRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateAirportVariables): MutationRef<UpdateAirportData, UpdateAirportVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateAirportVariables): MutationRef<UpdateAirportData, UpdateAirportVariables>;
  operationName: string;
}
export const updateAirportRef: UpdateAirportRef;

export function updateAirport(vars: UpdateAirportVariables): MutationPromise<UpdateAirportData, UpdateAirportVariables>;
export function updateAirport(dc: DataConnect, vars: UpdateAirportVariables): MutationPromise<UpdateAirportData, UpdateAirportVariables>;

interface DeleteAirportRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteAirportVariables): MutationRef<DeleteAirportData, DeleteAirportVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteAirportVariables): MutationRef<DeleteAirportData, DeleteAirportVariables>;
  operationName: string;
}
export const deleteAirportRef: DeleteAirportRef;

export function deleteAirport(vars: DeleteAirportVariables): MutationPromise<DeleteAirportData, DeleteAirportVariables>;
export function deleteAirport(dc: DataConnect, vars: DeleteAirportVariables): MutationPromise<DeleteAirportData, DeleteAirportVariables>;

interface GetMyProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProfileData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyProfileData, undefined>;
  operationName: string;
}
export const getMyProfileRef: GetMyProfileRef;

export function getMyProfile(options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;
export function getMyProfile(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;
export function createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface UpdateMyProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpdateMyProfileVariables): MutationRef<UpdateMyProfileData, UpdateMyProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: UpdateMyProfileVariables): MutationRef<UpdateMyProfileData, UpdateMyProfileVariables>;
  operationName: string;
}
export const updateMyProfileRef: UpdateMyProfileRef;

export function updateMyProfile(vars?: UpdateMyProfileVariables): MutationPromise<UpdateMyProfileData, UpdateMyProfileVariables>;
export function updateMyProfile(dc: DataConnect, vars?: UpdateMyProfileVariables): MutationPromise<UpdateMyProfileData, UpdateMyProfileVariables>;

interface DeleteMyAccountRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteMyAccountData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteMyAccountData, undefined>;
  operationName: string;
}
export const deleteMyAccountRef: DeleteMyAccountRef;

export function deleteMyAccount(): MutationPromise<DeleteMyAccountData, undefined>;
export function deleteMyAccount(dc: DataConnect): MutationPromise<DeleteMyAccountData, undefined>;

interface ListFlightsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListFlightsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListFlightsData, undefined>;
  operationName: string;
}
export const listFlightsRef: ListFlightsRef;

export function listFlights(options?: ExecuteQueryOptions): QueryPromise<ListFlightsData, undefined>;
export function listFlights(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListFlightsData, undefined>;

interface CreateFlightRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateFlightVariables): MutationRef<CreateFlightData, CreateFlightVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateFlightVariables): MutationRef<CreateFlightData, CreateFlightVariables>;
  operationName: string;
}
export const createFlightRef: CreateFlightRef;

export function createFlight(vars: CreateFlightVariables): MutationPromise<CreateFlightData, CreateFlightVariables>;
export function createFlight(dc: DataConnect, vars: CreateFlightVariables): MutationPromise<CreateFlightData, CreateFlightVariables>;

interface UpdateFlightStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateFlightStatusVariables): MutationRef<UpdateFlightStatusData, UpdateFlightStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateFlightStatusVariables): MutationRef<UpdateFlightStatusData, UpdateFlightStatusVariables>;
  operationName: string;
}
export const updateFlightStatusRef: UpdateFlightStatusRef;

export function updateFlightStatus(vars: UpdateFlightStatusVariables): MutationPromise<UpdateFlightStatusData, UpdateFlightStatusVariables>;
export function updateFlightStatus(dc: DataConnect, vars: UpdateFlightStatusVariables): MutationPromise<UpdateFlightStatusData, UpdateFlightStatusVariables>;

interface DeleteFlightRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteFlightVariables): MutationRef<DeleteFlightData, DeleteFlightVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteFlightVariables): MutationRef<DeleteFlightData, DeleteFlightVariables>;
  operationName: string;
}
export const deleteFlightRef: DeleteFlightRef;

export function deleteFlight(vars: DeleteFlightVariables): MutationPromise<DeleteFlightData, DeleteFlightVariables>;
export function deleteFlight(dc: DataConnect, vars: DeleteFlightVariables): MutationPromise<DeleteFlightData, DeleteFlightVariables>;

interface ListMyBookingsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyBookingsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyBookingsData, undefined>;
  operationName: string;
}
export const listMyBookingsRef: ListMyBookingsRef;

export function listMyBookings(options?: ExecuteQueryOptions): QueryPromise<ListMyBookingsData, undefined>;
export function listMyBookings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyBookingsData, undefined>;

interface CreateBookingRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateBookingVariables): MutationRef<CreateBookingData, CreateBookingVariables>;
  operationName: string;
}
export const createBookingRef: CreateBookingRef;

export function createBooking(vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;
export function createBooking(dc: DataConnect, vars: CreateBookingVariables): MutationPromise<CreateBookingData, CreateBookingVariables>;

interface UpdateBookingRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateBookingVariables): MutationRef<UpdateBookingData, UpdateBookingVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateBookingVariables): MutationRef<UpdateBookingData, UpdateBookingVariables>;
  operationName: string;
}
export const updateBookingRef: UpdateBookingRef;

export function updateBooking(vars: UpdateBookingVariables): MutationPromise<UpdateBookingData, UpdateBookingVariables>;
export function updateBooking(dc: DataConnect, vars: UpdateBookingVariables): MutationPromise<UpdateBookingData, UpdateBookingVariables>;

interface DeleteBookingRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteBookingVariables): MutationRef<DeleteBookingData, DeleteBookingVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteBookingVariables): MutationRef<DeleteBookingData, DeleteBookingVariables>;
  operationName: string;
}
export const deleteBookingRef: DeleteBookingRef;

export function deleteBooking(vars: DeleteBookingVariables): MutationPromise<DeleteBookingData, DeleteBookingVariables>;
export function deleteBooking(dc: DataConnect, vars: DeleteBookingVariables): MutationPromise<DeleteBookingData, DeleteBookingVariables>;

interface ListCargoRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCargoData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCargoData, undefined>;
  operationName: string;
}
export const listCargoRef: ListCargoRef;

export function listCargo(options?: ExecuteQueryOptions): QueryPromise<ListCargoData, undefined>;
export function listCargo(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCargoData, undefined>;

interface CreateCargoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCargoVariables): MutationRef<CreateCargoData, CreateCargoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateCargoVariables): MutationRef<CreateCargoData, CreateCargoVariables>;
  operationName: string;
}
export const createCargoRef: CreateCargoRef;

export function createCargo(vars: CreateCargoVariables): MutationPromise<CreateCargoData, CreateCargoVariables>;
export function createCargo(dc: DataConnect, vars: CreateCargoVariables): MutationPromise<CreateCargoData, CreateCargoVariables>;

interface UpdateCargoStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCargoStatusVariables): MutationRef<UpdateCargoStatusData, UpdateCargoStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateCargoStatusVariables): MutationRef<UpdateCargoStatusData, UpdateCargoStatusVariables>;
  operationName: string;
}
export const updateCargoStatusRef: UpdateCargoStatusRef;

export function updateCargoStatus(vars: UpdateCargoStatusVariables): MutationPromise<UpdateCargoStatusData, UpdateCargoStatusVariables>;
export function updateCargoStatus(dc: DataConnect, vars: UpdateCargoStatusVariables): MutationPromise<UpdateCargoStatusData, UpdateCargoStatusVariables>;

interface DeleteCargoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteCargoVariables): MutationRef<DeleteCargoData, DeleteCargoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteCargoVariables): MutationRef<DeleteCargoData, DeleteCargoVariables>;
  operationName: string;
}
export const deleteCargoRef: DeleteCargoRef;

export function deleteCargo(vars: DeleteCargoVariables): MutationPromise<DeleteCargoData, DeleteCargoVariables>;
export function deleteCargo(dc: DataConnect, vars: DeleteCargoVariables): MutationPromise<DeleteCargoData, DeleteCargoVariables>;

