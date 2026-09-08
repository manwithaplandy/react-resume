import type {Page, Route} from '@playwright/test';

import {expect, test} from './fixtures';

const CONTACT_ENDPOINT = '**/api/contact';
const CORS_HEADERS = {
  'access-control-allow-origin': 'http://127.0.0.1:3100',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};
const UNCERTAIN_DELIVERY =
  'Delivery could not be confirmed. Your message may have been sent. The text is preserved below; you can retry or email me directly.';

interface Draft {
  name: string;
  email: string;
  message: string;
}

const RAW_DRAFT: Draft = {
  name: '  Test Visitor  ',
  // Browsers normalize leading/trailing whitespace in type=email values.
  email: 'visitor@example.test',
  message: '  A synthetic test message.  ',
};

async function fillDraft(page: Page, draft: Draft = RAW_DRAFT) {
  await page.goto('/#contact');
  await page.locator('#contact-name').fill(draft.name);
  await page.locator('#contact-email').fill(draft.email);
  await page.locator('#contact-message').fill(draft.message);
}

async function handlePreflight(route: Route): Promise<boolean> {
  if (route.request().method() !== 'OPTIONS') {
    return false;
  }
  await route.fulfill({status: 204, headers: CORS_HEADERS});
  return true;
}

function expectTrimmedPayload(route: Route) {
  expect(route.request().method()).toBe('POST');
  expect(route.request().postDataJSON()).toEqual({
    name: 'Test Visitor',
    email: 'visitor@example.test',
    message: 'A synthetic test message.',
  });
}

async function expectExactDraft(page: Page, draft: Draft = RAW_DRAFT) {
  await expect(page.locator('#contact-name')).toHaveValue(draft.name);
  await expect(page.locator('#contact-email')).toHaveValue(draft.email);
  await expect(page.locator('#contact-message')).toHaveValue(draft.message);
}

test('pending submission is read-only and sends one trimmed snapshot', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let requests = 0;

  await page.route(CONTACT_ENDPOINT, async route => {
    if (await handlePreflight(route)) return;
    requests += 1;
    expectTrimmedPayload(route);
    await gate;
    await route.fulfill({status: 200, headers: CORS_HEADERS, contentType: 'text/plain', body: 'accepted'});
  });

  await fillDraft(page);
  await page.locator('form').evaluate(form => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });

  try {
    for (const field of ['name', 'email', 'message']) {
      const input = page.locator(`#contact-${field}`);
      await expect(input).toHaveAttribute('readonly', '');
      await input.press('End');
      await input.press('x');
    }
    await expectExactDraft(page);
    await expect(page.getByRole('button', {name: 'Sending…', exact: true})).toBeDisabled();
    await expect(page.getByText('Sending your message. Fields are temporarily read-only.', {exact: true})).toBeVisible();
    await expect.poll(() => requests).toBe(1);
  } finally {
    release();
  }

  await expect(page.locator('#contact-message')).toHaveValue('');
  await expect(page.getByText(/Message sent — thank you/)).toBeVisible();
});

test('non-2xx response preserves the exact draft and restores editing', async ({page}) => {
  let requests = 0;
  await page.route(CONTACT_ENDPOINT, async route => {
    if (await handlePreflight(route)) return;
    requests += 1;
    expectTrimmedPayload(route);
    await route.fulfill({status: 502, headers: CORS_HEADERS, contentType: 'text/plain', body: 'unavailable'});
  });

  await fillDraft(page);
  await page.getByRole('button', {name: 'Send Message', exact: true}).click();

  await expect(page.getByText(/Something went wrong on my end/)).toBeVisible();
  await expect(page.locator('form').getByRole('link', {name: 'andrewrmalvani@gmail.com'})).toHaveAttribute(
    'href',
    'mailto:andrewrmalvani@gmail.com',
  );
  await expectExactDraft(page);
  await expect(page.locator('#contact-message')).toBeEditable();
  await expect(page.getByRole('button', {name: 'Send Message', exact: true})).toBeEnabled();
  expect(requests).toBe(1);
});

test('network failure preserves the exact draft and explains delivery uncertainty', async ({page}) => {
  let requests = 0;
  await page.route(CONTACT_ENDPOINT, async route => {
    if (await handlePreflight(route)) return;
    requests += 1;
    expectTrimmedPayload(route);
    await route.abort('failed');
  });

  await fillDraft(page);
  await page.getByRole('button', {name: 'Send Message', exact: true}).click();

  await expect(page.getByText(UNCERTAIN_DELIVERY, {exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'email me directly'})).toHaveAttribute(
    'href',
    'mailto:andrewrmalvani@gmail.com',
  );
  await expectExactDraft(page);
  await expect(page.locator('#contact-message')).toBeEditable();
  await expect(page.getByRole('button', {name: 'Send Message', exact: true})).toBeEnabled();
  expect(requests).toBe(1);
});

test('timeout preserves the draft and only a deliberate retry starts another request', async ({page}) => {
  test.setTimeout(30_000);
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let requests = 0;

  await page.route(CONTACT_ENDPOINT, async route => {
    if (await handlePreflight(route)) return;
    requests += 1;
    expectTrimmedPayload(route);
    if (requests === 1) {
      await gate;
      await route.abort('timedout').catch(() => undefined);
      return;
    }
    await route.fulfill({status: 200, headers: CORS_HEADERS, contentType: 'text/plain', body: 'accepted'});
  });

  await fillDraft(page);
  await page.getByRole('button', {name: 'Send Message', exact: true}).click();

  try {
    await expect(page.getByText(UNCERTAIN_DELIVERY, {exact: true})).toBeVisible({timeout: 18_000});
    await expectExactDraft(page);
    await expect(page.locator('#contact-message')).toBeEditable();
    await expect(page.getByRole('button', {name: 'Send Message', exact: true})).toBeEnabled();
    expect(requests).toBe(1);

    await page.waitForTimeout(250);
    expect(requests).toBe(1);
    await page.getByRole('button', {name: 'Send Message', exact: true}).click();
    await expect.poll(() => requests).toBe(2);
    await expect(page.getByText(/Message sent — thank you/)).toBeVisible();
    await expect(page.locator('#contact-message')).toHaveValue('');
  } finally {
    release();
  }
});

test('navigating away aborts pending local work without stale feedback', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let requests = 0;

  await page.route(CONTACT_ENDPOINT, async route => {
    if (await handlePreflight(route)) return;
    requests += 1;
    expectTrimmedPayload(route);
    await gate;
    await route.fulfill({status: 200, headers: CORS_HEADERS, contentType: 'text/plain', body: 'accepted'}).catch(
      () => undefined,
    );
  });

  await fillDraft(page);
  await page.getByRole('button', {name: 'Send Message', exact: true}).click();
  await expect.poll(() => requests).toBe(1);

  try {
    await page.goto('/graph');
    await expect(page).toHaveURL(/\/graph(?:#|$)/);
    await expect(page.getByText(/Message sent — thank you|Delivery could not be confirmed/)).toHaveCount(0);
  } finally {
    release();
  }
});
