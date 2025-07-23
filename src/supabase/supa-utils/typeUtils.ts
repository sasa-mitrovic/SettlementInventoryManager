import {
  PostgrestResponse,
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse,
} from '@supabase/supabase-js';

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type AnyResponse<T> =
  | PostgrestResponse<T>
  | PostgrestSingleResponse<T>
  | PostgrestMaybeSingleResponse<T>;

export type Success<T> = Extract<PostgrestSingleResponse<T>, { error: null }>;
