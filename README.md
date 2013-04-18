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

You can also configure it to send stats to different Errplane applications and environments. This is helpful 
if you put the enviroment, hostname, or application in the name of the stat. For example:
```javascript
errplane: {
  apiKey: "...",
  applicationId: "...",
  environment: "production",
  statParser: {
    regex: /(.*)\.(.*)\.(.*)\.(.*)/,
    environmentMatch: 1,
    applicationMatch: 2,
    statNameMatch: 3,
    hostMatch: 4
  },
  applicationNameToId: {
    "aviator": "the errplane app key for aviator",
    "rails": "the errplane app key for the rails app"
  }
}
```
So if you sent a stat to statsd with the name ```production.aviator.logins.app1``` it would get parsed out as a stat named ```logins/app1``` that would get sent to the production environment for aviator.

If the regex doesn't match against the stat name, the applicationId and environment configuration options will be used as the default.