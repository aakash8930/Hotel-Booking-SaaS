import { Injectable } from '@nestjs/common';

type Metric = { count:number; errors:number; totalMs:number; lastMs:number; buckets:number[] };

@Injectable()
export class MetricsService {
 private readonly metrics = new Map<string, Metric>();
 private readonly latencyBuckets = [50,100,250,500,1000,2500,5000];

 record(path:string,status:number,durationMs:number){
  const m=this.metrics.get(path)??{count:0,errors:0,totalMs:0,lastMs:0,buckets:Array(this.latencyBuckets.length+1).fill(0)};
  m.count++; m.errors += status >= 500 ? 1 : 0; m.totalMs += durationMs; m.lastMs=durationMs;
  const i=this.latencyBuckets.findIndex(v=>durationMs<=v); m.buckets[i<0?this.latencyBuckets.length:i]++;
  this.metrics.set(path,m);
 }
 snapshot(){
  return Object.fromEntries([...this.metrics].map(([path,m])=>[path,{
   count:m.count,errors:m.errors,lastMs:m.lastMs,
   avgMs:m.count?Math.round(m.totalMs/m.count*100)/100:0,
   errorRate:m.count?Math.round(m.errors/m.count*10000)/10000:0,
   latencyBuckets:Object.fromEntries(m.buckets.map((v,i)=>[i<this.latencyBuckets.length?'<='+this.latencyBuckets[i]+'ms':'>5000ms',v]))
  }]));
 }
}