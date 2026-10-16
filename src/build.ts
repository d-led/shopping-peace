/**
 * What this copy of the app is: the commit it was built from, and where the
 * source lives. The Pages workflow hands the commit in as `BUILD_SHA`; a local
 * build asks git; and a build without either is simply "dev".
 */
export const BUILD_SHA: string = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'dev';

export const SOURCE_URL = 'https://github.com/d-led/shopping-peace';
