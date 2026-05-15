// Fix #14
export function calcIL(i: number, c: number): number {
  return Math.abs(2*(Math.sqrt(c/i)/(1+c/i))-1)*100;
}
