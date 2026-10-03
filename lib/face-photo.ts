export type FaceCrop={x:number;y:number;zoom:number};
export function photoCrop(width:number,height:number,crop?:FaceCrop){
 const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:min));
 const size=Math.min(width,height)/clamp(crop?.zoom??1,1,3);
 return {x:(width-size)*clamp(crop?.x??50,0,100)/100,y:(height-size)*clamp(crop?.y??50,0,100)/100,size};
}
export async function importFace(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPEG, PNG, or WebP photo.');
 if(file.size>8*1024*1024)throw Error('Choose a photo smaller than 8 MB.');
 const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');const scale=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);const c=canvas.getContext('2d');if(!c)throw Error('Photo processing is unavailable.');c.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.9);}finally{URL.revokeObjectURL(url);}
}
