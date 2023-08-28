import {
  RequirementFunction,
  StudentData,
  Program,
  SECutoffDictionary,
  CutoffScores
} from "../../../shared/types";

import { SuccessChance } from "../../../shared/enums";

const sePointCalc = (student: StudentData, program: Program): number | null => {


  // if any needed student data is null, return early with null
  if (student.hsatPercentileMath === null ||
    student.hsatPercentileRead === null ||
    student.subjGradeMath === null ||
    student.subjGradeRead === null ||
    student.subjGradeSci === null ||
    student.subjGradeSocStudies === null
  ) {
    return null;
  }


  // calculate points for HSAT scores
  const HSAT_SCORE_CONSTANT = 2.2727;
  const hsatMathPoints = Math.round(student.hsatPercentileMath * HSAT_SCORE_CONSTANT);
  const hsatReadPoints = Math.round(student.hsatPercentileRead * HSAT_SCORE_CONSTANT);

  // calculate points for subjGrades
  const gradePointsLookup = {
    "A": 112.5,
    "B": 75,
    "C": 38,
    "D": 0,
    "F": 0,
  }
  const subjGradeMathPoints = gradePointsLookup[student.subjGradeMath];
  const subjGradeReadPoints = gradePointsLookup[student.subjGradeRead];
  const subjGradeSciPoints = gradePointsLookup[student.subjGradeSci];
  const subjGradeSocStudiesPoints = gradePointsLookup[student.subjGradeSocStudies];
  //removed 2022
  // calculate score component for SE Test percentile 
  //const SE_TEST_PERCENTILE_CONSTANT = 3.03; 
  //const seTestPoints = Math.round(student.seTestPercentile * SE_TEST_PERCENTILE_CONSTANT);
  
  const sePoints = hsatMathPoints +
    hsatReadPoints +
    subjGradeMathPoints +
    subjGradeReadPoints + 
    subjGradeSciPoints +
    subjGradeSocStudiesPoints;
    //seTestPoints;

  return sePoints;
};

const createSELookup = (getCutoffDict: () => SECutoffDictionary) => (student: StudentData, program: Program): CutoffScores | null  => {
  // TODO: this ignores rank cutoff scores, assuming that if you make it
  // past your tier cutoff scores you're good. Make double sure that's a
  // good assumption.
  const cutoff = getCutoffDict()[program.id];
  if (cutoff === undefined) {
    console.error(`Failed to find cutoff scores for ${program.programName} with id ${program.id}`);
    return null;
  }
  console.log(`Found cutoff scores for ${program.programName} with id ${program.id}`)
  if (student.tier === null) {
    return null;
  }
  //console.log(student)
  //console.log(cutoff)
  //console.log(cutoff.tier1)
  switch(student.tier) {
    case '1':
      return cutoff.tier1; 
    case '2':
      return cutoff.tier2;
    case '3':
      return cutoff.tier3;
    case '4':
      return cutoff.tier4;
    default:
      return null;
  }
};

export const createSEPointSystem = (getCutoffDict: () => SECutoffDictionary): RequirementFunction => {

  const seLookup = createSELookup(getCutoffDict);
  
  return (student, program) => {
    // if student data is not initialized, return early with NOTIMPLEMENTED
    if (student.hsatPercentileMath === null ||
      student.hsatPercentileRead === null ||
      student.subjGradeMath === null ||
      student.subjGradeRead === null ||
      student.subjGradeSci === null ||
      student.subjGradeSocStudies === null ||
      student.tier === null
    ) {
      return SuccessChance.NOTIMPLEMENTED;
    }
    
    const points = sePointCalc(student, program);
    const prevScores= seLookup(student, program);
    if (prevScores === null) {
      console.error(`Failed to find cutoff scores for ${program.programName}`);
      return SuccessChance.NOTIMPLEMENTED;
    }

    if (points === null || isNaN(points)) {
      console.error("received NaN for sePointCalc");
      return SuccessChance.NOTIMPLEMENTED;
    }
    if (isNaN(prevScores.min) || isNaN(prevScores.avg) || isNaN(prevScores.max)) {
      console.error("received NaN for seCutoffLookup");
      return SuccessChance.NOTIMPLEMENTED;
    }

    if (points >= prevScores.max) {
      return SuccessChance.CERTAIN;
    } else if (points >= prevScores.avg) {
      return SuccessChance.LIKELY;
    } else if (points >= prevScores.min) {
      return SuccessChance.UNCERTAIN; 
    } else {
      return SuccessChance.NONE;
    }
  }
};

