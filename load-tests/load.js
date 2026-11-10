import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:2053';
const PROFILE = __ENV.PROFILE || 'load';

const scenarios = {
  load: {
    executor: 'ramping-arrival-rate',
    startRate: 5,
    timeUnit: '1s',
    preAllocatedVUs: 20,
    maxVUs: 100,
    stages: [
      { target: 30, duration: '1m' },
      { target: 30, duration: '3m' },
      { target: 0, duration: '30s' },
    ],
  },
  stress: {
    executor: 'ramping-arrival-rate',
    startRate: 10,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 400,
    stages: [
      { target: 50, duration: '2m' },
      { target: 150, duration: '3m' },
      { target: 300, duration: '3m' },
      { target: 0, duration: '1m' },
    ],
  },
  spike: {
    executor: 'ramping-arrival-rate',
    startRate: 10,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 500,
    stages: [
      { target: 10, duration: '1m' },
      { target: 100, duration: '10s' },
      { target: 100, duration: '1m' },
      { target: 10, duration: '10s' },
      { target: 10, duration: '1m' },
    ],
  },
  soak: {
    executor: 'constant-arrival-rate',
    rate: 20,
    timeUnit: '1s',
    duration: '4h',
    preAllocatedVUs: 30,
    maxVUs: 100,
  },
};

export const options = {
  scenarios: { [PROFILE]: scenarios[PROFILE] },
  thresholds: {
    http_req_failed: ['rate<0.001'],
    'http_req_duration{name:lottery_status}': ['p(95)<300', 'p(99)<800'],
    'http_req_duration{name:catalog}': ['p(95)<300', 'p(99)<800'],
    'http_req_duration{name:leaderboard}': ['p(95)<500'],
  },
};

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/v1/lottery/status`, null, { tags: { name: 'lottery_status' } }],
    ['GET', `${BASE_URL}/api/v1/marketplace/catalog`, null, { tags: { name: 'catalog' } }],
    ['GET', `${BASE_URL}/api/v1/lottery/leaderboard`, null, { tags: { name: 'leaderboard' } }],
  ]);
  responses.forEach((res) => check(res, { 'statut 2xx': (r) => r.status >= 200 && r.status < 300 }));
}
