import http from 'k6/http';
import { check, sleep } from 'k6';

const REPLIERS_API_KEY = __ENV.REPLIERS_API_KEY;
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-test',
  };

  // let res = http.post(`${BASE_URL}/listings/search`, JSON.stringify({}), { headers });
  console.log("URL being hit:", `${BASE_URL}/api/listings/search`);
  let res = http.get(`${BASE_URL}/api/listings/search`, { headers });
  check(res, { 'OK 200': (r) => r.status === 200 });
  // sleep(0.5);
  console.log(`Request: ${res.request.method} ${res.url} - Status: ${res.status}`);
}
