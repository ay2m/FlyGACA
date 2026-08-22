import { GetAirportsData, CreateAirportData, UpdateAirportData, UpdateAirportVariables, DeleteAirportData, DeleteAirportVariables, GetMyProfileData, CreateUserData, CreateUserVariables, UpdateMyProfileData, UpdateMyProfileVariables, DeleteMyAccountData, ListFlightsData, CreateFlightData, CreateFlightVariables, UpdateFlightStatusData, UpdateFlightStatusVariables, DeleteFlightData, DeleteFlightVariables, ListMyBookingsData, CreateBookingData, CreateBookingVariables, UpdateBookingData, UpdateBookingVariables, DeleteBookingData, DeleteBookingVariables, ListCargoData, CreateCargoData, CreateCargoVariables, UpdateCargoStatusData, UpdateCargoStatusVariables, DeleteCargoData, DeleteCargoVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useGetAirports(options?: useDataConnectQueryOptions<GetAirportsData>): UseDataConnectQueryResult<GetAirportsData, undefined>;
export function useGetAirports(dc: DataConnect, options?: useDataConnectQueryOptions<GetAirportsData>): UseDataConnectQueryResult<GetAirportsData, undefined>;

export function useCreateAirport(options?: useDataConnectMutationOptions<CreateAirportData, FirebaseError, void>): UseDataConnectMutationResult<CreateAirportData, undefined>;
export function useCreateAirport(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAirportData, FirebaseError, void>): UseDataConnectMutationResult<CreateAirportData, undefined>;

export function useUpdateAirport(options?: useDataConnectMutationOptions<UpdateAirportData, FirebaseError, UpdateAirportVariables>): UseDataConnectMutationResult<UpdateAirportData, UpdateAirportVariables>;
export function useUpdateAirport(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateAirportData, FirebaseError, UpdateAirportVariables>): UseDataConnectMutationResult<UpdateAirportData, UpdateAirportVariables>;

export function useDeleteAirport(options?: useDataConnectMutationOptions<DeleteAirportData, FirebaseError, DeleteAirportVariables>): UseDataConnectMutationResult<DeleteAirportData, DeleteAirportVariables>;
export function useDeleteAirport(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteAirportData, FirebaseError, DeleteAirportVariables>): UseDataConnectMutationResult<DeleteAirportData, DeleteAirportVariables>;

export function useGetMyProfile(options?: useDataConnectQueryOptions<GetMyProfileData>): UseDataConnectQueryResult<GetMyProfileData, undefined>;
export function useGetMyProfile(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyProfileData>): UseDataConnectQueryResult<GetMyProfileData, undefined>;

export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;

export function useUpdateMyProfile(options?: useDataConnectMutationOptions<UpdateMyProfileData, FirebaseError, UpdateMyProfileVariables | void>): UseDataConnectMutationResult<UpdateMyProfileData, UpdateMyProfileVariables>;
export function useUpdateMyProfile(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateMyProfileData, FirebaseError, UpdateMyProfileVariables | void>): UseDataConnectMutationResult<UpdateMyProfileData, UpdateMyProfileVariables>;

export function useDeleteMyAccount(options?: useDataConnectMutationOptions<DeleteMyAccountData, FirebaseError, void>): UseDataConnectMutationResult<DeleteMyAccountData, undefined>;
export function useDeleteMyAccount(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteMyAccountData, FirebaseError, void>): UseDataConnectMutationResult<DeleteMyAccountData, undefined>;

export function useListFlights(options?: useDataConnectQueryOptions<ListFlightsData>): UseDataConnectQueryResult<ListFlightsData, undefined>;
export function useListFlights(dc: DataConnect, options?: useDataConnectQueryOptions<ListFlightsData>): UseDataConnectQueryResult<ListFlightsData, undefined>;

export function useCreateFlight(options?: useDataConnectMutationOptions<CreateFlightData, FirebaseError, CreateFlightVariables>): UseDataConnectMutationResult<CreateFlightData, CreateFlightVariables>;
export function useCreateFlight(dc: DataConnect, options?: useDataConnectMutationOptions<CreateFlightData, FirebaseError, CreateFlightVariables>): UseDataConnectMutationResult<CreateFlightData, CreateFlightVariables>;

export function useUpdateFlightStatus(options?: useDataConnectMutationOptions<UpdateFlightStatusData, FirebaseError, UpdateFlightStatusVariables>): UseDataConnectMutationResult<UpdateFlightStatusData, UpdateFlightStatusVariables>;
export function useUpdateFlightStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateFlightStatusData, FirebaseError, UpdateFlightStatusVariables>): UseDataConnectMutationResult<UpdateFlightStatusData, UpdateFlightStatusVariables>;

