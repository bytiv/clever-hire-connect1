/**
 * Application-wide configuration.
 * All external URLs and env-dependent values go here.
 */

export const ATS_API_URL = import.meta.env.VITE_ATS_API_URL;

if (!ATS_API_URL) {
  console.warn(
    'VITE_ATS_API_URL is not set. ATS scoring will not work. ' +
    'Add it to your .env file.'
  );
}
