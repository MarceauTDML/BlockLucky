import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:2053';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const live = http.get(`${BASE_URL}/health/live`, { tags: { name: 'health_live' } });
  check(live, { 'liveness 200': (res) => res.status === 200 });

  const status = http.get(`${BASE_URL}/api/v1/lottery/status`, { tags: { name: 'lottery_status' } });
  check(status, { 'statut loterie 200': (res) => res.status === 200 });

  const catalog = http.get(`${BASE_URL}/api/v1/marketplace/catalog`, { tags: { name: 'catalog' } });
  check(catalog, { 'catalogue 200': (res) => res.status === 200 });

  sleep(1);
}
