/** @jsxImportSource hono/jsx/dom */
import { render } from 'hono/jsx/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { SOURCE_URL } from '../src/build';
import { SourceStamp } from '../src/ui/SourceStamp';

const mounted: HTMLElement[] = [];

function show(sha: string): HTMLElement {
  const container = document.createElement('div');
  document.body.append(container);
  mounted.push(container);
  render(<SourceStamp sha={sha} />, container);
  return container;
}

function linkNamed(container: HTMLElement, label: string): HTMLAnchorElement | null {
  const links = [...container.querySelectorAll('a')];
  return (
    links.find(
      (link) =>
        link.getAttribute('aria-label') === label || (link.textContent ?? '').includes(label),
    ) ?? null
  );
}

afterEach(() => {
  for (const container of mounted.splice(0)) {
    container.remove();
  }
});

describe('saying where this came from', () => {
  it('links to the source on GitHub', () => {
    const source = linkNamed(show('a1b2c3d'), 'Source on GitHub');

    expect(source?.href).toBe(SOURCE_URL);
    expect(source?.rel).toContain('noreferrer');
  });

  it('names the commit the build came from', () => {
    expect(show('a1b2c3d').querySelector('[data-testid="build-sha"]')?.textContent).toBe('a1b2c3d');
  });

  it('leads to that commit, so the copy can be checked against it', () => {
    const sha = show('a1b2c3d').querySelector('[data-testid="build-sha"]');

    expect(sha?.getAttribute('href')).toBe(`${SOURCE_URL}/commit/a1b2c3d`);
  });

  it('says so plainly when there is no commit to point at', () => {
    const sha = show('dev').querySelector('[data-testid="build-sha"]');

    expect(sha?.textContent).toBe('dev');
    expect(sha?.getAttribute('href')).toBeNull();
  });
});
