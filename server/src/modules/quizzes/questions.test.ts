import assert from 'node:assert/strict';
import test from 'node:test';
import { QUESTIONS, QUIZ_VERSION, scoreAnswers, validAnswer } from './questions';
import { decryptQuizAnswer, encryptQuizAnswer } from './quiz-crypto';
test('seven unique questions cover all seven compatibility dimensions',()=>{
  assert.equal(QUIZ_VERSION,'lovebind-reflection-v1');
  assert.equal(QUESTIONS.length,7);
  assert.equal(new Set(QUESTIONS.map(q=>q.category)).size,7);
  assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,7);
});
test('validates question IDs and integer Likert scale',()=>{
  assert.equal(validAnswer({questionId:QUESTIONS[0].id,value:3}),true);
  for(const value of [0,6,2.5,'5',null,NaN])assert.equal(validAnswer({questionId:QUESTIONS[0].id,value}),false);
  assert.equal(validAnswer({questionId:'unknown',value:3}),false);
});
test('alignment is symmetric and flags mismatched preferences',()=>{
  const a=QUESTIONS.map(q=>({questionId:q.id,value:5}));
  const b=QUESTIONS.map(q=>({questionId:q.id,value:1}));
  assert.equal(scoreAnswers(a,a).score,100);
  assert.equal(scoreAnswers(a,b).score,0);
  assert.equal(scoreAnswers(b,a).score,0);
  assert.equal(scoreAnswers(a,b).recommendation,'EXPLORE_FURTHER');
  assert.throws(()=>scoreAnswers(a,b.slice(1)));
});
test('answer ciphertext is tamper-evident and uses a dedicated key',()=>{
  const previous=process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY;
  try {
    process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY='e'.repeat(64);
    const a=encryptQuizAnswer(4),b=encryptQuizAnswer(4);
    assert.notEqual(a,b);
    assert.ok(a.startsWith('qz1.'));
    assert.equal(decryptQuizAnswer(a),4);
    assert.equal(decryptQuizAnswer(b),4);
    const chunks=a.split('.');chunks[3]=Buffer.from('x').toString('base64url');
    assert.throws(()=>decryptQuizAnswer(chunks.join('.')));
    delete process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY;
    assert.throws(()=>encryptQuizAnswer(3));
  } finally {
    if(previous===undefined)delete process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY;
    else process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY=previous;
  }
});