export function useDeleteFlight(options?: useDataConnectMutationOptions<DeleteFlightData, FirebaseError, DeleteFlightVariables>): UseDataConnectMutationResult<DeleteFlightData, DeleteFlightVariables>;
export function useDeleteFlight(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteFlightData, FirebaseError, DeleteFlightVariables>): UseDataConnectMutationResult<DeleteFlightData, DeleteFlightVariables>;

export function useListMyBookings(options?: useDataConnectQueryOptions<ListMyBookingsData>): UseDataConnectQueryResult<ListMyBookingsData, undefined>;
export function useListMyBookings(dc: DataConnect, options?: useDataConnectQueryOptions<ListMyBookingsData>): UseDataConnectQueryResult<ListMyBookingsData, undefined>;

export function useCreateBooking(options?: useDataConnectMutationOptions<CreateBookingData, FirebaseError, CreateBookingVariables>): UseDataConnectMutationResult<CreateBookingData, CreateBookingVariables>;
export function useCreateBooking(dc: DataConnect, options?: useDataConnectMutationOptions<CreateBookingData, FirebaseError, CreateBookingVariables>): UseDataConnectMutationResult<CreateBookingData, CreateBookingVariables>;

export function useUpdateBooking(options?: useDataConnectMutationOptions<UpdateBookingData, FirebaseError, UpdateBookingVariables>): UseDataConnectMutationResult<UpdateBookingData, UpdateBookingVariables>;
export function useUpdateBooking(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateBookingData, FirebaseError, UpdateBookingVariables>): UseDataConnectMutationResult<UpdateBookingData, UpdateBookingVariables>;

export function useDeleteBooking(options?: useDataConnectMutationOptions<DeleteBookingData, FirebaseError, DeleteBookingVariables>): UseDataConnectMutationResult<DeleteBookingData, DeleteBookingVariables>;
export function useDeleteBooking(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteBookingData, FirebaseError, DeleteBookingVariables>): UseDataConnectMutationResult<DeleteBookingData, DeleteBookingVariables>;

export function useListCargo(options?: useDataConnectQueryOptions<ListCargoData>): UseDataConnectQueryResult<ListCargoData, undefined>;
export function useListCargo(dc: DataConnect, options?: useDataConnectQueryOptions<ListCargoData>): UseDataConnectQueryResult<ListCargoData, undefined>;

export function useCreateCargo(options?: useDataConnectMutationOptions<CreateCargoData, FirebaseError, CreateCargoVariables>): UseDataConnectMutationResult<CreateCargoData, CreateCargoVariables>;
export function useCreateCargo(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCargoData, FirebaseError, CreateCargoVariables>): UseDataConnectMutationResult<CreateCargoData, CreateCargoVariables>;

export function useUpdateCargoStatus(options?: useDataConnectMutationOptions<UpdateCargoStatusData, FirebaseError, UpdateCargoStatusVariables>): UseDataConnectMutationResult<UpdateCargoStatusData, UpdateCargoStatusVariables>;
export function useUpdateCargoStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateCargoStatusData, FirebaseError, UpdateCargoStatusVariables>): UseDataConnectMutationResult<UpdateCargoStatusData, UpdateCargoStatusVariables>;

export function useDeleteCargo(options?: useDataConnectMutationOptions<DeleteCargoData, FirebaseError, DeleteCargoVariables>): UseDataConnectMutationResult<DeleteCargoData, DeleteCargoVariables>;
export function useDeleteCargo(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteCargoData, FirebaseError, DeleteCargoVariables>): UseDataConnectMutationResult<DeleteCargoData, DeleteCargoVariables>;
