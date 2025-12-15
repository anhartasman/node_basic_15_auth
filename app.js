const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");

const errorController = require("./controllers/error");
const User = require("./models/user");

/* ===============================
   Environment variables (REQUIRED)
   =============================== */
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret";

/* Fail fast if Mongo URI is missing */
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const app = express();

/* ===============================
   MongoDB session store
   =============================== */
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

/* ===============================
   View engine
   =============================== */
app.set("view engine", "ejs");
app.set("views", "views");

/* ===============================
   Routes
   =============================== */
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

/* ===============================
   Middleware
   =============================== */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

const csrfProtection = csrf();
app.use(csrfProtection);
app.use(flash());

/* Attach user to request */
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

/* Global locals */
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

/* ===============================
   Route handlers
   =============================== */
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get500);
app.use(errorController.get404);

/* ===============================
   Database connection + server
   =============================== */
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(3000, "0.0.0.0", () => {
      console.log("Server running on port 3000");
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });
