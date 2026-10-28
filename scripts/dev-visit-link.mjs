#!/usr/bin/env node
// Prints a fresh visit token from a local whenue-api, creating a test clinic, venue and
// visit the first time. Used by scripts/android-dev.sh; run it on its own to get a token
// for any device: `node scripts/dev-visit-link.mjs`.
//
// Settings (all optional):
//   WHENUE_GRAPHQL_URL     default http://localhost:8080/graphql
//   WHENUE_ADMIN_EMAIL     default admin@whenue.local (the bootstrap admin from whenue-deploy)
//   WHENUE_ADMIN_PASSWORD  default admin-password

const url = process.env.WHENUE_GRAPHQL_URL ?? 'http://localhost:8080/graphql';
const email = process.env.WHENUE_ADMIN_EMAIL ?? 'admin@whenue.local';
const password = process.env.WHENUE_ADMIN_PASSWORD ?? 'admin-password';

const ORG_SLUG = 'dev-clinic';
const VISITOR = { name: 'Test visitor', email: 'visitor@whenue.local' };

let bearer;

async function gql(query, variables = {}) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    fail(`Cannot reach whenue-api at ${url}. Is the backend up (\`tilt up\` in whenue-deploy)?`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.errors?.length) {
    const message = body?.errors?.map((e) => e.message).join('; ') ?? `HTTP ${response.status}`;
    fail(`whenue-api answered: ${message}`);
  }
  return body.data;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const { login } = await gql(
  'mutation($email: String!, $password: String!) { login(email: $email, password: $password) { token } }',
  { email, password },
);
bearer = login.token;

// Admins can list up to 100 organizations per page; a dev database has a handful.
const { organizations } = await gql('{ organizations(size: 100) { id slug modules { module enabled } } }');
let org = organizations.find((o) => o.slug === ORG_SLUG);
if (!org) {
  ({ createOrganization: org } = await gql(
    `mutation($input: CreateOrganizationInput!) {
      createOrganization(input: $input) { id slug modules { module enabled } }
    }`,
    { input: { name: 'Dev clinic', slug: ORG_SLUG, modules: ['TESTIMONIALS'] } },
  ));
}
if (!org.modules.some((m) => m.module === 'TESTIMONIALS' && m.enabled)) {
  await gql(
    'mutation($id: ID!) { setOrganizationModule(organizationId: $id, module: TESTIMONIALS, enabled: true) { id } }',
    { id: org.id },
  );
}

const { venues } = await gql('query($org: ID!) { venues(organizationId: $org, size: 1) { id } }', { org: org.id });
let venue = venues[0];
if (!venue) {
  ({ createVenue: venue } = await gql(
    'mutation($input: CreateVenueInput!) { createVenue(input: $input) { id } }',
    {
      input: {
        organizationId: org.id,
        name: 'Dev clinic, main branch',
        address: '1 Test Street',
        contactEmail: 'clinic@whenue.local',
      },
    },
  ));
}

// A new visit each run, since a visit takes one testimonial.
const { createVisit: visit } = await gql(
  'mutation($input: CreateVisitInput!) { createVisit(input: $input) { id } }',
  { input: { venueId: venue.id, visitor: VISITOR, visitDate: new Date().toISOString() } },
);
const { issueVisitToken } = await gql('mutation($id: ID!) { issueVisitToken(visitId: $id) { token } }', {
  id: visit.id,
});

console.log(issueVisitToken.token);
