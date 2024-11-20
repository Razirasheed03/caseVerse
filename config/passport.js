
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
require("dotenv").config(); 

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists in database
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user); // User found, pass 
        } else {
          // Create new user if not found
          user = new User({
            username: profile.displayName,
            email: profile.emails[0].value, 
            googleId: profile.id,
          });
          await user.save();
          return done(null, user);
        }
      } catch (error) {
        return done(error, null); 
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id); 
});

// Deserialize User
passport.deserializeUser((id, done) => {
  User.findById(id) 
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

module.exports = passport;
