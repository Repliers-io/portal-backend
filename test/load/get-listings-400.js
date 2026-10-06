import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-test',
  };

  let res = http.post(`${BASE_URL}/listings/search?sortBy=123`, JSON.stringify({}), { headers });
  check(res, { 'OK 400': (r) => r.status === 400 });
  // sleep(0.1);
  console.log(`Request: ${res.request.method} ${res.url} - Status: ${res.status}`);
}
