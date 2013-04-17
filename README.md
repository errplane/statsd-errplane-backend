StatsD backend for Errplane
======

To get it up and running do
```bash
npm install statsd-errplane-backend
```

Then add to the Statsd configuration array the backends key:
```javascript
  backends: ['statsd-errplane-backend']
```

You'll need an [errplane](https://errplane.com) account. Add an errplane configuration block to your statsd config:
```javascript
/*
  apiKey can be found at https://errplane.com/settings/organization
  applicationId can be found at https://errplane.com/settings/applications
  environment usually either production, staging, or development
  includeHostSuffix when set to true will add /<host> to the metric names. Do this if you're 
    running statsd on each host and want to see stats on a per host basis in addition to all together
*/
errplane: {
  apiKey: "...",
  applicationId: "...",
  environment: "production",
  includeHostSuffix: false
}
```