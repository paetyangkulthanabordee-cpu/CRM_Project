import useSWR from "swr";

import { api } from "./api";

export const fetcher = async <T,>(
  url: string,
): Promise<T> => {
  const response = await api.get<T>(url);
  return response.data;
};

export const useApi = <T,>(
  url: string | null,
) => {
  return useSWR<T>(url, fetcher<T>, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
    keepPreviousData: true,
  });
};
