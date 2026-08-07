import { getLastOtpForTesting } from '../../src/modules/auth/otpProvider.js';

/**
 * Reads back the OTP a login/signup just issued.
 *
 * The suite runs with OTP_PROVIDER=test (see package.json), so codes land in
 * otpProvider's in-memory store instead of stdout. Tests previously scraped
 * them by monkey-patching global console.log for the duration of a request —
 * which is a process-wide mutation shared by every concurrently-settling
 * promise, so an unrelated log line landing inside the capture window (or a
 * fire-and-forget notification logging after it closed) could make the regex
 * miss and fail the test. That was the source of the intermittent
 * "socket hang up" / "No OTP code found" failures under a full-suite run.
 *
 * Reading the store directly is deterministic and needs no global state.
 */
export function readOtpCode(identifier) {
  const entry = getLastOtpForTesting(identifier);
  if (!entry) {
    throw new Error(
      `No OTP recorded for "${identifier}". Is OTP_PROVIDER=test set for this run (package.json "test" script)?`,
    );
  }
  return entry.code;
}
