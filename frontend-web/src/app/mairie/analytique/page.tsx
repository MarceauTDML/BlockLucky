'use client';

import React, { useState } from 'react';
import { BarList, KpiTile } from '@/components/charts/Charts';
import Button from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, PageHeader } from '@/components/ui/Misc';
import { downloadTextFile, openPrintableReport } from '@/lib/download';
import { formatNumber } from '@/lib/formatters';
import { getErrorMessage } from '@/store/api/baseApi';
import { useExportReportMutation, useGetAnalyticsDashboardQuery } from '@/store/api/adminApi';
import { useAppTheme } from '@/theme/ThemeProvider';

const INTERNAL_SOURCES = new Set(['admin-dashboard']);

const AGE_ORDER = ['18-25', '26-35', '36-50', '50+'] as const;

export default function AnalyticsPage() {
  const { t, language } = useAppTheme();
  const { data, isLoading, isError } = useGetAnalyticsDashboardQuery();
  const [exportReport, { isLoading: exporting }] = useExportReportMutation();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const dash = data?.data;

  const ages = dash?.demographics.ageBreakdown;
  const ageTotal = ages ? AGE_ORDER.reduce((s, k) => s + (ages[k] || 0), 0) : 0;
  const share18to35 = ages && ageTotal ? Math.round(((ages['18-25'] + ages['26-35']) / ageTotal) * 100) : 0;
  const utm = (dash?.utmAcquisition ?? []).filter((r) => !INTERNAL_SOURCES.has(r.source));

  const handleExport = async (format: 'CSV' | 'PDF') => {
    setFeedback(null);
    try {
      const res = await exportReport({ format }).unwrap();
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === 'CSV' && res.data.content) {
        downloadTextFile(`etherbay-rapport-${stamp}.csv`, res.data.content, 'text/csv');
      } else {
        const k = res.data.summary ?? {
          totalPrizePoolEth: dash?.kpis.totalPrizePoolEth ?? 0,
          municipalityRevenueEth: dash?.kpis.municipalityRevenueShareEth ?? 0,
          ticketsSold: dash?.kpis.totalTicketsSold ?? 0,
          registeredCitizens: dash?.kpis.totalUsers ?? 0,
          activePartners: 0,
          claimedRewards: dash?.kpis.totalClaimedRewards ?? 0,
        };
        const opened = openPrintableReport(
          'Rapport de pilotage — Loterie BlockLucky',
          [
            ['Cagnotte totale (ETH fictifs)', k.totalPrizePoolEth.toFixed(4)],
            ['Part Mairie (ETH fictifs)', k.municipalityRevenueEth.toFixed(4)],
            ['Tickets vendus', String(k.ticketsSold)],
            ['Comptes inscrits', String(k.registeredCitizens)],
            ['Partenaires', String(k.activePartners)],
            ['Récompenses réclamées', String(k.claimedRewards)],
            ['Part des 18-35 ans (déclaratif)', `${share18to35} %`],
            ['Avancement objectif 10 000', `${dash?.kpis.completionRatePercent ?? 0} %`],
          ],
          `Export généré via l'API (${res.data.downloadUrl}). Document de travail — chiffres à rapprocher des factures et de la déduplication des participants.`
        );
        if (!opened) {
          setFeedback({
            tone: 'error',
            text: t('Autorisez les fenêtres pop-up pour générer le PDF.', 'Allow pop-ups to generate the PDF.'),
          });
          return;
        }
      }
      setFeedback({
        tone: 'success',
        text: t(`Rapport ${format} généré et tracé dans le journal d'audit.`, `${format} report generated and logged in the audit trail.`),
      });
    } catch (err) {
      setFeedback({ tone: 'error', text: getErrorMessage(err, t("Échec de l'export.", 'Export failed.')) });
    }
  };

  return (
    <div>
      <PageHeader
        title={t('Analytique & rapports', 'Analytics & reports')}
        subtitle={t(
          'Participation, profil des inscrits et canaux d’acquisition de la campagne.',
          'Participation, sign-up profile and campaign acquisition channels.'
        )}
        actions={
          <>
            <Button size="sm" fullWidth={false} variant="outline" onClick={() => handleExport('CSV')} loading={exporting}>
              {t('Exporter CSV', 'Export CSV')}
            </Button>
            <Button size="sm" fullWidth={false} onClick={() => handleExport('PDF')} loading={exporting}>
              {t('Exporter PDF', 'Export PDF')}
            </Button>
          </>
        }
      />

      {feedback ? (
        <Alert tone={feedback.tone} className="mb-4">
          {feedback.text}
        </Alert>
      ) : null}

      {isLoading ? (
        <Loader skeletonRows={4} />
      ) : isError || !dash ? (
        <Alert tone="error">{t('Données analytiques indisponibles.', 'Analytics data unavailable.')}</Alert>
      ) : (
        <div className="flex flex-col gap-5">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('Indicateurs', 'Indicators')}>
            <KpiTile
              label={t('Avancement objectif', 'Goal progress')}
              value={`${dash.kpis.completionRatePercent.toFixed(1)} %`}
              hint={t(`${formatNumber(dash.kpis.totalUsers, language)} / 10 000 inscrits`, `${formatNumber(dash.kpis.totalUsers, language)} / 10,000 sign-ups`)}
              tone="primary"
            />
            <KpiTile label={t('Tickets vendus', 'Tickets sold')} value={formatNumber(dash.kpis.totalTicketsSold, language)} />
            <KpiTile
              label={t('Part 18-35 ans', '18-35 share')}
              value={`${share18to35} %`}
              hint={t('Cible principale du brief', 'Main brief target')}
              tone="secondary"
            />
            <KpiTile
              label={t('Récompenses réclamées', 'Rewards claimed')}
              value={formatNumber(dash.kpis.totalClaimedRewards, language)}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card p-4 md:p-5" aria-labelledby="age-title">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="age-title" className="text-body font-bold">
                    {t('Répartition par âge', 'Age breakdown')}
                  </h2>
                  <p className="text-caption text-fg-muted">
                    {t('Tranche déclarée à la connexion', 'Age group declared at sign-in')}
                  </p>
                </div>
                {share18to35 >= 50 ? (
                  <Badge tone="primary">{t('Cible 18-35 validée', '18-35 target met')}</Badge>
                ) : (
                  <Badge tone="warning">{t('Cible 18-35 à renforcer', '18-35 target below 50%')}</Badge>
                )}
              </div>
              <BarList
                sort={false}
                unit=""
                caption={t('Répartition des inscrits par tranche d’âge', 'Sign-ups by age group')}
                data={AGE_ORDER.map((k) => ({ label: `${k} ${t('ans', 'yrs')}`, value: ages?.[k] ?? 0 }))}
              />
            </section>

            <section className="card p-4 md:p-5" aria-labelledby="utm-title">
              <div className="mb-4">
                <h2 id="utm-title" className="text-body font-bold">
                  {t('Acquisition par canal (UTM)', 'Acquisition by channel (UTM)')}
                </h2>
                <p className="text-caption text-fg-muted">
                  {t(
                    'Événements attribués par source. « direct » = sans paramètre UTM.',
                    'Events attributed by source. “direct” = no UTM parameter.'
                  )}
                </p>
              </div>
              <BarList
                caption={t('Événements par source d’acquisition', 'Events by acquisition source')}
                data={utm.map((r) => ({ label: r.source, value: r.conversions }))}
                emptyLabel={t('Aucune source enregistrée pour le moment.', 'No source recorded yet.')}
              />
            </section>
          </div>

          <p className="text-caption text-fg-muted">
            {t(
              'Limites de mesure : un compte correspond à un portefeuille ; une même personne peut en posséder plusieurs. Les visiteurs ayant refusé la mesure d’audience ne sont pas comptés.',
              'Measurement limits: one account equals one wallet; a person may own several. Visitors who opted out of audience measurement are not counted.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
