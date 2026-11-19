// Domain-specific verification requests, not a vulnerability scanner or test runner.
// The safest possible result is a list of NOT-RUN checks, never a passing verdict.
const CASES={
 'authorization-and-tenant-isolation':[
  ['auth-route-role','Role matrix rejects forbidden mutations and leaves the database unchanged'],
  ['auth-store-link','Store, supplier, category and variant IDs must belong to the authorized tenant and store'],
  ['auth-entry-points','Authorization is enforced independently for web, API, offline sync, replay and background handlers'],
  ['auth-cost-projection','Cashier and other non-finance roles cannot receive restricted cost-price data']
 ],
 'financial-integrity':[
  ['finance-server-prices','Sale prices, discount and tax policy derive from trusted server sources or audited authorized overrides'],
  ['finance-line-reconcile','Sum of item totals, discounts, taxes and rounding equals order totals in integer minor units'],
  ['finance-paid-reconcile','Completed/paid status requires reconciled payment totals, including split payments and tendered change'],
  ['finance-zero-payment','A paid order cannot be created with zero or underpaid settlement']
 ],
 'refund-and-inventory-invariants':[
  ['refund-duplicate-lines','Duplicate item IDs within a single refund request cannot increase refunded quantity or restock'],
  ['refund-amount-only','A partial monetary-only refund does not restock all units without an explicit return decision'],
  ['stock-negative','Stock cannot go negative and all inventory mutations reconcile to an append-only movement ledger'],
  ['transfer-race','Concurrent receive/cancel attempts yield one final transfer state and one stock adjustment']
 ],
 'concurrency-and-idempotency':[
  ['concurrent-last-stock','Two independent DB connections race for the last item with exactly one success'],
  ['idem-response-loss','Response loss after committed checkout and retry with same ID causes exactly one order and ledger effect'],
  ['idem-payload-conflict','Same operation ID with different normalized payload returns conflict without new side effects']
 ],
 'offline-security-and-recovery':[
  ['offline-authorize','Offline sync and replay enforce the same tenant and store checks as online checkout'],
  ['offline-process-restart','The persisted queue survives full browser process restart, then syncs exactly once'],
  ['offline-user-switch','Sign-out/account switch does not expose cached HTML or IndexedDB data from prior user'],
  ['offline-failed-retry','Failed and conflicted operations have bounded retry/reconciliation and visible terminal outcomes']
 ],
 'identity-and-production-safety':[
  ['auth-rate-limit','Login and registration are rate-limited under repeated invalid attempts'],
  ['auth-invitation','Membership invitations have valid acceptance, expiry, organization and store authorization'],
  ['error-sanitization','Public API errors do not include private exceptions, SQL traces or credentials'],
  ['production-demo','Production pages do not expose working seeded demo credentials or test-only hooks']
 ],
 'web-usability-and-operations':[
  ['ui-accessibility','Interactive flows support keyboard, visible focus, labels and contrast at target viewports'],
  ['ui-mobile','Critical flows avoid clipping/overflow on supported screen sizes'],
  ['production-health','Operational readiness includes error observability and resource/performance evidence']
 ]
};
const SCOPE=[
 ['authorization-and-tenant-isolation',/(?:\b(auth|role|permission|middleware|tenant|organisation|organization|membership|access|policy|guard)\b|routes\/(?:web|api)\.php|controllers?\/|\bstore[_ -]?id\b|\bsupplier[_ -]?id\b)/i],
 ['financial-integrity',/(?:checkout|poscontroller|poscheckout|payment|invoice|discount|tax|price|ledger|settlement|paid|billing)/i],
 ['refund-and-inventory-invariants',/(?:refund|stock|inventory|transfer|receiv|restock|adjustment)/i],
 ['concurrency-and-idempotency',/(?:checkout|poscontroller|poscheckout|refund|transfer|inventory|operation[_ -]?id|idempoten|concurren|stock)/i],
 ['offline-security-and-recovery',/(?:offline|service[-_]?worker|\bsw\.js\b|indexeddb|sync|queue|pwa|replay|cache)/i],
 ['identity-and-production-safety',/(?:\b(login|register|auth|invite|invitation|seeder|seeders|exception|errorhandler|authcontroller)\b|routes\/(?:web|api)\.php)/i],
 ['web-usability-and-operations',/(?:\.(?:vue|tsx|jsx|css|scss)\b|pages\/|components\/|accessib|performance|responsive)/i]
];
const safe=(a,max)=>Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.length<1000).slice(0,max):[];
export const RISK_DOMAINS=Object.freeze(Object.keys(CASES));
export function proposeRiskTests({paths=[],criteria=[],compact=false}={}){
 const sources=[...safe(paths,80),...safe(criteria,40)];
 const q=sources.join(' ').slice(0,12000);
 const riskDomains=SCOPE.filter(([,re])=>re.test(q)).map(([name])=>name);
 const all=riskDomains.flatMap(domain=>CASES[domain].map(([id,requirement],order)=>({
  domain,priority:domain==='web-usability-and-operations'?'medium':'critical',
  id,requirement,order
 })));
 // Rank by specific symptoms/criterion words instead of returning every
 // generic test template. Existing full output can still be requested by
 // turning Compact off; none of these suggestions are mandatory acceptance.
 const words=new Set(q.toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g)||[]);
 const ranked=all.map(x=>{
  const terms=(x.id+' '+x.requirement).toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g)||[];
  return {...x,match_score:terms.filter(t=>words.has(t)).length};
 }).sort((a,b)=>b.match_score-a.match_score||(a.priority==='critical'?-1:1)-(b.priority==='critical'?-1:1)||a.order-b.order);
 const selected=new Set((compact?ranked.slice(0,3):ranked).map(x=>x.id));
 const findings=riskDomains.map(domain=>{
  const scenarios=CASES[domain].filter(([id])=>selected.has(id)).map(([id,requirement])=>({
   id,requirement,status:'not-run',evidence_required:true,
   minimum_evidence:domain==='web-usability-and-operations'?'browser-or-accessibility-report':'named-machine-assertion-plus-domain-invariant'
  }));
  return {domain,priority:domain==='web-usability-and-operations'?'medium':'critical',
    negative_test_scenarios:scenarios,suggested_total:CASES[domain].length,
    suggestions_omitted:CASES[domain].length-scenarios.length};
 });
 const suggestedIds=findings.flatMap(x=>x.negative_test_scenarios.map(y=>y.id));
 return {status:findings.length?'suggestions-only':'no-domain-signals-detected',
  findings,
  // Historical required_test_ids was a misleading label: suggestions are not
  // acceptance requirements until explicitly adopted in a verification plan.
  required_test_ids:[],suggested_test_ids:suggestedIds,
  suggested_total:all.length,suggested_visible:suggestedIds.length,
  more_available:suggestedIds.length<all.length,
  coverage_assurance:'none',adopted_as_mandatory:false,
  limitations:['Static paths/criteria only suggest risks; they are not discovered vulnerabilities',
   'No suggested scenario was run or added to mandatory acceptance criteria',
   'No domain match does not prove the application secure or complete',
   'Use a user-reviewed a2a_verify plan and independent evidence for release claims']};
}
