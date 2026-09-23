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

## transcript seeks

- go to /episodes/first-dive?test
- click the button "play from 18:05"
- expect the audio playing from about 18:05 (currentTime 1085 to 1095)
- expect `audio.docked` at the top of the screen
- expect a `.segment.now` under the playhead
- expect no console errors

## episode subscribe bar rejects a bad address

- go to /episodes/first-dive?test
- expect a landmark "subscribe" stuck to the bottom of the screen
- fill `#subscribe-email` with "not-an-email"
- click "send"
- expect text "needs a real email."
- expect the bar is still there
- expect no request to mail.sixtom.com
- expect no console errors

## episode subscribe bar hands focus back when closed

- go to /episodes/first-dive?test
- focus the button "play from 37:39" (the transcript's last)
- press Tab: expect focus in `#subscribe-email`
- press Tab twice: expect focus on the button "close"
- press Enter
- expect the landmark "subscribe" is gone
- expect focus on the button "play from 37:39"
- expect no console errors
