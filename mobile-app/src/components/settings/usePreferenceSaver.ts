import { useState } from 'react';

import useAppTheme from '../../hooks/useAppTheme';
import { useUpdatePreferencesMutation } from '../../store/api/authApi';
import { getApiErrorMessage } from '../marketplace/apiErrors';

type PreferencePatch = Parameters<ReturnType<typeof useUpdatePreferencesMutation>[0]>[0];

export const usePreferenceSaver = () => {
  const { t } = useAppTheme();
  const [updatePreferences, { isLoading }] = useUpdatePreferencesMutation();
  const [errorMessage, setErrorMessage] = useState('');

  const save = async (patch: PreferencePatch, rollback: () => void) => {
    setErrorMessage('');
    try {
      await updatePreferences(patch).unwrap();
    } catch (error) {
      rollback();
      setErrorMessage(
        getApiErrorMessage(
          error,
          t(
            'Impossible d’enregistrer ce réglage pour le moment.',
            'Unable to save this setting right now.',
          ),
        ),
      );
    }
  };

  return { save, isSaving: isLoading, errorMessage };
};

export default usePreferenceSaver;
