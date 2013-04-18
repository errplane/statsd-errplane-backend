/*

Statsd backend for flushing stats to Errplane.

To enable this backend include 'statsd-errplane-backend' in the backends configuration array:

backends: ['statsd-errplane-backend']

The backend will read the configuration options from the Errplane hash in the statsd configuration file:
errplane: {
  apiKey: "your api key",
  applicationId: "your application id",
  environment: "your environment key, i.e. production, staging, or devlopment",
  includeHostSuffix: "true/false. this is useful if you're running statsd on each host and want to see aggregates across all hosts",
  statParser: {
    regex: /(.*)\.(.*)\.(.*)\.(.*)/,
    environmentMatch: 1,
    applicationMatch: 2,
    statNameMatch: 3,
    hostMatch: 4
  },
  applicationNameToId: {
    "some_app": "your app id here"
  }
}
*/
var os = require('os'),
    Errplane = require('errplane');
var hostSuffix, errplaneConfig, defaultConnectionKey, currentConnectionKey,
    defaultApplicationId, defaultEnvironment, environmentMatch, statNameMatch,
    hostMatch, applicationMatch;
var errplaneStats = {};
var parseStatNames = false;
var errplaneConfigs = {};

var group_stat_with_connection = function errplane_group_stat_with_connection(connectionMap, key, options, statSuffix) {
  var connectionKey = defaultConnectionKey;
  var fullKey = key + statSuffix + hostSuffix;
  if (parseStatNames) {
    matches = key.match(errplaneConfig.statParser.regex);
    if (matches) {
      var applicationId = defaultApplicationId;
      var environment = defaultEnvironment;
      var statName = key + statSuffix;
      var host = hostSuffix;
      if (environmentMatch) {
        environment = matches[environmentMatch] || "production";
      }
      if (applicationMatch) {
        var applicationName = matches[applicationMatch];
        applicationId = errplaneConfig.applicationNameToId[applicationName] || applicationId;
      }
      connectionKey = applicationId + environment;
      if (hostMatch && matches[hostMatch]) {
        host = "/" + matches[hostMatch];
      }
      if (statNameMatch && matches[statNameMatch]) {
        statName =  matches[statNameMatch] + statSuffix;
      }
      fullKey = statName + host;
      if (!errplaneConfigs.hasOwnProperty(connectionKey)) {
        errplaneConfigs[connectionKey] = {
          apiKey: errplaneConfig.apiKey,
          applicationId: applicationId,
          environment: environment,
          postTimeout: 30000
        };
      }
    }
  }
  if (!connectionMap.hasOwnProperty(connectionKey)) {
    connectionMap[connectionKey] = [];
  }
  connectionMap[connectionKey].push({key: fullKey, vals: options});
}

var report_stats = function errplane_report_stats(connectionMap) {

}

var flush_stats = function errplane_flush_stats(timestamp, metrics) {
  errplaneStats.lastFlush = timestamp;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timer_data = metrics.timer_data;
  var pctThreshold = metrics.pctThreshold;
  var key, timerKey;

  var connectionMap = {};
  for (key in counters) {
    var value = counters[key];
    if (value) {
      errplaneStats.counterReports += 1;
      group_stat_with_connection(connectionMap, key, {value: value, timestamp: timestamp}, "");
    }
  }

  for (key in gauges) {
    var value = gauges[key];
    errplaneStats.gaugesReports += 1;
    group_stat_with_connection(connectionMap, key, {value: value, timestamp: timestamp}, "");
  }

  for (key in timer_data) {
    timer_metrics = timer_data[key]
    for (timerKey in timer_metrics) {
      var value = timer_metrics[timerKey];
      errplaneStats.timingReports += 1;
      group_stat_with_connection(connectionMap, key, {value: value, timestamp: timestamp}, "." + timerKey);
    }
  }

  for (connectionKey in connectionMap) {
    if (connectionKey != currentConnectionKey) {
      currentConnectionKey = connectionKey;
      errplane = Errplane.configure(errplaneConfigs[connectionKey]);
    }
    connectionMap[connectionKey].forEach(function(stat) {errplane.report(stat.key, stat.vals)});
    errplane.flush();
  }
};

var backend_status = function errplane_backend_status(writeCallback) {
  for (key in errplaneStats) {
    writeCallback(null, "errplane", key, errplaneStats[key]);
  }
};

exports.init = function errplane_init(startup_time, config, events) {
  errplaneConfig = config.errplane;
  if (errplaneConfig.hasOwnProperty("statParser")) {
    parseStatNames = true;
    environmentMatch = errplaneConfig.statParser.environmentMatch;
    applicationMatch = errplaneConfig.statParser.applicationMatch;
    statNameMatch = errplaneConfig.statParser.statNameMatch;
    hostMatch = errplaneConfig.statParser.hostMatch;
  }

  defaultConnectionKey = errplaneConfig.applicationId + errplaneConfig.environment;
  currentConnectionKey = defaultConnectionKey;
  defaultApplicationId = errplaneConfig.applicationId;
  defaultEnvironment = errplaneConfig.environment || "production";
  errplaneConfigs[defaultConnectionKey] = {
    apiKey: errplaneConfig.apiKey,
    applicationId: defaultApplicationId,
    environment: defaultEnvironment,
    postTimeout: 30000
  };
  errplane = Errplane.configure(errplaneConfigs[defaultConnectionKey]);

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
