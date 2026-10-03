"""Original synthesized 32-second noir underscore. No third-party samples."""
import math,wave,struct,random
random.seed(17)
SR=22050;D=32;n=SR*D;out=[0.0]*n
notes=[45,52,57,60,47,54,59,62,41,48,53,56,40,47,52,56]
for beat in range(64):
 midi=notes[(beat//4)%16] if beat%4==0 else notes[((beat//8)*4+beat%4)%16]+12
 f=440*2**((midi-69)/12);start=beat*.5;dur=2.8 if beat%4==0 else 1.25;amp=.13 if beat%4==0 else .065
 for j in range(int(dur*SR)):
  i=int(start*SR)+j;t=j/SR
  if i>=n:break
  env=min(1,t/.015)*math.exp(-t*2.4)
  v=(math.sin(2*math.pi*f*t)+.28*math.sin(2*math.pi*f*2*t)+.12*math.sin(2*math.pi*f*3.003*t))*env*amp
  out[i]+=v
  k=i+int(.23*SR)
  if k<n:out[k]+=v*.18
for i in range(n):
 t=i/SR;out[i]+=.025*math.sin(2*math.pi*55*t)*math.sin(math.pi*t/D)**2
 out[i]*=min(1,t/1.2,(D-t)/1.5)
with wave.open('public/audio/midnight-theme.wav','w')as w:
 w.setparams((1,2,SR,n,'NONE','not compressed'));w.writeframes(b''.join(struct.pack('<h',int(max(-.95,min(.95,v))*32767))for v in out))
for name,f in [('vote',440),('dawn',660),('night',165)]:
 with wave.open(f'public/audio/{name}.wav','w')as w:
  w.setparams((1,2,SR,SR//2,'NONE','not compressed'));w.writeframes(b''.join(struct.pack('<h',int(7000*math.sin(2*math.pi*f*i/SR)*math.exp(-8*i/SR)))for i in range(SR//2)))
