import { useCallback, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { useGetPointsBalanceQuery } from '../store/api/marketplaceApi';
import { updateUserPoints } from '../store/slices/authSlice';

export const usePoints = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userPoints = useAppSelector((state) => state.auth.user?.pointsBalance ?? 0);

  const { data, isLoading, refetch } = useGetPointsBalanceQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (data?.data?.pointsBalance !== undefined) {
      dispatch(updateUserPoints(data.data.pointsBalance));
    }
  }, [data, dispatch]);

  const setPointsBalance = useCallback(
    (balance: number) => {
      dispatch(updateUserPoints(balance));
    },
    [dispatch],
  );

  return {
    pointsBalance: userPoints,
    setPointsBalance,
    ledgerIntegrityValid: data?.data?.ledgerIntegrityValid ?? true,
    history: data?.data?.history ?? [],
    isLoading,
    refetchPoints: refetch,
  };
};

export default usePoints;
