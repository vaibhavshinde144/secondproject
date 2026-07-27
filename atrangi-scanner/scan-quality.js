(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ScanQuality=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function classifyScanQuality(metrics){
  const sharpness=Math.max(0,Number(metrics&&metrics.sharpness)||0),brightness=clamp(Number(metrics&&metrics.brightness)||0,0,255),contrast=Math.max(0,Number(metrics&&metrics.contrast)||0);
  const clarity=Math.round(clamp(Math.sqrt(sharpness/520)*100,0,100));let sharpLabel='good';
  if(sharpness<70)sharpLabel='blurry';else if(sharpness<170)sharpLabel='soft';else if(sharpness>700)sharpLabel='excellent';
  const exposure=brightness<58?'dark':brightness>220?'bright':'good',lowContrast=contrast<31,needsSmartClear=sharpLabel==='blurry'||sharpLabel==='soft'||exposure!=='good'||lowContrast,retakeRecommended=sharpLabel==='blurry'&&clarity<32;
  let message='Document clarity looks good.';
  if(retakeRecommended)message='This image is strongly blurred. Smart Clear can improve edges, but retaking the photo is recommended for readable text.';
  else if(sharpLabel==='blurry')message='Blur detected. Smart Clear is recommended to strengthen text and edges.';
  else if(sharpLabel==='soft')message='The scan is slightly soft. Smart Clear can improve text definition.';
  else if(exposure==='dark')message='The scan is dark. Smart Clear will lift brightness and contrast.';
  else if(exposure==='bright')message='The scan is over-bright. Smart Clear will restore contrast where possible.';
  else if(lowContrast)message='Low contrast detected. Smart Clear is recommended.';
  return{sharpness,brightness,contrast,clarity,sharpLabel,exposure,lowContrast,needsSmartClear,retakeRecommended,message};
}
return{classifyScanQuality};
});
