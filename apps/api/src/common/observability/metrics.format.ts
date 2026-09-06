import { MetricsService } from './metrics.service';

export function metricsSnapshotToPrometheus(snapshot: ReturnType<MetricsService['snapshot']>) {
 const lines=[
  '# HELP api_http_requests_total Total HTTP requests by path.',
  '# TYPE api_http_requests_total counter',
  '# HELP api_http_errors_total Total HTTP 5xx responses by path.',
  '# TYPE api_http_errors_total counter',
  '# HELP api_http_request_duration_ms_avg Average HTTP request duration in milliseconds.',
  '# TYPE api_http_request_duration_ms_avg gauge',
 ];
 for(const [path,m] of Object.entries(snapshot)){
  const label=JSON.stringify(path).replace(/"/g,'\\\"');
  lines.push(`api_http_requests_total{path="${label.slice(1,-1)}"} ${m.count}`);
  lines.push(`api_http_errors_total{path="${label.slice(1,-1)}"} ${m.errors}`);
  lines.push(`api_http_request_duration_ms_avg{path="${label.slice(1,-1)}"} ${m.avgMs}`);
 }
 return lines.join('\\n')+'\\n';
}
