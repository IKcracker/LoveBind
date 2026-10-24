import { calculateMutualCompatibility, type Category, type CategoryRating } from '../compatibility/scoring';

// Seven independent prompts spanning the seven rubric dimensions.
// These are relationship reflection questions, not clinical assessments.
export const QUESTIONS: readonly { id:string; category:Category; prompt:string; low:string; high:string }[] = [
  { id:'intent',category:'RELATIONSHIP_INTENT',prompt:'How important is a committed long-term relationship to you?',low:'Prefer to keep things open',high:'Very important' },
  { id:'values',category:'VALUES',prompt:'How strongly do shared personal values matter to you?',low:'Comfortable with differences',high:'Extremely important' },
  { id:'lifestyle',category:'LIFESTYLE',prompt:'How much time would you ideally spend together each week?',low:'Mostly independent',high:'A lot of shared time' },
  { id:'communication',category:'COMMUNICATION',prompt:'How frequently do you prefer checking in with a partner?',low:'Occasionally',high:'Very frequently' },
  { id:'conflict',category:'CONFLICT_RESOLUTION',prompt:'When a disagreement arises, how quickly do you prefer to talk about it?',low:'After time to reflect',high:'As soon as possible' },
  { id:'future',category:'FUTURE_GOALS',prompt:'How much do you prioritize making shared long-term plans?',low:'Prefer spontaneity',high:'A high priority' },
  { id:'practical',category:'PRACTICAL',prompt:'How important is living close to each other?',low:'Distance is manageable',high:'Very important' },
];
export const QUIZ_VERSION='lovebind-reflection-v1';
export type Response = { questionId:string; value:number };
export function validAnswer(input:unknown):input is Response {
  if(!input || typeof input!=='object' || Array.isArray(input))return false;
  const o=input as Record<string,unknown>;
  return typeof o.questionId==='string' && QUESTIONS.some(q=>q.id===o.questionId) &&
    typeof o.value==='number' && Number.isInteger(o.value) && o.value>=1 && o.value<=5;
}
export function scoreAnswers(a:Response[],b:Response[]) {
  const aById=new Map(a.map(x=>[x.questionId,x.value]));
  const bById=new Map(b.map(x=>[x.questionId,x.value]));
  if(aById.size!==QUESTIONS.length || bById.size!==QUESTIONS.length)
    throw new Error('Every question must be answered independently');
  const ratings: CategoryRating[]=QUESTIONS.map(q=>{
    const av=aById.get(q.id),bv=bById.get(q.id);
    if(!av || !bv || !Number.isInteger(av) || !Number.isInteger(bv) ||
      av<1 || av>5 || bv<1 || bv>5)throw new Error('Invalid quiz response');
    const alignment=100-Math.abs(av-bv)*25;
    return {category:q.category,aToB:alignment,bToA:alignment};
  });
  return calculateMutualCompatibility(ratings);
}
