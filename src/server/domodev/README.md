# domo dev wrapper

When the user runs `domo dev` their app is mounted at the root. The domodev
folder is mounted at /domodev. So all requests in the domodev wrapper app must
be prepended with /domodev to avoid loading files from the Custom App.
