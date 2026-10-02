# Hatter delivery server

Node HTTP and trusted release assets, with the existing Crowsi STATE socket
binding. The site supplies exact snapshots, readiness, allowed command handlers
and initial navigation data. This package never opens semantic/control/package
stores or resolves fixed action context. It never imports Vue/Nuxt/Nitro.

The current host is owner-local; public deployment must terminate at an explicit
Crowsi placement boundary, never accept arbitrary forwarded hosts or remote
browser mutations. Loopback web-source conformance is not public TLS/auth proof.

All HTTP handlers receive a transport cancellation signal. A disconnected
response is not a physical cancellation acknowledgement. Product work must be
accepted by Hatter orchestration, using its exact identity and cancellation
contract; this package must not become a job queue or retry authority.
The server bounds request admission,
body bytes/time, response bytes, asset bytes, socket frames/connections, and
starts site resource disposal before awaiting active handlers during close.
Concurrent close calls join one lifecycle promise; cleanup failures are retained.
Site code must close the resources it owns and settle its pending calls, never
terminate unrelated HAT/model processes. Site code is trusted installed code, never
package-supplied executable UI. Sites cannot widen the fixed CSP.

The existing five-second handler deadline is not a product work lifetime. The
D1 migration of slow product commands to immediate exact acknowledgement remains
required; the disposal regression test alone does not establish that migration.
