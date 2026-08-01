# journeys

Two screens and one form. Written for `/drive`.

**Do not submit a valid address.** The form posts to the live listmonk instance
behind a rate limiter, so a passing drive would add a real subscriber and eat
into the per-IP budget. The signup journey deliberately stops at validation.

## splash renders

- go to /?test
- expect element `#sea`
- expect element `.wordmark`
- expect text "pyre"
- expect text "divers"
- expect element `#splash::after` veil is present
- expect no console errors

## scroll to the fire

- go to /?test
- click the chevron `.down`
- expect element `#join`
- expect heading "come sit by the fire."
- expect element `#join-form`
- expect element `button.join`

## signup rejects a bad address

- go to /?test#join
- fill `#join-form input[type=email]` with "not-an-email"
- click "save me a seat."
- expect the form does not navigate
- expect no successful-signup confirmation text
- expect no console errors

## episode page renders

- go to /episodes/does-not-exist
- expect a 404 or a graceful not-found, not a crash
- expect no console errors
