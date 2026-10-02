// Deliberately minimal: a fetch handler is one of the installability
// criteria Chrome/Android look for before offering "Add to Home Screen",
// but this app is a live booking/payments dashboard — caching responses
// would risk showing stale availability or payment state, so this is a
// pure network passthrough, not an offline cache. No install-time caching,
// no fetch interception beyond handing the request straight to the network.
self.addEventListener("fetch", () => {});
