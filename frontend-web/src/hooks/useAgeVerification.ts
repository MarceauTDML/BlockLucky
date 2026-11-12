'use client';

import { useEffect } from 'react';
import useAuth from '@/hooks/useAuth';
import storage, { KEYS } from '@/lib/storage';
import { useAppDispatch } from '@/store';
import { useGetIdentityStatusQuery } from '@/store/api/authApi';
import { updateUserProfile } from '@/store/slices/authSlice';
import { AgeVerificationStatus } from '@/types/user.types';

export const useAgeVerification = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const query = useGetIdentityStatusQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const live = query.data?.data?.status;

  useEffect(() => {
    if (!user || !live || live === user.ageVerificationStatus) return;
    dispatch(updateUserProfile({ ageVerificationStatus: live }));
    storage.setJson(KEYS.user, { ...user, ageVerificationStatus: live });
  }, [dispatch, live, user]);

  const status: AgeVerificationStatus | undefined = live ?? user?.ageVerificationStatus;

  return { ...query, identity: query.data?.data, status };
};

export default useAgeVerification;
