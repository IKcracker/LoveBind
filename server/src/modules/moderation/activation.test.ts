import assert from 'node:assert/strict';
import test from 'node:test';
import { eligibleForAdminApproval, evaluateDiditAge } from './activation';

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
