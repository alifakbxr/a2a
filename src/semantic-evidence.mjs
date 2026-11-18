// Semantic evidence evaluator. All supplied observations remain local and UNATTESTED.
// It never promotes a caller-asserted witness list to an independently verified pass.
const BUILTIN={
 'true-concurrency':['parallel_clients','shared_stock_record','atomic_commit','one_winner_asserted'],
 'offline-restart':['network_disconnected','durable_queue_written','browser_closed','browser_reopened','queue_recovered','sync_exactly_once'],
 'lost-response-retry':['first_commit_persisted','response_loss_simulated','same_operation_id_retried','no_duplicate_asserted'],
 'double-refund':['initial_refund_persisted','second_refund_rejected','stock_not_duplicated','money_not_duplicated'],
 'financial-reconciliation':['server_price','item_order_reconcile','payment_reconcile'],
 'tenant-entry-points':['cross_tenant_denials','no_mutations'],
 'refund-duplicate-lines':['duplicate_detected','bounded_refund_and_restock'],
 'refund-amount-only':['partial_refund','no_implicit_restock'],
 'transfer-race':['parallel_transitions','single_final_state'],
 'offline-account-switch':['different_accounts','no_cross_account_cache']
};
const valid=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{2,80}$/.test(x);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const positive=x=>Number.isSafeInteger(x)&&x>=0;
const eq=x=>x===true;
const uniq=arr=>[...new Set(arr)];
function intervalPair(a){
 if(!Array.isArray(a)||a.length!==2)return false;
 const [x,y]=a;
 return x&&y&&x.connection_id&&y.connection_id&&x.connection_id!==y.connection_id&&
  x.resource_id&&x.resource_id===y.resource_id&&
  [x.started_at_ms,x.completed_at_ms,y.started_at_ms,y.completed_at_ms].every(finite)&&
  x.started_at_ms<x.completed_at_ms&&y.started_at_ms<y.completed_at_ms&&
  Math.max(x.started_at_ms,y.started_at_ms)<Math.min(x.completed_at_ms,y.completed_at_ms);
}
export function inspectScenarioFacts(name,facts){
 const f=object(facts)?facts:{};
 const checks={
  'true-concurrency':{
    parallel_clients:intervalPair(f.requests),
    shared_stock_record:Array.isArray(f.requests)&&f.requests.length===2&&f.requests[0]?.resource_id===f.requests[1]?.resource_id&&!!f.requests[0]?.resource_id,
    atomic_commit:f.database_dialect!=='sqlite-in-memory'&&f.database_transactions_observed===true,
    one_winner_asserted:Array.isArray(f.requests)&&f.requests.filter(r=>r.outcome==='success').length===1&&f.orders_created===1&&positive(f.stock_after)&&f.stock_after===0
  },
  'offline-restart':{
    network_disconnected:eq(f.network_disconnected_before_checkout),
    durable_queue_written:positive(f.queued_before_restart)&&f.queued_before_restart>=1&&eq(f.queue_written_to_persistent_storage),
    browser_closed:typeof f.process_before==='string'&&f.process_before.length>0&&eq(f.browser_process_terminated),
    browser_reopened:!!f.process_after&&f.process_after!==f.process_before&&!!f.profile_before&&f.profile_before===f.profile_after,
    queue_recovered:positive(f.queued_after_restart)&&f.queued_after_restart>=1&&eq(f.recovered_same_operation_id),
    sync_exactly_once:f.orders_created===1&&f.ledger_movements===1&&f.queue_after_sync===0&&eq(f.backend_assertions_executed)
  },
  'lost-response-retry':{
    first_commit_persisted:eq(f.first_transaction_committed),
    response_loss_simulated:eq(f.response_dropped_after_commit),
    same_operation_id_retried:eq(f.same_operation_id)&&eq(f.same_payload_hash),
    no_duplicate_asserted:f.orders_created===1&&f.ledger_movements===1&&eq(f.different_payload_rejected)&&f.conflict_status===409
  },
  'double-refund':{
    initial_refund_persisted:eq(f.first_refund_committed),
    second_refund_rejected:eq(f.duplicate_refund_rejected),
    stock_not_duplicated:positive(f.total_restocked_qty)&&positive(f.original_sold_qty)&&f.total_restocked_qty<=f.original_sold_qty,
    money_not_duplicated:positive(f.refunded_minor)&&positive(f.original_paid_minor)&&f.refunded_minor<=f.original_paid_minor
  },
  'financial-reconciliation':{
    server_price:f.price_source==='server'&&eq(f.override_policy_checked),
    item_order_reconcile:[f.gross_minor,f.item_discount_minor,f.tax_minor,f.total_minor].every(positive)&&f.gross_minor-f.item_discount_minor+f.tax_minor===f.total_minor,
    payment_reconcile:positive(f.total_minor)&&positive(f.payment_sum_minor)&&f.total_minor===f.payment_sum_minor
  },
  'tenant-entry-points':{
    cross_tenant_denials:Array.isArray(f.denied_entry_points)&&['online','offline-sync','inventory','refund','order-read'].every(x=>f.denied_entry_points.includes(x)),
    no_mutations:eq(f.forbidden_requests_db_unchanged)&&eq(f.cross_org_relations_rejected)
  },
  'refund-duplicate-lines':{
    duplicate_detected:eq(f.same_item_id_appears_twice_in_single_request),
    bounded_refund_and_restock:eq(f.request_rejected_or_aggregated)&&positive(f.restock_qty)&&positive(f.qty_purchased)&&f.restock_qty<=f.qty_purchased
  },
  'refund-amount-only':{
    partial_refund:positive(f.refund_minor)&&positive(f.original_paid_minor)&&f.refund_minor>0&&f.refund_minor<f.original_paid_minor,
    no_implicit_restock:f.explicit_return_items===false&&f.restock_qty===0
  },
  'transfer-race':{
    parallel_transitions:intervalPair(f.requests),
    single_final_state:Array.isArray(f.requests)&&f.requests.filter(x=>x.outcome==='success').length===1&&f.stock_movements===1&&['received','cancelled'].includes(f.final_state)
  },
  'offline-account-switch':{
    different_accounts:typeof f.user_before==='string'&&typeof f.user_after==='string'&&f.user_before.length>0&&f.user_after.length>0&&f.user_before!==f.user_after,
    no_cross_account_cache:f.foreign_queue_visible===0&&f.personalized_cache_leaks===0&&eq(f.account_switch_completed)
  }
 };
 return checks[name]||{};
}
export function evaluateSemanticClaims(data){
 if(!object(data)||typeof data.revision!=='string'||!data.revision||data.revision.length>160)throw Error('Code revision required');
 if(!Array.isArray(data.claims)||!data.claims.length||data.claims.length>100)throw Error('Expected 1-100 claims');
 const ids=new Set(),out=[];
 for(const c of data.claims){
  if(!object(c)||!valid(c.id)||ids.has(c.id)||!Array.isArray(c.evidence)||c.evidence.length>30)throw Error('Invalid or duplicate claim');
  ids.add(c.id);
  const required=c.required_capabilities??BUILTIN[c.scenario];
  if(!Array.isArray(required)||required.length<1||required.length>20||required.some(x=>!valid(x)))throw Error('Required capabilities must be explicit');
  const validReports=c.evidence.filter(e=>object(e)&&e.revision===data.revision&&e.verdict==='passed'&&e.origin==='external-test-harness'&&typeof e.reference==='string'&&e.reference.length<200&&typeof e.checked_at==='string'&&!Number.isNaN(Date.parse(e.checked_at)));
  const proven=new Set(),sources=[];
  for(const e of validReports){
   // Only evaluator-computed structured facts can cover a capability; raw witnessed_capabilities is ignored.
   const checks=inspectScenarioFacts(c.scenario,e.observations);
   for(const capability of required)if(checks[capability]===true)proven.add(capability);
   sources.push(e.reference);
  }
  const missing=required.filter(x=>!proven.has(x));
  const status=missing.length?'insufficient-evidence':'evidence-present-unattested';
  out.push({id:c.id,scenario:c.scenario||'custom',status,trust:'unattested-local-report',witnessed:required.filter(x=>proven.has(x)),missing,external_evidence_references:uniq(sources).slice(0,20),limitations:['External runner identity and observations are caller-supplied, not cryptographically verified','Capability labels alone are ignored; independently executed artifacts must corroborate facts']});
 }
 return {schema:'a2a-semantic-evidence-v2',revision:data.revision,accepted:0,structurally_supported:out.filter(x=>x.status==='evidence-present-unattested').length,total:out.length,claims:out,report_status:out.every(x=>x.status==='evidence-present-unattested')?'evidence-present-unattested':'insufficient-evidence',release_verified:false,limitations:['Unattested JSON never receives an independently verified release verdict','Reviewer must inspect actual test execution provenance, runtime and database effects']};
}
