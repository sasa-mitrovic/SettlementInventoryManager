import { AnyResponse } from './typeUtils';
import {
  PostgrestResponse,
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse,
} from '@supabase/supabase-js';
import useSWR from 'swr';
import type { SWRResponse } from 'swr';
import { toSupabasePromise } from './supabasePromise';

const getCacheKeysFromSupabase = <T>(prom: PromiseLike<AnyResponse<T>>) => {
  // @ts-ignore
  const schema = prom.schema;
  // @ts-ignore
  const pathKey = prom.url.pathname;
  // @ts-ignore
  const searchKeys = prom.url.searchParams.toString();
  return [schema, pathKey, searchKeys];
};

export function getSupaWR<T>(
  prom: () => PromiseLike<PostgrestResponse<T>>,
): SWRResponse<T[], Error> & { error: Error | null };
export function getSupaWR<T>(
  prom: () => PromiseLike<PostgrestSingleResponse<T>>,
): SWRResponse<T, Error> & { error: Error | null };
export function getSupaWR<T>(
  prom: () => PromiseLike<PostgrestMaybeSingleResponse<T>>,
): SWRResponse<T | null, Error> & { error: Error | null };

export function getSupaWR<T>(
  promiseFactory: () => PromiseLike<PostgrestResponse<T>>,
): any {
  const keys = getCacheKeysFromSupabase(promiseFactory());

  const promiseIn = promiseFactory();
  const supabasePromise = toSupabasePromise<T>(promiseIn);
  return useSWR(keys, {
    fetcher: () => {
      return supabasePromise;
    },
  });
}
