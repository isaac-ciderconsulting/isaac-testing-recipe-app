/* ===================================================================
   Our Cookbook — settings you can edit
   (You only ever need to touch THIS file. Everything else is automatic.)
   =================================================================== */

window.COOKBOOK_CONFIG = {

  // 1) Your Google Sign-In ID.
  //    Paste the "Client ID" from Google here, between the quotes.
  //    It looks like:  1234567890-abcdefg.apps.googleusercontent.com
  //    (Leave it empty "" and the app will show you setup instructions.)
  googleClientId: "181132348333-c1de211bv96i3uve7ocd9ug6k8q7n4na.apps.googleusercontent.com",

  // 2) Who is allowed in?
  //    - Leave the list empty  []  to let ANYONE with a Google account sign in.
  //    - OR list specific email addresses to allow ONLY those people, e.g.:
  //        allowedEmails: ["you@gmail.com", "wife@gmail.com", "friend@gmail.com"],
  allowedEmails: ["isaacab@gmail.com", "55olympialane@gmail.com", "isaac@cider.consulting"],

  // 3) When a friend opens a recipe you shared with them, must they log in too?
  //    false = shared links open for anyone (easiest for sharing)
  //    true  = shared links also require a Google sign-in
  shareRequiresLogin: false,

};
