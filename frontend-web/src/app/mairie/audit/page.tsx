'use client';

import React, { useMemo, useState } from 'react';
import AdminQueryError from '@/components/admin/AdminQueryError';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Badge, EmptyState, PageHeader } from '@/components/ui/Misc';
import { formatDateShort } from '@/lib/date';
import { downloadTextFile } from '@/lib/download';
import { shortenWallet } from '@/lib/formatters';
import { useGetAuditLogsQuery } from '@/store/api/adminApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { AuditLogEntry } from '@/types/admin.types';

const ACTION_LABELS: Record<string, [string, string, 'danger' | 'primary' | 'secondary' | 'neutral' | 'warning']> = {
  CIRCUIT_BREAKER_PAUSE: ['Pause du contrat', 'Contract paused', 'danger'],
  CIRCUIT_BREAKER_RESUME: ['Reprise du contrat', 'Contract resumed', 'primary'],
  TREASURY_WITHDRAWAL_MULTISIG: ['Retrait trésorerie', 'Treasury withdrawal', 'warning'],
  PARTNER_APPROVED: ['Partenaire activé', 'Partner approved', 'primary'],
  PARTNER_SUSPENDED: ['Partenaire suspendu', 'Partner suspended', 'danger'],
  EXPORT_REPORT_CSV: ['Export CSV', 'CSV export', 'neutral'],
  EXPORT_REPORT_PDF: ['Export PDF', 'PDF export', 'neutral'],
  IDENTITY_DOCUMENT_VIEWED: ["Consultation d'identité", 'Identity viewed', 'secondary'],
  IDENTITY_VERIFICATION_DECISION: ["Décision d'identité", 'Identity decision', 'warning'],
};

const summarize = (log: AuditLogEntry): string => {
  const m = log.metadata || {};
  const parts: string[] = [];
  if (typeof m.reason === 'string') parts.push(m.reason);
  if (typeof m.partnerName === 'string') parts.push(m.partnerName);
  if (m.amountEth !== undefined) parts.push(`${m.amountEth} ETH`);
  if (typeof m.note === 'string') parts.push(m.note);
  return parts.join(' · ');
};

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export default function AuditPage() {
  const { t } = useAppTheme();
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState('ALL');
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAuditLogsQuery({ limit });

  const logs = useMemo(() => {
    const all = data?.data?.logs ?? [];
    return filter === 'ALL' ? all : all.filter((l) => l.action === filter);
  }, [data, filter]);

  const exportCsv = () => {
    const rows = [
      ['timestamp', 'action', 'admin_wallet', 'details'].join(','),
      ...logs.map((l) =>
        [l.timestamp, l.action, l.adminWallet, JSON.stringify(l.metadata || {})].map((v) => csvCell(String(v))).join(',')
      ),
    ];
    downloadTextFile(`etherbay-audit-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'), 'text/csv');
  };

  return (
    <div>
      <PageHeader
        title={t("Journal d'audit", 'Audit log')}
        subtitle={t(
          'Traçabilité de toutes les actions effectuées par les administrateurs Mairie.',
          'Traceability of every action performed by City Hall administrators.'
        )}
        actions={
          <>
            <Button size="sm" variant="outline" fullWidth={false} onClick={() => refetch()} loading={isFetching}>
              {t('Actualiser', 'Refresh')}
            </Button>
            <Button size="sm" fullWidth={false} onClick={exportCsv} disabled={logs.length === 0}>
              {t('Exporter CSV', 'Export CSV')}
            </Button>
          </>
        }
      />

      <div className="card mb-4 grid gap-x-3 p-4 pb-1 sm:grid-cols-2 md:max-w-xl">
        <Select label={t('Type d’action', 'Action type')} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">{t('Toutes les actions', 'All actions')}</option>
          {Object.entries(ACTION_LABELS).map(([key, [fr, en]]) => (
            <option key={key} value={key}>
              {t(fr, en)}
            </option>
          ))}
        </Select>
        <Select label={t('Profondeur', 'Depth')} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          {[50, 100, 250, 500].map((n) => (
            <option key={n} value={n}>
              {t(`${n} dernières`, `Last ${n}`)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Loader skeletonRows={5} />
      ) : isError ? (
        <AdminQueryError error={error} fallback={t("Journal d'audit indisponible.", 'Audit log unavailable.')} />
      ) : logs.length === 0 ? (
        <EmptyState
          title={t('Aucune action enregistrée', 'No action recorded')}
          description={t(
            'Les pauses du contrat, retraits, validations de partenaires et exports apparaîtront ici.',
            'Contract pauses, withdrawals, partner validations and exports will appear here.'
          )}
        />
      ) : (
        <div className="card overflow-hidden p-2 md:p-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-small">
              <thead className="text-caption text-fg-muted">
                <tr>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">{t('Date', 'Date')}</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">{t('Action', 'Action')}</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">{t('Administrateur', 'Administrator')}</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">{t('Détails', 'Details')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = ACTION_LABELS[log.action];
                  return (
                    <tr
                      key={log.id}
                      className="align-top transition-colors hover:bg-surface-elevated [&>td:first-child]:rounded-l-[16px] [&>td:last-child]:rounded-r-[16px]"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-caption text-fg-secondary tabular">
                        {formatDateShort(log.timestamp)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={meta?.[2] || 'neutral'}>{meta ? t(meta[0], meta[1]) : log.action}</Badge>
                      </td>
                      <td className="px-3 py-3 font-mono text-caption">
                        {log.adminWallet === 'Système' ? log.adminWallet : shortenWallet(log.adminWallet, 4)}
                      </td>
                      <td className="px-3 py-3 text-caption text-fg-secondary">{summarize(log) || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
