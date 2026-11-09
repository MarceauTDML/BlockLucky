'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetPointsBalanceQuery } from '@/store/api/marketplaceApi';
import { updateUserPoints } from '@/store/slices/authSlice';

export const usePoints = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userPoints = useAppSelector((state) => state.auth.user?.pointsBalance ?? 0);

  const { data, isLoading, refetch } = useGetPointsBalanceQuery(undefined, {
    skip: !isAuthenticated,
  });

  const remoteBalance = data?.data?.balance ?? data?.data?.pointsBalance;

  useEffect(() => {
    if (remoteBalance !== undefined) dispatch(updateUserPoints(remoteBalance));
  }, [remoteBalance, dispatch]);

  return {
    pointsBalance: remoteBalance ?? userPoints,
    ledgerIntegrityValid: data?.data?.ledgerIntegrityValid ?? true,
    history: data?.data?.history ?? [],
    isLoading,
    refetchPoints: refetch,
  };
};

export default usePoints;
