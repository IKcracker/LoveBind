import assert from 'node:assert/strict';
import test from 'node:test';
import { eligibleForAdminApproval, evaluateDiditAge, evaluateDiditAgeEvidence, summarizeDiditEvidence } from './activation';

const dob = new Date('1997-07-23T00:00:00Z');
function decision(dateOfBirth = '1997-07-23') {
  return { status:'Approved', decision:{
    id_verifications:[{ status:'Approved', date_of_birth:dateOfBirth }],
    liveness_checks:[{ status:'Approved' }],
    face_matches:[{ status:'Approved' }],
  } };
}

test('Didit approved with matching adult ID, liveness and face-match passes',()=>{
  assert.equal(evaluateDiditAge(decision(),dob,new Date('2026-10-24T00:00:00Z')),'VERIFIED');
});
test('refuse incomplete, underage, mismatching and malformed evidence',()=>{
  assert.equal(evaluateDiditAge({status:'Approved'},dob),'CHECKS_INCOMPLETE');
  assert.equal(evaluateDiditAge(decision('2012-07-23'),dob),'UNDERAGE');
  assert.equal(evaluateDiditAge(decision('1995-07-23'),dob),'DOB_MISMATCH');
  assert.equal(evaluateDiditAge(decision('2026-02-30'),dob),'MISSING');
  assert.equal(evaluateDiditAge({status:'Declined',decision:decision().decision},dob),'CHECKS_INCOMPLETE');
  const noFace=decision();noFace.decision.face_matches=[];
  assert.equal(evaluateDiditAge(noFace,dob),'CHECKS_INCOMPLETE');
});
test('activation requires age-evidence, ID, profile and moderated photo',()=>{
  const account={status:'PENDING',identityVerification:{
    status:'Approved',ageEvidenceStatus:'VERIFIED',ageVerifiedAt:new Date(),
  },profile:{birthDate:dob,city:'Pretoria',bio:'A complete introduction',
    relationshipGoal:'Long term',photoObjectKey:'profiles/test/photo',photoReviewStatus:'APPROVED'}};
  assert.equal(eligibleForAdminApproval(account),true);
  assert.equal(eligibleForAdminApproval({...account,profile:{...account.profile,photoReviewStatus:'PENDING'}}),false);
  assert.equal(eligibleForAdminApproval({...account,identityVerification:{...account.identityVerification,ageVerifiedAt:null}}),false);
  assert.equal(eligibleForAdminApproval({...account,identityVerification:{...account.identityVerification,ageEvidenceStatus:'DOB_MISMATCH'}}),false);
});

test('accepts Didit V3 root arrays and explicit true face match', () => {
  const payload = {status:'Approved',
    id_verifications:[{status:'Approved',date_of_birth:'1997-07-23'}],
    liveness_checks:[{status:'Approved'}], face_matches:[{match:true}]};
  assert.equal(evaluateDiditAge(payload,dob),'VERIFIED');
});
test('supports wrapped decision_v3 and singular positive verification checks', () => {
  const payload={status:'Approved',decision_v3:{
    id_verification:{status:'Approved',date_of_birth:'1997-07-23'},
    liveness:{status:'Approved'},face_match:{status:'Approved'}}};
  assert.equal(evaluateDiditAge(payload,dob),'VERIFIED');
});
test('fails closed on absent or negative verification evidence', () => {
  const valid={status:'Approved',
    id_verifications:[{status:'Approved',date_of_birth:'1997-07-23'}],
    liveness_checks:[{status:'Approved'}],face_matches:[{match:true}]};
  assert.deepEqual(evaluateDiditAgeEvidence({status:'Approved'},dob),{
    status:'CHECKS_INCOMPLETE',issue:'ID_CHECK_MISSING'});
  assert.equal(evaluateDiditAge({...valid,face_matches:[{match:false}]},dob),'CHECKS_INCOMPLETE');
  assert.equal(evaluateDiditAge({...valid,liveness_checks:[]},dob),'CHECKS_INCOMPLETE');
  assert.equal(evaluateDiditAge({...valid,id_verifications:[
    ...valid.id_verifications,{status:'Declined',date_of_birth:'1997-07-23'}]},dob),'CHECKS_INCOMPLETE');
  assert.equal(evaluateDiditAge({...valid,id_verifications:[{status:'Declined',
    date_of_birth:'1997-07-23'}]},dob),'CHECKS_INCOMPLETE');
  assert.equal(evaluateDiditAge({...valid,face_matches:[{match:true,status:'Declined'}]},dob),'CHECKS_INCOMPLETE');
});

test('prefer complete root evidence over incomplete wrapped summaries',()=>{
 const payload={status:'Approved',decision:{id_verifications:[{status:'Approved',date_of_birth:'1997-07-23'}]},
   id_verifications:[{status:'Approved',date_of_birth:'1997-07-23'}],
   liveness_checks:[{status:'Approved'}],face_matches:[{match:true}]};
 assert.equal(evaluateDiditAge(payload,dob),'VERIFIED');
 const summary=summarizeDiditEvidence(payload,'current-workflow');
 assert.equal(summary.selectedLocation,'root');
 assert.equal(summary.containers.find(x=>x.location==='root')?.livenessChecks,1);
 assert.equal(summary.workflowMatchesCurrent,null);
});
test('do not combine individual checks from different nested response containers',()=>{
 const payload={status:'Approved',decision:{id_verifications:[{status:'Approved',date_of_birth:'1997-07-23'}]},
    liveness_checks:[{status:'Approved'}],face_matches:[{match:true}]};
 assert.equal(evaluateDiditAge(payload,dob),'CHECKS_INCOMPLETE');
});
