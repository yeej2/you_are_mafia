/** Disabled until a real provider and consent UI are integrated. No game state leaves this interface. */
export interface AdProvider {showBetweenMatches():Promise<void>}
let provider:AdProvider|null=null;
let lastShown=0;
export function configureAds(next:AdProvider|null){provider=next;}
export async function showMatchBreakAd(phase:string,consent:boolean){if(!provider||!consent||phase!=='ended'||Date.now()-lastShown<180000)return false;try{await provider.showBetweenMatches();lastShown=Date.now();return true;}catch{return false;}}
