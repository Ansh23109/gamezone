import React from "react";

export function StaticLanding() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">GameZone</h1>
      <p className="mt-4 text-muted-2">
        This deployment does not have a connected database. To enable the full app, set the
        <strong> DATABASE_URL</strong> environment variable in your hosting provider and redeploy.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">What you can do</h2>
        <ul className="list-disc list-inside mt-2 text-sm text-muted-2">
          <li>Add `DATABASE_URL` to your Vercel project under Settings → Environment Variables.</li>
          <li>Check deployment logs for runtime errors after redeploying.</li>
          <li>Run locally with a configured `DATABASE_URL` to reproduce and debug.</li>
        </ul>
      </section>
    </main>
  );
}

export default StaticLanding;
