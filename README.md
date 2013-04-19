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
  replaceDots when set to true will replace . in the stat names with / to work with Errplane's fanout functionality.
*/
errplane: {
  apiKey: "...",
  applicationId: "...",
  environment: "production",
  includeHostSuffix: false,
  replaceDots: false
}
```

You can also configure it to send stats to different Errplane applications and environments. This is helpful 
if you put the enviroment, hostname, or application in the name of the stat. For example:
```javascript
errplane: {
  apiKey: "...",
  applicationId: "...",
  environment: "production",
  replaceDots: false,
  statParsers: [{
    regex: /(.*)\.(.*)\.(.*)\.(.*)/,
    environmentMatch: 1,
    applicationMatch: 2,
    statNameMatch: 3,
    hostMatch: 4,
    replaceDots: true
  }],
  applicationNameToId: {
    "api": "the errplane app key for api",
    "rails": "the errplane app key for the rails app"
  }
}
```
Stat parsers is an array so the first regex that matches against the stat name will be use. That means you should put the most specific parsers first. In the example above, if you sent a stat to statsd with the name ```production.api.logins.apphost1``` it would get parsed out as a stat named ```logins/apphost1``` that would get sent to the production environment for api.

If any of the match options are left out, the default will be used (at a minimum you should have statNameMatch specified). If you don't have a host match specified and includeHostSuffix is set to false, no host will be added on. If the no regex matches against the stat name, the applicationId and environment configuration options will be used as the default.

It's a good idea to test out your regex and matches. To do that just hop into a console and do something like this:
```javascript
s = "the stat name";
p =  /(.*)\.(.*)/ // or whatever the pattern is
matches = s.match(p);
// then use the indexes for environmentMatch, applicationMatch, statNameMatch, and hostMatch.
matches[applicationMatch]
```

If you have a stat name that has periods in it, but you want to capture that separate from the other parts, try a regex like this one:
```javascript
pattern = /(\w*)\.(\w*)\.(.*)\.(\w*)/
```
That will capture the first two items, the stat is the third, which would have dots in it, and then a fourth item with no dots.