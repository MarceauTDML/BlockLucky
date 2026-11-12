'use client';

import React, { useEffect, useState } from 'react';
import AdminQueryError from '@/components/admin/AdminQueryError';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Input, { Select } from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, EmptyState, PageHeader } from '@/components/ui/Misc';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import Sheet from '@/components/ui/Sheet';
import { formatDateShort } from '@/lib/date';
import { useAppSelector } from '@/store';
import {
  useCreateStaffAccountMutation,
  useGetStaffAccountsQuery,
  useUpdateStaffRoleMutation,
} from '@/store/api/adminApi';
import { getErrorMessage } from '@/store/api/baseApi';
import { useGetPartnersQuery } from '@/store/api/partnersApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { StaffAccount, StaffRole } from '@/types/admin.types';
import { Role } from '@/types/user.types';

const PAGE_SIZE = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LABELS: Record<Role, [string, string, 'secondary' | 'warning' | 'neutral']> = {
  ADMIN: ['Mairie', 'City Hall', 'secondary'],
  PARTNER: ['Partenaire', 'Partner', 'warning'],
  USER: ['Citoyen', 'Citizen', 'neutral'],
};

const emptyForm = { email: '', firstName: '', lastName: '', role: 'PARTNER' as StaffRole, partnerId: '' };

const displayName = (account: StaffAccount): string | null => {
  const name = [account.firstName, account.lastName].filter(Boolean).join(' ').trim();
  return name || null;
};

