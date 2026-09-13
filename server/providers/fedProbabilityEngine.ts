export interface FedProbabilityInput {futuresPrice:number;currentEffr:number;meetingDate:string;contractYear:number;contractMonth:number;stepBasisPoints?:number}
export interface FedProbabilityResult {decreaseProbability:number;unchangedProbability:number;increaseProbability:number;impliedPostMeetingRate:number}

export class FedProbabilityEngine {
  calculate(input:FedProbabilityInput):FedProbabilityResult {
    const meeting=new Date(`${input.meetingDate}T00:00:00Z`);const daysInMonth=new Date(Date.UTC(input.contractYear,input.contractMonth,0)).getUTCDate();const decisionDay=meeting.getUTCDate();const before=Math.max(0,decisionDay-1);const after=daysInMonth-before;if(after<=0)throw new Error('Meeting date does not fall inside the futures contract month');
    const monthlyImpliedRate=100-input.futuresPrice;const impliedPost=(monthlyImpliedRate*daysInMonth-input.currentEffr*before)/after;const step=(input.stepBasisPoints??25)/100;const move=(impliedPost-input.currentEffr)/step;
    let decrease=0,unchanged=0,increase=0;if(move<0){decrease=Math.min(1,-move);unchanged=1-decrease}else{increase=Math.min(1,move);unchanged=1-increase}
    const rounded=[decrease,unchanged,increase].map(x=>Math.round(x*1000)/10);rounded[1]=Math.round((100-rounded[0]-rounded[2])*10)/10;return {decreaseProbability:rounded[0],unchangedProbability:rounded[1],increaseProbability:rounded[2],impliedPostMeetingRate:Math.round(impliedPost*10000)/10000}
  }
}
