import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { BarList } from '@/components/charts/Charts';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import RequireRole from '@/components/layout/RequireRole';
import authReducer, { AuthState } from '@/store/slices/authSlice';
import ThemeProvider from '@/theme/ThemeProvider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/mairie',
}));

const withTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Button', () => {
  it('se désactive et signale le chargement pendant une action (anti double-clic)', () => {
    const onClick = vi.fn();
    withTheme(
      <Button loading onClick={onClick}>
        Confirmer
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('ProgressBar', () => {
  it('expose la progression aux technologies d’assistance', () => {
    withTheme(<ProgressBar percentage={42} currentValue={4200} targetValue={10000} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });
});

describe('BarList', () => {
  it('fournit un tableau équivalent pour les lecteurs d’écran', () => {
    withTheme(
      <BarList
        caption="Âges"
        data={[
          { label: '18-25', value: 10 },
          { label: '26-35', value: 30 },
        ]}
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '26-35' })).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  const renderWithAuth = (auth: Partial<AuthState>) => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          hydrated: true,
          isAuthenticated: true,
          token: 'jwt',
          user: null,
          pendingTwoFactorUserId: null,
          pendingTwoFactorMethod: null,
          pendingTwoFactorEmail: null,
          ...auth,
        },
      },
    });
    return render(
      <Provider store={store}>
        <ThemeProvider>
          <RequireRole roles={['ADMIN']}>
            <p>Zone Mairie</p>
          </RequireRole>
        </ThemeProvider>
      </Provider>
    );
  };

  it('affiche l’écran Accès refusé (403) pour un citoyen', () => {
    renderWithAuth({
      user: { id: '1', walletAddress: '0xabc', role: 'USER', pointsBalance: 0, referralCode: 'r', isTwoFactorEnabled: false },
    });
    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
    expect(screen.queryByText('Zone Mairie')).not.toBeInTheDocument();
  });

  it('laisse passer un administrateur', () => {
    renderWithAuth({
      user: { id: '1', walletAddress: '0xabc', role: 'ADMIN', pointsBalance: 0, referralCode: 'r', isTwoFactorEnabled: false },
    });
    expect(screen.getByText('Zone Mairie')).toBeInTheDocument();
  });
});