const initialsOf = (account: StaffAccount): string => {
  const source = displayName(account) ?? account.email ?? '?';
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

export default function StaffAccountsPage() {
  const { t } = useAppTheme();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const [role, setRole] = useState<StaffRole>('ADMIN');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<{ email?: string; form?: string }>({});

  const [target, setTarget] = useState<StaffAccount | null>(null);
  const [nextRole, setNextRole] = useState<Role | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error, isFetching, refetch } = useGetStaffAccountsQuery({
    role,
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
  });
  const partnersQuery = useGetPartnersQuery(undefined, { skip: !creating });
  const [createAccount, { isLoading: savingAccount }] = useCreateStaffAccountMutation();
  const [updateRole, { isLoading: savingRole }] = useUpdateStaffRoleMutation();

  const accounts = data?.data?.accounts ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const partners = partnersQuery.data?.data?.partners ?? [];

  const changeRole = (next: StaffRole) => {
    setRole(next);
    setPage(1);
  };

  const openCreate = () => {
    setFeedback(null);
    setForm({ ...emptyForm, role });
    setFormErrors({});
    setCreating(true);
  };

  const closeCreate = () => {
    setCreating(false);
    setFormErrors({});
  };

  const closeRoleSheet = () => {
    setTarget(null);
    setNextRole(null);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setFormErrors({ email: t('Adresse email invalide.', 'Invalid email address.') });
      return;
    }
    try {
      const res = await createAccount({
        email,
        role: form.role,
        ...(form.firstName.trim() ? { firstName: form.firstName.trim() } : {}),
        ...(form.lastName.trim() ? { lastName: form.lastName.trim() } : {}),
        ...(form.role === 'PARTNER' && form.partnerId ? { partnerId: form.partnerId } : {}),
      }).unwrap();
      const roleLabel = t(ROLE_LABELS[form.role][0], ROLE_LABELS[form.role][1]);
      setFeedback({
        tone: 'success',
        text: res.data?.created
          ? t(
              `Compte ${roleLabel} créé pour ${email}. Une invitation lui a été envoyée par email.`,
              `${roleLabel} account created for ${email}. An invitation was sent by email.`
            )
          : t(
              `Le compte existant ${email} a reçu le rôle ${roleLabel}. Il a été prévenu par email.`,
              `The existing account ${email} now has the ${roleLabel} role. They were notified by email.`
            ),
      });
      setRole(form.role);
      setPage(1);
      closeCreate();
    } catch (err) {
      setFormErrors({ form: getErrorMessage(err, t('Création du compte impossible.', 'Account creation failed.')) });
    }
  };

  const confirmRoleChange = async () => {
    if (!target || !nextRole) return;
    const name = displayName(target) ?? target.email ?? t('ce compte', 'this account');
    try {
      await updateRole({ id: target.id, role: nextRole }).unwrap();
      setFeedback({
        tone: 'success',
        text:
          nextRole === 'USER'
            ? t(`Le rôle de ${name} a été retiré. Ses sessions ont été fermées.`, `${name}'s role was revoked. Their sessions were closed.`)
            : t(
                `${name} est désormais ${t(ROLE_LABELS[nextRole][0], ROLE_LABELS[nextRole][1])}. Ses sessions ont été fermées.`,
                `${name} is now ${ROLE_LABELS[nextRole][1]}. Their sessions were closed.`
              ),
      });
    } catch (err) {
      setFeedback({ tone: 'error', text: getErrorMessage(err, t('Modification du rôle impossible.', 'Role change failed.')) });
    } finally {
      closeRoleSheet();
    }
  };

  const roleOptions = (account: StaffAccount): Role[] =>
    (['ADMIN', 'PARTNER', 'USER'] as Role[]).filter((value) => value !== account.role);

  return (
    <div>
      <PageHeader
        title={t('Comptes Mairie et partenaires', 'City Hall and partner accounts')}
        subtitle={t(
          "Créez les accès des agents de la Mairie et des commerçants partenaires, ou retirez-les. Chaque changement est tracé dans l'audit.",
          'Create access for City Hall staff and partner merchants, or revoke it. Every change is recorded in the audit log.'
        )}
        actions={
          <>
            <Button size="sm" variant="outline" fullWidth={false} onClick={() => refetch()} loading={isFetching}>
              {t('Actualiser', 'Refresh')}
            </Button>
            <Button size="sm" fullWidth={false} onClick={openCreate}>
              {t('Créer un compte', 'Create an account')}
            </Button>
          </>
        }
      />

      {feedback ? (
        <Alert tone={feedback.tone} className="mb-4">
          {feedback.text}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start">
        <SegmentedTabs<StaffRole>
          ariaLabel={t('Type de compte', 'Account type')}
          value={role}
          onChange={changeRole}
          className="mb-0 md:w-80"
          options={[
            { value: 'ADMIN', label: t('Mairie', 'City Hall') },
            { value: 'PARTNER', label: t('Partenaires', 'Partners') },
          ]}
        />
        <div className="md:flex-1">
          <Input
            type="search"
            aria-label={t('Rechercher un compte', 'Search an account')}
            placeholder={t('Rechercher par email ou nom', 'Search by email or name')}
            value={searchInput}
            maxLength={120}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Loader skeletonRows={4} />
      ) : isError ? (
        <AdminQueryError error={error} fallback={t('Liste des comptes indisponible.', 'Account list unavailable.')} />
      ) : accounts.length === 0 ? (
        <EmptyState
          title={search ? t('Aucun compte trouvé', 'No account found') : t('Aucun compte', 'No account')}
          description={
            role === 'PARTNER'
              ? t('Créez un compte pour permettre à un commerçant de gérer ses offres.', 'Create an account so a merchant can manage their offers.')
              : t('Créez un compte pour un agent de la Mairie.', 'Create an account for a City Hall agent.')
          }
          action={<Button onClick={openCreate}>{t('Créer un compte', 'Create an account')}</Button>}
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {accounts.map((account) => {
              const label = ROLE_LABELS[account.role];
              const name = displayName(account);
              const isSelf = account.id === currentUserId;
              return (
                <li key={account.id} className="card flex flex-col gap-4 p-[18px]">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavender text-small font-bold text-violet"
                    >
                      {initialsOf(account)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-body font-bold">{name ?? account.email ?? t('Compte sans email', 'Account without email')}</h2>
                      {name && account.email ? <p className="truncate text-caption text-fg-secondary">{account.email}</p> : null}
                      <p className="text-caption text-fg-muted">
                        {t('Créé le', 'Created on')} {formatDateShort(account.createdAt)}
                      </p>
                    </div>
                    <Badge tone={label[2]}>{t(label[0], label[1])}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone={account.isTwoFactorEnabled ? 'primary' : 'danger'}>
                      <Icon name={account.isTwoFactorEnabled ? 'shield' : 'alert'} size={14} className="mr-1" />
                      {account.isTwoFactorEnabled ? t('2FA activée', '2FA enabled') : t('2FA désactivée', '2FA disabled')}
                    </Badge>
                    {isSelf ? <Badge tone="neutral">{t('Vous', 'You')}</Badge> : null}
                  </div>

                  {account.role === 'PARTNER' ? (
                    <div>
                      <p className="mb-1.5 text-caption font-medium text-fg-muted">{t('Établissements rattachés', 'Linked businesses')}</p>
                      {account.partners.length ? (
                        <ul className="flex flex-wrap gap-2">
                          {account.partners.map((partner) => (
                            <li
                              key={partner.id}
                              className="rounded-full bg-surface-elevated px-3 py-1 text-caption font-semibold text-fg"
                            >
                              {partner.name}
                              {partner.isActive ? null : ` · ${t('suspendu', 'suspended')}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-caption text-fg-secondary">{t('Aucun établissement rattaché', 'No linked business')}</p>
                      )}
                    </div>
                  ) : null}

                  {isSelf ? null : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFeedback(null);
                        setTarget(account);
                      }}
                    >
                      {t('Modifier le rôle', 'Change role')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button size="sm" variant="outline" fullWidth={false} disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('Précédent', 'Previous')}
              </Button>
              <span className="text-caption text-fg-secondary tabular">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                fullWidth={false}
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('Suivant', 'Next')}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Sheet
        open={creating}
        eyebrow={t('Nouvel accès', 'New access')}
        title={t('Créer un compte', 'Create an account')}
        onClose={closeCreate}
      >
        <form className="flex flex-col gap-3 pb-2" onSubmit={submitCreate} noValidate>
          <Input
            label={t('Adresse email', 'Email address')}
            type="email"
            autoComplete="off"
            required
            value={form.email}
            maxLength={254}
            errorText={formErrors.email}
            hint={t(
              'Si un compte existe déjà avec cette adresse, il recevra simplement ce rôle.',
              'If an account already uses this address, it will simply receive this role.'
            )}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setFormErrors({});
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t('Prénom', 'First name')}
              autoComplete="off"
              value={form.firstName}
              maxLength={80}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <Input
              label={t('Nom', 'Last name')}
              autoComplete="off"
              value={form.lastName}
              maxLength={80}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <Select
            label={t('Rôle', 'Role')}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole, partnerId: '' })}
          >
            <option value="PARTNER">{t('Partenaire (commerçant)', 'Partner (merchant)')}</option>
            <option value="ADMIN">{t('Mairie (administration)', 'City Hall (administration)')}</option>
          </Select>
          {form.role === 'PARTNER' ? (
            <Select
              label={t('Établissement', 'Business')}
              value={form.partnerId}
              disabled={partnersQuery.isLoading}
              hint={
                partnersQuery.isError
                  ? t('Liste des établissements indisponible.', 'Business list unavailable.')
                  : t('Facultatif : le compte pourra gérer les offres de cet établissement.', "Optional: the account will manage this business's offers.")
              }
              onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
            >
              <option value="">{t('Aucun pour le moment', 'None for now')}</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id} disabled={Boolean(partner.ownerId)}>
                  {partner.name}
                  {partner.ownerId ? ` (${t('déjà rattaché', 'already linked')})` : ''}
                </option>
              ))}
            </Select>
          ) : (
            <Alert tone="warning">
              {t(
                "Un compte Mairie accède à toutes les données et actions d'administration. La double authentification lui sera demandée.",
                'A City Hall account can access all administration data and actions. Two-factor authentication will be required.'
              )}
            </Alert>
          )}
          {formErrors.form ? <Alert tone="error">{formErrors.form}</Alert> : null}
          <Button type="submit" loading={savingAccount}>
            {t("Créer et envoyer l'invitation", 'Create and send the invitation')}
          </Button>
          <Button variant="outline" onClick={closeCreate} disabled={savingAccount}>
            {t('Annuler', 'Cancel')}
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={Boolean(target)}
        tone={nextRole === 'USER' ? 'danger' : 'default'}
        eyebrow={target ? t(ROLE_LABELS[target.role][0], ROLE_LABELS[target.role][1]) : undefined}
        title={target ? displayName(target) ?? target.email ?? t('Compte', 'Account') : t('Compte', 'Account')}
        onClose={closeRoleSheet}
      >
        <div className="flex flex-col gap-3 pb-2">
          {target && nextRole ? (
            <>
              <p className="text-body text-fg-secondary">
                {nextRole === 'USER'
                  ? t(
                      'Ce compte redeviendra un compte citoyen et perdra immédiatement ses accès.',
                      'This account will become a citizen account again and lose its access immediately.'
                    )
                  : t(
                      `Ce compte passera au rôle ${t(ROLE_LABELS[nextRole][0], ROLE_LABELS[nextRole][1])}.`,
                      `This account will switch to the ${ROLE_LABELS[nextRole][1]} role.`
                    )}{' '}
                {t('Ses sessions ouvertes seront fermées.', 'Its open sessions will be closed.')}
              </p>
              {target.role === 'PARTNER' && target.partners.length ? (
                <Alert tone="warning">
                  {t(
                    `Les établissements rattachés seront détachés : ${target.partners.map((p) => p.name).join(', ')}.`,
                    `Linked businesses will be detached: ${target.partners.map((p) => p.name).join(', ')}.`
                  )}
                </Alert>
              ) : null}
              <Button variant={nextRole === 'USER' ? 'danger' : 'primary'} onClick={confirmRoleChange} loading={savingRole}>
                {nextRole === 'USER' ? t('Confirmer le retrait', 'Confirm revocation') : t('Confirmer le changement', 'Confirm change')}
              </Button>
              <Button variant="outline" onClick={() => setNextRole(null)} disabled={savingRole}>
                {t('Retour', 'Back')}
              </Button>
            </>
          ) : target ? (
            <>
              <p className="text-body text-fg-secondary">{target.email}</p>
              {roleOptions(target).map((value) => (
                <Button key={value} variant={value === 'USER' ? 'danger' : 'outline'} onClick={() => setNextRole(value)}>
                  {value === 'USER'
                    ? t('Retirer le rôle (compte citoyen)', 'Revoke role (citizen account)')
                    : t(
                        `Passer en ${ROLE_LABELS[value][0].toLowerCase()}`,
                        `Switch to ${ROLE_LABELS[value][1].toLowerCase()}`
                      )}
                </Button>
              ))}
              <Button variant="ghost" onClick={closeRoleSheet}>
                {t('Annuler', 'Cancel')}
              </Button>
            </>
          ) : null}
        </div>
      </Sheet>
    </div>
  );
}
