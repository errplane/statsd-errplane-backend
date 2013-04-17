/*

Statsd backend for flushing stats to Errplane.

To enable this backend include 'statsd-errplane-backend' in the backends configuration array:

backends: ['statsd-errplane-backend']

The backend will read the configuration options from the Errplane hash in the statsd configuration file:
errplane: {
  apiKey: "your api key",
  applicationId: "your application key",
  environment: "your environment key, i.e. production, staging, or devlopment"
  includeHostSuffix: "true/false. this is useful if you're running statsd on each host and want to see aggregates across all hosts"
}
*/
var os = require('os');
var errplane, flushInterval, hostSuffix;
var errplaneStats = {};

var flush_stats = function errplane_flush_stats(timestamp, metrics) {
  errplaneStats.lastFlush = timestamp;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timer_data = metrics.timer_data;
  var pctThreshold = metrics.pctThreshold;
  var key, timerKey;

  for (key in counters) {
    var value = counters[key];
    if (value) {
      errplaneStats.counterReports += 1;
      errplane.report(key + hostSuffix, {value: value, timestamp: timestamp});
    }
  }

  for (key in gauges) {
    var value = gauges[key];
    errplaneStats.gaugesReports += 1;
    errplane.report(key + hostSuffix, {value: value, timestamp: timestamp});
  }

  for (key in timer_data) {
    timer_metrics = timer_data[key]
    for (timerKey in timer_metrics) {
      var value = timer_metrics[timerKey];
      errplaneStats.timingReports += 1;
      errplane.report(key + "." + timerKey + hostSuffix, {value: value, timestamp: timestamp});
    }
  }
};

var backend_status = function errplane_backend_status(writeCallback) {
  for (key in errplaneStats) {
    writeCallback(null, "errplane", key, errplaneStats[key]);
  }
};

exports.init = function errplane_init(startup_time, config, events) {
  errplaneConfig = config.errplane;
  errplane = require('errplane').configure({
    apiKey: errplaneConfig.apiKey,
    applicationId: errplaneConfig.applicationId,
    environment: errplaneConfig.environment || "production"
  });

  errplaneStats.lastFlush = startup_time;
  errplaneStats.counterReports = 0;
  errplaneStats.gaugesReports = 0;
  errplaneStats.timingReports = 0;

  if (errplaneConfig.includeHostSuffix) {
    if (config.hostname) {
      hostSuffix = "/" + config.hostname
    } else {
      hostSuffix = "/" + os.hostname();
    }
  }

  flushInterval = config.flushInterval;
  events.on('flush', flush_stats);
  events.on('status', backend_status);
  return true;
}
