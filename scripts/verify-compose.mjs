import assert from 'node:assert/strict';
const base='http://127.0.0.1:8789';
const get=route=>fetch(base+route,{signal:AbortSignal.timeout(10000)});
const hsts=/^max-age=\d+$/;
const health=await get('/api/v1/health');
assert.equal(health.status,200);assert.equal((await health.json()).status,'UP');
// API headers: Spring's single X-Frame-Options/nosniff (a duplicate from nginx would read "DENY, DENY").
assert.equal(health.headers.get('x-frame-options'),'DENY');assert.equal(health.headers.get('x-content-type-options'),'nosniff');
assert.match(health.headers.get('strict-transport-security')??'',hsts);
assert.equal(health.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
for(const route of ['/','/equipment','/reservations','/maintenance','/loans','/notifications']){
 const response=await get(route);assert.equal(response.status,200);
 const csp=response.headers.get('content-security-policy')??'';
 for(const directive of ["default-src 'self'","script-src 'self'","frame-ancestors 'none'","object-src 'none'"])assert.ok(csp.includes(directive),route+' CSP lacks '+directive);
 assert.equal(response.headers.get('x-frame-options'),'DENY');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
 assert.match(response.headers.get('strict-transport-security')??'',hsts);
 assert.equal(response.headers.get('permissions-policy'),'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 assert.equal(response.headers.get('cross-origin-opener-policy'),'same-origin');
 assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');
 assert.equal(response.headers.get('cache-control'),'no-cache');
 const html=await response.text();assert.match(html,/<div id="root"><\/div>/);
 const asset=html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
 const script=await get(asset);assert.equal(script.status,200);assert.equal(script.headers.get('x-content-type-options'),'nosniff');
 assert.equal(script.headers.get('cache-control'),'public, max-age=31536000, immutable');
 assert.equal(script.headers.get('permissions-policy'),'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 assert.equal(script.headers.get('cross-origin-opener-policy'),'same-origin');
 assert.equal(script.headers.get('cross-origin-resource-policy'),'same-origin');
}
const anonymous=await get('/api/v1/auth/me');
assert.equal(anonymous.status,401);
assert.ok((await anonymous.json()).type.endsWith('/problems/unauthenticated'));
const csrf=await get('/api/v1/auth/csrf');assert.equal(csrf.status,204);
assert.ok(csrf.headers.getSetCookie().some(c=>c.startsWith('XSRF-TOKEN=')&&/; Secure/i.test(c)));
console.log('Production Compose smoke passed: real database health, six React routes/assets, security and cache headers, API proxy, anonymous denial and Secure CSRF cookie');
