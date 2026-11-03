import { useContext } from 'react';
import { ThemeContext, ThemeContextValue } from '../theme/ThemeProvider';

export const useAppTheme = (): ThemeContextValue => {
  return useContext(ThemeContext);
};

export default useAppTheme;
