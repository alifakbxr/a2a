// Risk-based test guidance, not security certification. Pure, bounded, framework-neutral.
const patterns=[
 {domain:'authorization-and-tenant-isolation',priority:'critical',re:/(auth|permission|role|tenant|organisation|organization|store|membership|middleware|access)/i,cases:[
  'Authenticated user cannot read or mutate a resource belonging to another tenant or store',
  'Unassigned or disabled user cannot access protected mutation routes or background workers',
  'Nested resource identifiers are checked against the authorized parent ownership'
 ]},
 {domain:'financial-integrity',priority:'critical',re:/(checkout|refund|payment|invoice|discount|tax|ledger|settlement|price)/i,cases:[
  'Server derives final monetary totals from trusted catalog/pricing rules, never request-provided amounts',
  'Duplicate or retried payment/refund operations cannot cause duplicate money or inventory movement',
  'Rounding, currency precision, refunds, tax and discounts reconcile against an immutable transaction record'
 ]},
 {domain:'inventory-concurrency',priority:'high',re:/(stock|inventory|reservation|checkout|quantity)/i,cases:[
  'Two genuinely concurrent buyers competing for the last stock item cannot oversell',
  'Failure after stock reservation rolls back or compensates the complete transaction',
  'Inventory mutation rejects product/store ownership mismatches'
 ]},
 {domain:'offline-security-and-recovery',priority:'critical',re:/(offline|sync|queue|indexeddb|serviceworker|service-worker|background|pwa)/i,cases:[
  'Replay of offline operations must repeat the same authorization checks as online operations',
  'Durable local queue is partitioned by account and tenant/store and cleaned on sign-out',
  'Browser close and reopen preserves queued operations and reconnect applies them exactly once'
 ]}
];
export function proposeRiskTests({paths=[],criteria=[]}={}){
 const text=[...paths,...criteria].filter(v=>typeof v==='string').slice(0,120).join(' ').slice(0,12000);
 const matched=patterns.filter(p=>p.re.test(text));
 const top=matched.slice(0,4);
 return {
  status:top.length?'suggestions-only':'no-domain-signals-detected',
  findings:top.map(x=>({domain:x.domain,priority:x.priority,negative_test_scenarios:x.cases.map((requirement,i)=>({id:x.domain+'-'+(i+1),requirement,status:'not-run',evidence_required:true}))})),
  limitations:['Matching keywords cannot prove that a vulnerability exists','No domain match does not mean the application is secure','These suggestions are not executed and do not replace real security review'],
 };
}
